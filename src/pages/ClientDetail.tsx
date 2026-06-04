import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';
import { formatMoney } from '../lib/currencies';
import type { Client, Invoice } from '../types/database';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ]).then(([cRes, iRes]) => {
      setClient(cRes.data);
      setInvoices(iRes.data || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!client) return <div className="page"><p>Client not found</p></div>;

  const totalBilled = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="page">
      <button onClick={() => navigate('/clients')} className="btn btn-ghost mb-4"><ArrowLeft size={18} /> Back to Clients</button>

      <div className="two-col-grid">
        <div className="card">
          <div className="client-detail-header">
            <div className="client-avatar-lg">{client.name.charAt(0)}</div>
            <div>
              <h2>{client.name}</h2>
              {client.company && <p className="text-secondary">{client.company}</p>}
            </div>
          </div>
          <div className="client-info-list">
            {client.email && <div className="info-item"><Mail size={16} /> {client.email}</div>}
            {client.phone && <div className="info-item"><Phone size={16} /> {client.phone}</div>}
            {client.company && <div className="info-item"><Building size={16} /> {client.company}</div>}
            {client.address && <div className="info-item"><MapPin size={16} /> {client.address}</div>}
          </div>
          {client.notes && <div className="mt-4"><p className="text-sm text-secondary">{client.notes}</p></div>}

          <div className="stats-row mt-4">
            <div><p className="stat-label">Total Billed</p><p className="stat-value">{formatMoney(totalBilled, 'USD')}</p></div>
            <div><p className="stat-label">Total Paid</p><p className="stat-value text-green">{formatMoney(totalPaid, 'USD')}</p></div>
            <div><p className="stat-label">Invoices</p><p className="stat-value">{invoices.length}</p></div>
          </div>
        </div>

        <div className="card">
          <h3>Invoice History</h3>
          {invoices.length === 0 ? <p className="empty-text">No invoices for this client</p> : (
            <table className="table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td><Link to={`/invoices/${inv.id}`} className="link">{inv.invoice_number}</Link></td>
                    <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                    <td>{formatMoney(Number(inv.total), inv.currency || 'USD')}</td>
                    <td><StatusBadge status={inv.status} /></td>
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
