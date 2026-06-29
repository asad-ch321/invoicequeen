import { useEffect, useState } from 'react';
import { Plus, Trash2, RotateCcw, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatMoney } from '../lib/currencies';
import CurrencySelect from '../components/CurrencySelect';
import type { CreditNote, Client, Invoice } from '../types/database';

export default function CreditNotes() {
  const { user } = useAuth();
  const { confirm } = useToast();
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    client_id: '', invoice_id: '', amount: 0, currency: 'USD', reason: '',
  });

  const load = async () => {
    if (!user) return;
    const [cnRes, clRes, invRes] = await Promise.all([
      supabase.from('credit_notes').select('*, client:clients(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
      supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setNotes((cnRes.data as any) || []);
    setClients((clRes.data as any) || []);
    setInvoices((invRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openModal = () => {
    setForm({ client_id: '', invoice_id: '', amount: 0, currency: 'USD', reason: '' });
    setShowModal(true);
  };

  // When an invoice is picked, prefill client + currency + amount from it.
  const onPickInvoice = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    setForm(f => ({
      ...f,
      invoice_id: invoiceId,
      client_id: inv?.client_id || f.client_id,
      currency: inv?.currency || f.currency,
      amount: inv ? Number(inv.total) : f.amount,
    }));
  };

  const save = async () => {
    if (!user) return;
    const { data: num } = await supabase.rpc('allocate_invoice_number', { p_prefix: 'CN-' });
    const payload = {
      user_id: user.id,
      invoice_id: form.invoice_id || null,
      client_id: form.client_id || null,
      credit_number: num || `CN-${Date.now().toString().slice(-6)}`,
      currency: form.currency,
      amount: form.amount,
      reason: form.reason || null,
      status: 'issued',
    };
    await (supabase.from('credit_notes') as any).insert(payload);
    setShowModal(false);
    load();
  };

  const setStatus = async (id: string, status: CreditNote['status']) => {
    await (supabase.from('credit_notes') as any).update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    if (!(await confirm('Delete this credit note?'))) return;
    await supabase.from('credit_notes').delete().eq('id', id);
    load();
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Credit Notes & Refunds</h1>
        <button onClick={openModal} className="btn btn-primary"><Plus size={18} /> New Credit Note</button>
      </div>

      {notes.length === 0 ? (
        <div className="card empty-state">
          <p>No credit notes yet. Issue one to record a refund or adjustment against an invoice.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Credit #</th><th>Client</th><th>Amount</th><th>Reason</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {notes.map(cn => (
                <tr key={cn.id}>
                  <td className="font-medium">{cn.credit_number}</td>
                  <td>{cn.client?.name || '—'}</td>
                  <td>{formatMoney(Number(cn.amount), cn.currency)}</td>
                  <td>{cn.reason || '—'}</td>
                  <td>
                    <span className={`badge ${cn.status === 'refunded' ? 'badge-paid' : cn.status === 'void' ? 'badge-overdue' : 'badge-unpaid'}`}>
                      {cn.status}
                    </span>
                  </td>
                  <td>{cn.issue_date}</td>
                  <td>
                    <div className="flex gap-2">
                      {cn.status === 'issued' && (
                        <>
                          <button onClick={() => setStatus(cn.id, 'refunded')} className="btn-icon" title="Mark refunded"><RotateCcw size={16} /></button>
                          <button onClick={() => setStatus(cn.id, 'void')} className="btn-icon" title="Void"><Ban size={16} /></button>
                        </>
                      )}
                      <button onClick={() => remove(cn.id)} className="btn-icon danger" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-pad" onClick={e => e.stopPropagation()}>
            <h3>New Credit Note</h3>
            <div className="form-group">
              <label>Linked Invoice (optional)</label>
              <select value={form.invoice_id} onChange={e => onPickInvoice(e.target.value)}>
                <option value="">None</option>
                {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number} — {formatMoney(Number(inv.total), inv.currency)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Client</label>
              <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Amount</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <CurrencySelect value={form.currency} onChange={v => setForm({ ...form, currency: v })} />
              </div>
            </div>
            <div className="form-group">
              <label>Reason</label>
              <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="Reason for credit / refund..." />
            </div>
            <div className="form-actions">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={save} className="btn btn-primary" disabled={form.amount <= 0}>Create Credit Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
