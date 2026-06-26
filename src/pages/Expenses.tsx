import { useEffect, useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../lib/currencies';
import CurrencySelect from '../components/CurrencySelect';
import { downloadCsv } from '../lib/exporters';
import type { Expense } from '../types/database';

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: '', vendor: '', amount: 0, currency: 'USD', notes: '',
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('expense_date', { ascending: false });
    setExpenses((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || form.amount <= 0) return;
    await (supabase.from('expenses') as any).insert({ ...form, user_id: user.id, category: form.category || null, vendor: form.vendor || null, notes: form.notes || null });
    setForm({ expense_date: new Date().toISOString().split('T')[0], category: '', vendor: '', amount: 0, currency: 'USD', notes: '' });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    load();
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const exportCsv = () => {
    downloadCsv('expenses.csv',
      ['Date', 'Category', 'Vendor', 'Amount', 'Currency', 'Notes'],
      expenses.map(e => [e.expense_date, e.category || '', e.vendor || '', Number(e.amount).toFixed(2), e.currency, e.notes || '']),
    );
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Expenses</h1>
        {expenses.length > 0 && <button onClick={exportCsv} className="btn btn-ghost"><Download size={18} /> Export CSV</button>}
      </div>

      <div className="card">
        <h3>Add Expense</h3>
        <div className="form-grid-3">
          <div className="form-group"><label>Date</label><input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></div>
          <div className="form-group"><label>Category</label><input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Software" /></div>
          <div className="form-group"><label>Vendor</label><input type="text" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Adobe" /></div>
          <div className="form-group"><label>Amount</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} min="0" step="0.01" /></div>
          <div className="form-group"><label>Currency</label><CurrencySelect value={form.currency} onChange={v => setForm({ ...form, currency: v })} /></div>
          <div className="form-group"><label>Notes</label><input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="form-actions">
          <button onClick={add} className="btn btn-primary" disabled={form.amount <= 0}><Plus size={18} /> Add Expense</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header-row">
          <h3>All Expenses</h3>
          <span className="font-medium">Total: {formatMoney(total, 'USD')}</span>
        </div>
        {expenses.length === 0 ? <p className="empty-text">No expenses logged yet.</p> : (
          <table className="table">
            <thead><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td>{e.expense_date}</td>
                  <td>{e.category || '—'}</td>
                  <td>{e.vendor || '—'}</td>
                  <td>{formatMoney(Number(e.amount), e.currency)}</td>
                  <td><button onClick={() => remove(e.id)} className="btn-icon danger"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
