import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, Download, Send, Sparkles, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getCurrencySymbol, formatMoney } from '../lib/currencies';
import { useBusinessProfile } from '../hooks/useBusinessProfile';
import { useAiCredits } from '../hooks/useAiCredits';
import { callAi } from '../lib/ai';
import { buildPaymentOptions, primaryPaymentLink } from '../lib/payments';
import { logAudit } from '../lib/audit';
import CurrencySelect from '../components/CurrencySelect';
import type { Client } from '../types/database';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate: number;
  position: number;
}

const getDefaults = () => {
  try {
    return JSON.parse(localStorage.getItem('iq-defaults') || '{}');
  } catch {
    return {};
  }
};

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: bizProfile } = useBusinessProfile();
  const { balance: aiBalance, setBalance: setAiBalance } = useAiCredits();
  const isEdit = !!id;
  const [aiBusy, setAiBusy] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [status, setStatus] = useState('draft');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, amount: 0, tax_rate: 0, position: 0 }]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [numberEdited, setNumberEdited] = useState(false);

  const sym = getCurrencySymbol(currency);

  useEffect(() => {
    if (!user) return;
    supabase.from('clients').select('*').eq('user_id', user.id).order('name').then(({ data }: any) => {
      setClients(data || []);
    });

    if (isEdit) {
      Promise.all([
        supabase.from('invoices').select('*').eq('id', id).single(),
        supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position'),
      ]).then(([invRes, itemsRes]: any[]) => {
        if (invRes.data) {
          const inv = invRes.data;
          setClientId(inv.client_id || '');
          setInvoiceNumber(inv.invoice_number);
          setStatus(inv.status);
          setIssueDate(inv.issue_date);
          setDueDate(inv.due_date || '');
          setCurrency(inv.currency);
          setTaxRate(Number(inv.tax_rate));
          setDiscount(Number(inv.discount));
          setNotes(inv.notes || '');
          setPublicToken(inv.public_token || null);
        }
        if (itemsRes.data && itemsRes.data.length > 0) {
          setItems(itemsRes.data.map((i: any) => ({
            id: i.id,
            description: i.description,
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
            amount: Number(i.amount),
            tax_rate: Number(i.tax_rate) || 0,
            position: i.position,
          })));
        }
        setLoading(false);
      });
    } else {
      const defaults = getDefaults();
      const prefix = defaults.invoicePrefix || 'INV-';
      // Preview the next sequential number without consuming it; the real number
      // is allocated atomically at save time. Fall back to a timestamp if RPC fails.
      supabase.rpc('peek_invoice_number', { p_prefix: prefix }).then(({ data, error }: any) => {
        setInvoiceNumber(!error && data ? data : `${prefix}${Date.now().toString().slice(-6)}`);
      });
      if (defaults.notes) setNotes(defaults.notes);
      if (defaults.currency) setCurrency(defaults.currency);
      if (defaults.taxRate) setTaxRate(Number(defaults.taxRate));
      const due = new Date();
      due.setDate(due.getDate() + (Number(defaults.paymentTerms) || 30));
      setDueDate(due.toISOString().split('T')[0]);
      setLoading(false);
    }
  }, [user, id, isEdit]);

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      updated[index].amount = updated[index].quantity * updated[index].unit_price;
      return updated;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, amount: 0, tax_rate: 0, position: prev.length }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // AI Writer: describe the project, get line items + notes auto-filled. Costs 1 credit.
  const handleAiWrite = async () => {
    const description = window.prompt('Describe the work / project, and AI will draft the line items:');
    if (!description?.trim()) return;
    setAiBusy(true);
    try {
      const { result, balance } = await callAi<{ line_items: Array<{ description: string; quantity: number; unit_price: number }>; notes?: string }>(
        'invoice_writer',
        { description, currency },
      );
      const newItems: LineItem[] = (result.line_items || []).map((li, i) => ({
        description: li.description,
        quantity: Number(li.quantity) || 1,
        unit_price: Number(li.unit_price) || 0,
        amount: (Number(li.quantity) || 1) * (Number(li.unit_price) || 0),
        tax_rate: 0,
        position: i,
      }));
      if (newItems.length > 0) setItems(newItems);
      if (result.notes && !notes) setNotes(result.notes);
      setAiBalance(balance);
    } catch (err: any) {
      if (err.message === 'insufficient_credits') {
        alert('You are out of AI credits. Top up in Settings → AI Credits.');
      } else {
        alert(`AI failed: ${err.message}`);
      }
    } finally {
      setAiBusy(false);
    }
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  // Per-line-item tax; items with no explicit rate fall back to the invoice-level default.
  const taxAmount = items.reduce((s, i) => s + i.amount * ((i.tax_rate > 0 ? i.tax_rate : taxRate) / 100), 0);
  const total = subtotal + taxAmount - discount;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // For a new invoice, allocate a real gap-free sequential number unless the user
    // typed a custom one. Edits keep their existing number.
    let finalNumber = invoiceNumber;
    if (!isEdit && !numberEdited) {
      const prefix = getDefaults().invoicePrefix || 'INV-';
      const { data: alloc } = await supabase.rpc('allocate_invoice_number', { p_prefix: prefix });
      if (alloc) finalNumber = alloc;
    }

    const invoiceData = {
      user_id: user.id,
      client_id: clientId || null,
      invoice_number: finalNumber,
      status,
      issue_date: issueDate,
      due_date: dueDate || null,
      currency,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount,
      total,
      notes: notes || null,
      payment_link: primaryPaymentLink(bizProfile, total, currency),
    };

    let invoiceId = id;
    if (isEdit) {
      await (supabase.from('invoices') as any).update(invoiceData).eq('id', id);
      await (supabase.from('invoice_items') as any).delete().eq('invoice_id', id!);
    } else {
      const { data } = await (supabase.from('invoices') as any).insert(invoiceData).select('id').single();
      invoiceId = data?.id;
    }

    if (invoiceId) {
      const itemsData = items.map((item, i) => ({
        invoice_id: invoiceId!,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_rate: item.tax_rate || 0,
        position: i,
      }));
      await (supabase.from('invoice_items') as any).insert(itemsData);
    }

    await logAudit(user.id, isEdit ? 'invoice.updated' : 'invoice.created', 'invoice', invoiceId, { invoice_number: finalNumber, total });
    setSaving(false);
    navigate('/app/invoices');
  };

  // Load a (possibly remote) image into a PNG data URL via canvas.
  // Returns null if it fails (e.g. CORS-tainted canvas) so the PDF still generates.
  const loadImageData = (url: string): Promise<{ dataUrl: string; width: number; height: number } | null> =>
    new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

  // Build the branded invoice PDF and return the jsPDF doc.
  // Shared by exportPDF (download) and handleSend (email attachment).
  const buildPdf = async () => {
    const doc = new jsPDF();
    const client = clients.find(c => c.id === clientId);
    const s = sym;

    const pageW = doc.internal.pageSize.getWidth();   // 210
    const pageH = doc.internal.pageSize.getHeight();  // 297
    const margin = 15;
    const rightX = pageW - margin;                    // 195

    // Palette
    const indigo: [number, number, number] = [99, 102, 241];
    const dark: [number, number, number] = [30, 41, 59];
    const gray: [number, number, number] = [100, 116, 139];
    const line: [number, number, number] = [226, 232, 240];
    const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

    // ---------- HEADER: logo + business info (left) ----------
    let infoX = margin;
    let logoBottom = 18;
    if (bizProfile?.logo_url) {
      const imgData = await loadImageData(bizProfile.logo_url);
      if (imgData) {
        const maxW = 28, maxH = 28;
        const ratio = Math.min(maxW / imgData.width, maxH / imgData.height);
        const w = imgData.width * ratio;
        const h = imgData.height * ratio;
        doc.addImage(imgData.dataUrl, 'PNG', margin, 16, w, h);
        infoX = margin + w + 6;
        logoBottom = 16 + h;
      }
    }

    let by = 23;
    if (bizProfile) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      setText(indigo);
      doc.text(bizProfile.business_name, infoX, by);
      by += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setText(gray);
      const contact: string[] = [];
      if (bizProfile.address) contact.push(...doc.splitTextToSize(bizProfile.address, 85));
      if (bizProfile.email) contact.push(bizProfile.email);
      if (bizProfile.phone) contact.push(bizProfile.phone);
      contact.forEach(l => { doc.text(l, infoX, by); by += 4.6; });
    }

    // ---------- HEADER: INVOICE title + meta (right) ----------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    setText(dark);
    doc.text('INVOICE', rightX, 24, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setText(gray);
    let my = 33;
    doc.text(`#${invoiceNumber}`, rightX, my, { align: 'right' }); my += 5.5;
    doc.text(`Issued: ${issueDate}`, rightX, my, { align: 'right' }); my += 5;
    if (dueDate) { doc.text(`Due: ${dueDate}`, rightX, my, { align: 'right' }); my += 5; }
    setText(indigo);
    doc.setFont('helvetica', 'bold');
    doc.text(status.toUpperCase(), rightX, my, { align: 'right' }); my += 5;

    // Divider under header
    const headerBottom = Math.max(by, my, logoBottom) + 4;
    setDraw(line);
    doc.setLineWidth(0.4);
    doc.line(margin, headerBottom, rightX, headerBottom);

    // ---------- BILL TO ----------
    let cy = headerBottom + 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setText(gray);
    doc.text('BILL TO', margin, cy);
    cy += 6;
    if (client) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      setText(dark);
      doc.text(client.name, margin, cy); cy += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setText(gray);
      if (client.company) { doc.text(client.company, margin, cy); cy += 4.6; }
      if (client.email) { doc.text(client.email, margin, cy); cy += 4.6; }
      if (client.phone) { doc.text(client.phone, margin, cy); cy += 4.6; }
      if (client.address) { doc.splitTextToSize(client.address, 85).forEach((l: string) => { doc.text(l, margin, cy); cy += 4.6; }); }
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      setText(gray);
      doc.text('—', margin, cy); cy += 5;
    }

    // Currency note (right, aligned with BILL TO label)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(gray);
    doc.text(`Currency: ${currency}`, rightX, headerBottom + 9, { align: 'right' });

    // ---------- ITEMS TABLE ----------
    autoTable(doc, {
      startY: cy + 6,
      head: [['Description', 'Qty', 'Unit Price', 'Tax', 'Amount']],
      body: items.map(i => [
        i.description,
        String(i.quantity),
        `${s}${i.unit_price.toFixed(2)}`,
        `${i.tax_rate > 0 ? i.tax_rate : taxRate}%`,
        `${s}${i.amount.toFixed(2)}`,
      ]),
      theme: 'striped',
      styles: { fontSize: 9.5, cellPadding: 3, textColor: dark },
      headStyles: { fillColor: indigo, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'right', cellWidth: 32 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 32 },
      },
      margin: { left: margin, right: margin },
    });

    // ---------- TOTALS ----------
    let ty = ((doc as any).lastAutoTable?.finalY || cy + 30) + 10;
    const labelX = rightX - 70;
    const totalRow = (label: string, value: string) => {
      doc.text(label, labelX, ty);
      doc.text(value, rightX, ty, { align: 'right' });
      ty += 6;
    };
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setText(gray);
    totalRow('Subtotal', `${s}${subtotal.toFixed(2)}`);
    totalRow('Tax', `${s}${taxAmount.toFixed(2)}`);
    if (discount > 0) totalRow('Discount', `-${s}${discount.toFixed(2)}`);

    // Total highlighted band
    ty += 1;
    setFill(indigo);
    doc.rect(labelX - 5, ty - 5, (rightX - labelX) + 10, 11, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('Total', labelX, ty + 2);
    doc.text(`${s}${total.toFixed(2)}`, rightX, ty + 2, { align: 'right' });
    ty += 14;

    // ---------- NOTES ----------
    if (notes) {
      ty += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setText(gray);
      doc.text('NOTES', margin, ty); ty += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      setText(dark);
      doc.splitTextToSize(notes, 120).forEach((l: string) => { doc.text(l, margin, ty); ty += 4.6; });
    }

    // ---------- FOOTER ----------
    setDraw(line);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 20, rightX, pageH - 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(gray);
    doc.text('Thank you for your business!', pageW / 2, pageH - 13, { align: 'center' });

    return doc;
  };

  const exportPDF = async () => {
    const doc = await buildPdf();
    doc.save(`${invoiceNumber}.pdf`);
  };

  const handleSend = async () => {
    if (!id) return;
    const client = clients.find(c => c.id === clientId);
    if (!client?.email) {
      alert('This invoice has no client with an email address. Add a client email first.');
      return;
    }
    setSending(true);
    try {
      const doc = await buildPdf();
      // jsPDF datauristring → strip the "data:...;base64," prefix for Resend.
      const pdfBase64 = doc.output('datauristring').split('base64,')[1];

      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: { invoice_id: id, pdf_base64: pdfBase64 },
      });
      if (error) throw error;

      if (data?.status) setStatus(data.status);
      if (user) await logAudit(user.id, 'invoice.sent', 'invoice', id, { to: client.email });
      alert(`Invoice sent to ${client.email}.`);
    } catch (err: any) {
      alert(`Failed to send invoice: ${err?.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h1>
        <div className="flex gap-2">
          {isEdit && (
            <>
              <button onClick={exportPDF} className="btn btn-ghost"><Download size={18} /> PDF</button>
              {publicToken && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/pay/${publicToken}`;
                    navigator.clipboard.writeText(url);
                    alert('Client link copied:\n' + url);
                  }}
                  className="btn btn-ghost"
                ><Link2 size={18} /> Copy Link</button>
              )}
              <button onClick={handleSend} disabled={sending} className="btn btn-ghost">
                <Send size={18} /> {sending ? 'Sending...' : 'Send'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Business Branding Header */}
      {bizProfile ? (
        <div className="card">
          <div className="invoice-brand-header">
            {bizProfile.logo_url && <img src={bizProfile.logo_url} alt="Logo" className="invoice-brand-logo" />}
            <div className="invoice-brand-info">
              <h2>{bizProfile.business_name}</h2>
              {bizProfile.address && <p>{bizProfile.address}</p>}
              {bizProfile.email && <p>{bizProfile.email}</p>}
              {bizProfile.phone && <p>{bizProfile.phone}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="setup-hint">
          No business profile set up yet. <Link to="/app/settings">Go to Settings</Link> to add your business name and logo.
        </div>
      )}

      <form onSubmit={handleSave} className="invoice-form">
        <div className="card">
          <div className="form-grid-3">
            <div className="form-group">
              <label>Invoice Number</label>
              <input type="text" value={invoiceNumber} onChange={e => { setInvoiceNumber(e.target.value); setNumberEdited(true); }} required />
            </div>
            <div className="form-group">
              <label>Client</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="form-group">
              <label>Issue Date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <CurrencySelect value={currency} onChange={setCurrency} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <h3>Line Items</h3>
            <button type="button" onClick={handleAiWrite} disabled={aiBusy} className="btn btn-sm btn-ghost" title="Draft line items with AI (1 credit)">
              <Sparkles size={16} /> {aiBusy ? 'Writing...' : 'AI Writer'}
              {aiBalance !== null && <span className="text-sm text-secondary">&nbsp;({aiBalance} credits)</span>}
            </button>
          </div>
          <table className="table">
            <thead>
              <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax %</th><th>Amount</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td><input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" required /></td>
                  <td><input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="any" className="input-sm" /></td>
                  <td><input type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="input-sm" /></td>
                  <td><input type="number" value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', parseFloat(e.target.value) || 0)} min="0" step="0.1" className="input-sm" title="Leave 0 to use the invoice default tax rate" /></td>
                  <td className="font-medium">{formatMoney(item.amount, currency)}</td>
                  <td><button type="button" onClick={() => removeItem(i)} className="btn-icon danger"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addItem} className="btn btn-ghost mt-2"><Plus size={18} /> Add Item</button>
        </div>

        <div className="card">
          <div className="form-grid-2">
            <div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Additional notes..." />
              </div>
            </div>
            <div className="totals-section">
              <div className="total-row"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
              <div className="total-row">
                <span>Default Tax Rate (%)</span>
                <input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} min="0" step="0.1" className="input-sm" title="Used for line items with no per-item tax rate" />
              </div>
              <div className="total-row"><span>Tax Amount</span><span>{formatMoney(taxAmount, currency)}</span></div>
              <div className="total-row">
                <span>Discount</span>
                <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="input-sm" />
              </div>
              <div className="total-row total-final"><span>Total</span><span>{formatMoney(total, currency)}</span></div>
            </div>
          </div>
        </div>

        {(() => {
          const opts = buildPaymentOptions(bizProfile, total, currency);
          if (opts.length === 0 && !bizProfile?.payment_instructions) return null;
          return (
            <div className="card">
              <h3>Payment Options</h3>
              <p className="text-sm text-secondary">These are shown to your client on the invoice email and portal.</p>
              {opts.map(o => (
                <div key={o.label} className="total-row">
                  <span>{o.label}</span>
                  <a href={o.url} target="_blank" rel="noreferrer">{o.url}</a>
                </div>
              ))}
              {bizProfile?.payment_instructions && (
                <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{bizProfile.payment_instructions}</p>
              )}
            </div>
          );
        })()}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/app/invoices')} className="btn btn-ghost">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
