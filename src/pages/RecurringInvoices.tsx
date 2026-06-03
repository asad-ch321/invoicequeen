import { useEffect, useState } from 'react';
import { Plus, Play, Pause, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Client, RecurringInvoice } from '../types/database';

export default function RecurringInvoices() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<(RecurringInvoice & { client?: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    template_name: '', client_id: '', frequency: 'monthly' as RecurringInvoice['frequency'],
    next_run_date: new Date().toISOString().split('T')[0], currency: 'USD',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }],
    tax_rate: 0, discount: 0, notes: '',
  });

  const fetchData = async () => {
    if (!user) return;
    const [tRes, cRes] = await Promise.all([
      supabase.from('recurring_invoices').select('*, client:clients(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
    ]);
    setTemplates((tRes.data || []) as any);
    setClients(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await supabase.from('recurring_invoices').insert({
      user_id: user.id,
      template_name: form.template_name,
      client_id: form.client_id || null,
      frequency: form.frequency,
      next_run_date: form.next_run_date,
      currency: form.currency,
      line_items: form.line_items,
      tax_rate: form.tax_rate,
      discount: form.discount,
      notes: form.notes || null,
      active: true,
    });
    setShowModal(false);
    setForm({ template_name: '', client_id: '', frequency: 'monthly', next_run_date: new Date().toISOString().split('T')[0], currency: 'USD', line_items: [{ description: '', quantity: 1, unit_price: 0 }], tax_rate: 0, discount: 0, notes: '' });
    fetchData();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('recurring_invoices').update({ active: !active }).eq('id', id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recurring template?')) return;
    await supabase.from('recurring_invoices').delete().eq('id', id);
    fetchData();
  };

  const addLineItem = () => {
    setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', quantity: 1, unit_price: 0 }] }));
  };

  const updateLineItem = (i: number, field: string, value: string | number) => {
    setForm(f => {
      const items = [...f.line_items];
      (items[i] as any)[field] = value;
      return { ...f, line_items: items };
    });
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Recurring Invoices</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={18} /> New Template</button>
      </div>

      <div className="card">
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>No recurring templates</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">Create your first template</button>
          </div>
        ) : (
          <table className="table">
            <thead><tr><th>Template</th><th>Client</th><th>Frequency</th><th>Next Run</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id}>
                  <td className="font-medium">{t.template_name}</td>
                  <td>{(t.client as any)?.name || '—'}</td>
                  <td className="capitalize">{t.frequency}</td>
                  <td>{new Date(t.next_run_date).toLocaleDateString()}</td>
                  <td><span className={`badge ${t.active ? 'badge-paid' : 'badge-draft'}`}>{t.active ? 'Active' : 'Paused'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => toggleActive(t.id, t.active)} className="btn-icon" title={t.active ? 'Pause' : 'Resume'}>
                        {t.active ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="btn-icon danger"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Recurring Template</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Template Name *</label>
                  <input type="text" value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Client</label>
                  <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as any })}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Next Run Date</label>
                  <input type="date" value={form.next_run_date} onChange={e => setForm({ ...form, next_run_date: e.target.value })} />
                </div>
              </div>

              <h4 className="mt-4 mb-2">Line Items</h4>
              {form.line_items.map((item, i) => (
                <div key={i} className="form-grid-3 mb-2">
                  <input type="text" placeholder="Description" value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} required />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)} min="0" />
                  <input type="number" placeholder="Price" value={item.unit_price} onChange={e => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" />
                </div>
              ))}
              <button type="button" onClick={addLineItem} className="btn btn-ghost btn-sm"><Plus size={16} /> Add Item</button>

              <div className="form-grid-2 mt-4">
                <div className="form-group">
                  <label>Tax Rate (%)</label>
                  <input type="number" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div className="form-group">
                  <label>Discount</label>
                  <input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
