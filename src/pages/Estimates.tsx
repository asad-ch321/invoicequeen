import { useEffect, useState } from 'react';
import { Plus, Trash2, FileCheck, Link2, ArrowRightCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatMoney } from '../lib/currencies';
import CurrencySelect from '../components/CurrencySelect';
import type { Estimate, Client, EstimateLineItem } from '../types/database';

const blankItem = (): EstimateLineItem => ({ description: '', quantity: 1, unit_price: 0 });

export default function Estimates() {
  const { user } = useAuth();
  const { toast, confirm } = useToast();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Estimate | null>(null);

  const [form, setForm] = useState({
    client_id: '', currency: 'USD', valid_until: '', tax_rate: 0, discount: 0, notes: '',
    items: [blankItem()],
  });

  const load = async () => {
    if (!user) return;
    const [eRes, cRes] = await Promise.all([
      supabase.from('estimates').select('*, client:clients(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
    ]);
    setEstimates((eRes.data as any) || []);
    setClients((cRes.data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const computeTotal = (items: EstimateLineItem[], taxRate: number, discount: number) => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    return subtotal + subtotal * (taxRate / 100) - discount;
  };

  const openNew = () => {
    setEditing(null);
    setForm({ client_id: '', currency: 'USD', valid_until: '', tax_rate: 0, discount: 0, notes: '', items: [blankItem()] });
  };

  const openEdit = (est: Estimate) => {
    setEditing(est);
    setForm({
      client_id: est.client_id || '', currency: est.currency, valid_until: est.valid_until || '',
      tax_rate: Number(est.tax_rate), discount: Number(est.discount), notes: est.notes || '',
      items: est.line_items.length ? est.line_items : [blankItem()],
    });
  };

  const save = async () => {
    if (!user) return;
    const total = computeTotal(form.items, form.tax_rate, form.discount);
    const payload: any = {
      user_id: user.id,
      client_id: form.client_id || null,
      currency: form.currency,
      valid_until: form.valid_until || null,
      line_items: form.items,
      tax_rate: form.tax_rate,
      discount: form.discount,
      total,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };
    if (editing) {
      await (supabase.from('estimates') as any).update(payload).eq('id', editing.id);
    } else {
      const { data: num } = await supabase.rpc('allocate_invoice_number', { p_prefix: 'EST-' });
      payload.estimate_number = num || `EST-${Date.now().toString().slice(-6)}`;
      payload.status = 'draft';
      await (supabase.from('estimates') as any).insert(payload);
    }
    setEditing(null);
    openNew();
    load();
  };

  const remove = async (id: string) => {
    if (!(await confirm('Delete this estimate?'))) return;
    await supabase.from('estimates').delete().eq('id', id);
    load();
  };

  const setStatus = async (est: Estimate, status: Estimate['status']) => {
    await (supabase.from('estimates') as any).update({ status, updated_at: new Date().toISOString() }).eq('id', est.id);
    load();
  };

  // One-click convert: create a real invoice + items from the estimate, then mark converted.
  const convert = async (est: Estimate) => {
    if (!user || est.converted_invoice_id) return;
    const prefix = (() => { try { return JSON.parse(localStorage.getItem('iq-defaults') || '{}').invoicePrefix || 'INV-'; } catch { return 'INV-'; } })();
    const { data: num } = await supabase.rpc('allocate_invoice_number', { p_prefix: prefix });
    const subtotal = est.line_items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
    const taxAmount = subtotal * (Number(est.tax_rate) / 100);
    const { data: inv } = await (supabase.from('invoices') as any).insert({
      user_id: user.id,
      client_id: est.client_id,
      invoice_number: num || `${prefix}${Date.now().toString().slice(-6)}`,
      status: 'unpaid',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      currency: est.currency,
      subtotal, tax_rate: est.tax_rate, tax_amount: taxAmount, discount: est.discount, total: est.total,
      notes: est.notes,
    }).select('id').single();
    if (inv?.id) {
      await (supabase.from('invoice_items') as any).insert(
        est.line_items.map((it, i) => ({
          invoice_id: inv.id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          amount: Number(it.quantity) * Number(it.unit_price),
          tax_rate: 0,
          position: i,
        })),
      );
      await (supabase.from('estimates') as any).update({ status: 'converted', converted_invoice_id: inv.id }).eq('id', est.id);
      toast('Estimate converted to invoice ' + (num || ''), 'success');
      load();
    }
  };

  const updateItem = (idx: number, field: keyof EstimateLineItem, value: string | number) => {
    setForm(f => {
      const items = [...f.items];
      (items[idx] as any)[field] = value;
      return { ...f, items };
    });
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const liveTotal = computeTotal(form.items, form.tax_rate, form.discount);

  return (
    <div className="page">
      <div className="page-header"><h1>Estimates & Quotes</h1></div>

      <div className="two-col-grid">
        <div className="card">
          <h3>{editing ? `Edit ${editing.estimate_number}` : 'New Estimate'}</h3>
          <div className="form-group">
            <label>Client</label>
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Currency</label>
              <CurrencySelect value={form.currency} onChange={v => setForm({ ...form, currency: v })} />
            </div>
            <div className="form-group">
              <label>Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
            </div>
          </div>

          <label>Line Items</label>
          {form.items.map((it, i) => (
            <div key={i} className="flex gap-2" style={{ marginBottom: 8 }}>
              <input type="text" placeholder="Description" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} />
              <input type="number" placeholder="Qty" value={it.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="input-sm" />
              <input type="number" placeholder="Price" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="input-sm" />
              <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, x) => x !== i) }))} className="btn-icon danger"><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={() => setForm(f => ({ ...f, items: [...f.items, blankItem()] }))} className="btn btn-sm btn-ghost"><Plus size={16} /> Add Item</button>

          <div className="form-grid-2" style={{ marginTop: 12 }}>
            <div className="form-group"><label>Tax %</label><input type="number" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} /></div>
            <div className="form-group"><label>Discount</label><input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div className="total-row total-final"><span>Total</span><span>{formatMoney(liveTotal, form.currency)}</span></div>
          <div className="form-actions">
            {editing && <button onClick={openNew} className="btn btn-ghost">Cancel</button>}
            <button onClick={save} className="btn btn-primary">{editing ? 'Update' : 'Create'} Estimate</button>
          </div>
        </div>

        <div className="card">
          <h3>Your Estimates</h3>
          {estimates.length === 0 ? <p className="empty-text">No estimates yet.</p> : (
            <table className="table">
              <thead><tr><th>#</th><th>Client</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {estimates.map(est => (
                  <tr key={est.id}>
                    <td className="font-medium" style={{ cursor: 'pointer' }} onClick={() => openEdit(est)}>{est.estimate_number}</td>
                    <td>{est.client?.name || '—'}</td>
                    <td>{formatMoney(Number(est.total), est.currency)}</td>
                    <td>
                      <span className={`badge ${est.status === 'accepted' || est.status === 'converted' ? 'badge-paid' : est.status === 'declined' ? 'badge-overdue' : 'badge-unpaid'}`}>{est.status}</span>
                      {est.signed_at && (
                        <span title={`Signed by ${est.signature_name}`} style={{ marginLeft: 4, verticalAlign: 'middle', display: 'inline-flex' }}>
                          <FileCheck size={14} />
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/estimate/${est.public_token}`); toast('Estimate link copied', 'success'); }} className="btn-icon" title="Copy client link"><Link2 size={16} /></button>
                        {est.status !== 'converted' && <button onClick={() => convert(est)} className="btn-icon" title="Convert to invoice"><ArrowRightCircle size={16} /></button>}
                        {est.status === 'draft' && <button onClick={() => setStatus(est, 'sent')} className="btn-icon" title="Mark sent">→</button>}
                        <button onClick={() => remove(est.id)} className="btn-icon danger" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
