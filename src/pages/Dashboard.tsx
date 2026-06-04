import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Clock, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { formatMoney } from '../lib/currencies';
import type { Invoice, Client } from '../types/database';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#94a3b8'];

export default function Dashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<(Invoice & { client?: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('invoices').select('*, client:clients(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', user.id),
    ]).then(([invRes, cliRes]) => {
      setInvoices((invRes.data || []) as any);
      setClients(cliRes.data || []);
      setLoading(false);
    });
  }, [user]);

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const outstanding = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').reduce((s, i) => s + Number(i.total), 0);
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const statusData = [
    { name: 'Paid', value: invoices.filter(i => i.status === 'paid').length },
    { name: 'Unpaid', value: invoices.filter(i => i.status === 'unpaid').length },
    { name: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length },
    { name: 'Draft', value: invoices.filter(i => i.status === 'draft').length },
  ].filter(d => d.value > 0);

  const monthlyData = invoices.reduce((acc, inv) => {
    const month = new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const existing = acc.find(a => a.month === month);
    if (existing) existing.amount += Number(inv.total);
    else acc.push({ month, amount: Number(inv.total) });
    return acc;
  }, [] as { month: string; amount: number }[]).slice(-6);

  const topClients = clients.map(c => ({
    ...c,
    total: invoices.filter(i => i.client_id === c.id && i.status === 'paid').reduce((s, i) => s + Number(i.total), 0),
  })).sort((a, b) => b.total - a.total).slice(0, 5);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/app/invoices/new" className="btn btn-primary">+ New Invoice</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><DollarSign size={24} /></div>
          <div><p className="stat-label">Total Revenue</p><p className="stat-value">{formatMoney(totalRevenue, 'USD')}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Clock size={24} /></div>
          <div><p className="stat-label">Outstanding</p><p className="stat-value">{formatMoney(outstanding, 'USD')}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo"><CheckCircle size={24} /></div>
          <div><p className="stat-label">Paid Invoices</p><p className="stat-value">{paidCount}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><TrendingUp size={24} /></div>
          <div><p className="stat-label">Overdue</p><p className="stat-value">{overdueCount}</p></div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Monthly Revenue</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty-text">No invoice data yet</p>}
        </div>
        <div className="chart-card">
          <h3>Invoice Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="empty-text">No invoices yet</p>}
        </div>
      </div>

      <div className="two-col-grid">
        <div className="card">
          <h3>Recent Invoices</h3>
          {invoices.length === 0 ? <p className="empty-text">No invoices yet</p> : (
            <table className="table">
              <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.slice(0, 5).map(inv => (
                  <tr key={inv.id}>
                    <td><Link to={`/app/invoices/${inv.id}`} className="link">{inv.invoice_number}</Link></td>
                    <td>{(inv.client as any)?.name || '—'}</td>
                    <td>{formatMoney(Number(inv.total), inv.currency || 'USD')}</td>
                    <td><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="card-header-row">
            <h3>Top Clients</h3>
            <Users size={20} className="text-secondary" />
          </div>
          {topClients.length === 0 ? <p className="empty-text">No clients yet</p> : (
            <div className="top-clients-list">
              {topClients.map(c => (
                <div key={c.id} className="top-client-item">
                  <div className="client-avatar">{c.name.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-secondary">{c.company || c.email || ''}</p>
                  </div>
                  <p className="font-medium">{formatMoney(c.total, 'USD')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
