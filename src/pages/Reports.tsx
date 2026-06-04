import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../lib/currencies';
import type { Invoice, Client } from '../types/database';

export default function Reports() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('invoices').select('*').eq('user_id', user.id).order('issue_date'),
      supabase.from('clients').select('*').eq('user_id', user.id),
    ]).then(([iRes, cRes]) => {
      setInvoices(iRes.data || []);
      setClients(cRes.data || []);
      setLoading(false);
    });
  }, [user]);

  const monthlyRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((acc, inv) => {
      const month = new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const existing = acc.find(a => a.month === month);
      if (existing) existing.revenue += Number(inv.total);
      else acc.push({ month, revenue: Number(inv.total) });
      return acc;
    }, [] as { month: string; revenue: number }[]);

  const revenueByClient = clients.map(c => ({
    name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
    revenue: invoices.filter(i => i.client_id === c.id && i.status === 'paid').reduce((s, i) => s + Number(i.total), 0),
  })).filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const exportCSV = () => {
    const headers = ['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Discount', 'Total'];
    const rows = invoices.map(inv => {
      const client = clients.find(c => c.id === inv.client_id);
      return [inv.invoice_number, client?.name || '', inv.issue_date, inv.due_date || '', inv.status, inv.subtotal, inv.tax_amount, inv.discount, inv.total].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoicequeen-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
  const avgInvoice = invoices.length ? totalInvoiced / invoices.length : 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports</h1>
        <button onClick={exportCSV} className="btn btn-primary"><Download size={18} /> Export CSV</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div><p className="stat-label">Total Revenue</p><p className="stat-value">{formatMoney(totalRevenue, 'USD')}</p></div>
        </div>
        <div className="stat-card">
          <div><p className="stat-label">Total Invoiced</p><p className="stat-value">{formatMoney(totalInvoiced, 'USD')}</p></div>
        </div>
        <div className="stat-card">
          <div><p className="stat-label">Average Invoice</p><p className="stat-value">{formatMoney(avgInvoice, 'USD')}</p></div>
        </div>
        <div className="stat-card">
          <div><p className="stat-label">Total Invoices</p><p className="stat-value">{invoices.length}</p></div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Monthly Revenue</h3>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="empty-text">No revenue data yet</p>}
        </div>
        <div className="chart-card">
          <h3>Revenue by Client</h3>
          {revenueByClient.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByClient} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-secondary)" />
                <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" width={120} />
                <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty-text">No client revenue data yet</p>}
        </div>
      </div>
    </div>
  );
}
