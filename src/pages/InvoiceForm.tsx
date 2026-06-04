import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getCurrencySymbol, formatMoney } from '../lib/currencies';
import { useBusinessProfile } from '../hooks/useBusinessProfile';
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
  position: number;
}

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: bizProfile } = useBusinessProfile();
  const isEdit = !!id;

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
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, amount: 0, position: 0 }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
        }
        if (itemsRes.data && itemsRes.data.length > 0) {
          setItems(itemsRes.data.map((i: any) => ({
            id: i.id,
            description: i.description,
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
            amount: Number(i.amount),
            position: i.position,
          })));
        }
        setLoading(false);
      });
    } else {
      const num = `INV-${Date.now().toString().slice(-6)}`;
      setInvoiceNumber(num);
      const due = new Date();
      due.setDate(due.getDate() + 30);
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
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, amount: 0, position: prev.length }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const invoiceData = {
      user_id: user.id,
      client_id: clientId || null,
      invoice_number: invoiceNumber,
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
        position: i,
      }));
      await (supabase.from('invoice_items') as any).insert(itemsData);
    }

    setSaving(false);
    navigate('/invoices');
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

  const exportPDF = async () => {
    const doc = new jsPDF();
    const client = clients.find(c => c.id === clientId);
    const s = sym;

    let yPos = 20;

    // Business branding header
    if (bizProfile) {
      // Logo (left side) — embed actual image if available
      let textX = 20;
      if (bizProfile.logo_url) {
        const imgData = await loadImageData(bizProfile.logo_url);
        if (imgData) {
          const maxW = 35, maxH = 22;
          const ratio = Math.min(maxW / imgData.width, maxH / imgData.height);
          const w = imgData.width * ratio;
          const h = imgData.height * ratio;
          doc.addImage(imgData.dataUrl, 'PNG', 20, yPos - 6, w, h);
          textX = 20 + w + 6; // shift business name to the right of the logo
        }
      }

      doc.setFontSize(20);
      doc.setTextColor(99, 102, 241);
      doc.text(bizProfile.business_name, textX, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      if (bizProfile.address) { doc.text(bizProfile.address, textX, yPos); yPos += 5; }
      if (bizProfile.email) { doc.text(bizProfile.email, textX, yPos); yPos += 5; }
      if (bizProfile.phone) { doc.text(bizProfile.phone, textX, yPos); yPos += 5; }
    }
    yPos += 6;

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Invoice: ${invoiceNumber}`, 20, yPos);
    doc.text(`Date: ${issueDate}`, 20, yPos + 8);
    doc.text(`Currency: ${currency}`, 20, yPos + 16);
    if (dueDate) doc.text(`Due: ${dueDate}`, 20, yPos + 24);
    if (client) {
      doc.text(`Bill To: ${client.name}`, 120, yPos);
      if (client.company) doc.text(client.company, 120, yPos + 8);
      if (client.email) doc.text(client.email, 120, yPos + 16);
    }

    autoTable(doc, {
      startY: yPos + 34,
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: items.map(i => [i.description, i.quantity.toString(), `${s}${i.unit_price.toFixed(2)}`, `${s}${i.amount.toFixed(2)}`]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.text(`Subtotal: ${s}${subtotal.toFixed(2)}`, 140, finalY + 10);
    doc.text(`Tax (${taxRate}%): ${s}${taxAmount.toFixed(2)}`, 140, finalY + 18);
    if (discount > 0) doc.text(`Discount: -${s}${discount.toFixed(2)}`, 140, finalY + 26);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${s}${total.toFixed(2)}`, 140, finalY + (discount > 0 ? 36 : 28));

    if (notes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Notes: ${notes}`, 20, finalY + 46);
    }

    doc.save(`${invoiceNumber}.pdf`);
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
              <button className="btn btn-ghost"><Send size={18} /> Send</button>
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
          No business profile set up yet. <a href="/settings">Go to Settings</a> to add your business name and logo.
        </div>
      )}

      <form onSubmit={handleSave} className="invoice-form">
        <div className="card">
          <div className="form-grid-3">
            <div className="form-group">
              <label>Invoice Number</label>
              <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required />
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
          <h3>Line Items</h3>
          <table className="table">
            <thead>
              <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td><input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" required /></td>
                  <td><input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="any" className="input-sm" /></td>
                  <td><input type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="input-sm" /></td>
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
                <span>Tax Rate (%)</span>
                <input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} min="0" step="0.1" className="input-sm" />
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

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/invoices')} className="btn btn-ghost">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
