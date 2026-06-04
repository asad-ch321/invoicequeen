import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { formatMoney } from '../lib/currencies';
import type { Invoice } from '../types/database';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('invoices')
      .select('*, client:clients(name, email, company)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data || []) as any);
        setLoading(false);
      });
  }, [user]);

  const filtered = invoices.filter(inv => {
    const matchesSearch = search === '' ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv as any).client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Invoices</h1>
        <Link to="/invoices/new" className="btn btn-primary"><Plus size={18} /> New Invoice</Link>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No invoices found</p>
            <Link to="/invoices/new" className="btn btn-primary">Create your first invoice</Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.invoice_number}</td>
                  <td>{(inv as any).client?.name || '—'}</td>
                  <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                  <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td className="font-medium">{formatMoney(Number(inv.total), inv.currency || 'USD')}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>
                    <Link to={`/invoices/${inv.id}`} className="btn btn-sm btn-ghost">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
