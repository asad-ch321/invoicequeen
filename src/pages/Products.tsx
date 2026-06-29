import { useEffect, useState } from 'react';
import { Trash2, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatMoney } from '../lib/currencies';
import CurrencySelect from '../components/CurrencySelect';
import type { Product } from '../types/database';

const blank = () => ({
  name: '', description: '', sku: '', unit_price: 0, currency: 'USD', track_inventory: false, stock_qty: 0,
});

export default function Products() {
  const { user } = useAuth();
  const { confirm } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(blank());

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setProducts((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const openNew = () => { setEditing(null); setForm(blank()); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '', sku: p.sku || '',
      unit_price: Number(p.unit_price), currency: p.currency,
      track_inventory: p.track_inventory, stock_qty: Number(p.stock_qty),
    });
  };

  const save = async () => {
    if (!user || !form.name.trim()) return;
    const payload = { ...form, user_id: user.id, description: form.description || null, sku: form.sku || null, updated_at: new Date().toISOString() };
    if (editing) await (supabase.from('products') as any).update(payload).eq('id', editing.id);
    else await (supabase.from('products') as any).insert(payload);
    openNew();
    load();
  };

  const remove = async (id: string) => {
    if (!(await confirm('Delete this product?'))) return;
    await supabase.from('products').delete().eq('id', id);
    load();
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header"><h1>Products & Services</h1></div>

      <div className="two-col-grid">
        <div className="card">
          <div className="card-header-row">
            <h3>{editing ? `Edit ${editing.name}` : 'Add Product / Service'}</h3>
            <Package size={20} className="text-secondary" />
          </div>
          <div className="form-group">
            <label>Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Website Design" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="form-grid-3">
            <div className="form-group"><label>SKU</label><input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
            <div className="form-group"><label>Unit Price</label><input type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} min="0" step="0.01" /></div>
            <div className="form-group"><label>Currency</label><CurrencySelect value={form.currency} onChange={v => setForm({ ...form, currency: v })} /></div>
          </div>
          <div className="form-group">
            <label className="flex gap-2" style={{ alignItems: 'center' }}>
              <input type="checkbox" checked={form.track_inventory} onChange={e => setForm({ ...form, track_inventory: e.target.checked })} />
              Track inventory
            </label>
          </div>
          {form.track_inventory && (
            <div className="form-group">
              <label>Stock quantity</label>
              <input type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: parseFloat(e.target.value) || 0 })} min="0" />
            </div>
          )}
          <div className="form-actions">
            {editing && <button onClick={openNew} className="btn btn-ghost">Cancel</button>}
            <button onClick={save} className="btn btn-primary" disabled={!form.name.trim()}>{editing ? 'Update' : 'Add'} Product</button>
          </div>
        </div>

        <div className="card">
          <h3>Your Catalog</h3>
          {products.length === 0 ? <p className="empty-text">No products yet.</p> : (
            <table className="table">
              <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium" style={{ cursor: 'pointer' }} onClick={() => openEdit(p)}>
                      {p.name}{p.sku ? <span className="text-sm text-secondary"> · {p.sku}</span> : ''}
                    </td>
                    <td>{formatMoney(Number(p.unit_price), p.currency)}</td>
                    <td>{p.track_inventory ? Number(p.stock_qty) : '—'}</td>
                    <td><button onClick={() => remove(p.id)} className="btn-icon danger"><Trash2 size={16} /></button></td>
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
