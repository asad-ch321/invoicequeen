import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Client } from '../types/database';

export default function Clients() {
  const { user } = useAuth();
  const { confirm } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '', notes: '' });

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).order('name');
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setForm({ name: client.name, email: client.email || '', phone: client.phone || '', company: client.company || '', address: client.address || '', notes: client.notes || '' });
    } else {
      setEditingClient(null);
      setForm({ name: '', email: '', phone: '', company: '', address: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (editingClient) {
      await (supabase.from('clients') as any).update({ ...form }).eq('id', editingClient.id);
    } else {
      await (supabase.from('clients') as any).insert({ ...form, user_id: user.id });
    }
    setShowModal(false);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Are you sure you want to delete this client?'))) return;
    await supabase.from('clients').delete().eq('id', id);
    fetchClients();
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Clients</h1>
        <button onClick={() => openModal()} className="btn btn-primary"><Plus size={18} /> Add Client</button>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} />
          <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No clients found</p>
            <button onClick={() => openModal()} className="btn btn-primary">Add your first client</button>
          </div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/app/clients/${c.id}`} className="link">
                      <div className="flex items-center gap-2">
                        <div className="client-avatar-sm">{c.name.charAt(0)}</div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </Link>
                  </td>
                  <td>{c.company || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openModal(c)} className="btn-icon"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(c.id)} className="btn-icon danger"><Trash2 size={16} /></button>
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingClient ? 'Edit Client' : 'Add Client'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingClient ? 'Update' : 'Add'} Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
