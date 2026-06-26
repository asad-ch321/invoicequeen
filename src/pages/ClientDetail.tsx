import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building, MapPin, FileDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';
import { formatMoney } from '../lib/currencies';
import { useBusinessProfile } from '../hooks/useBusinessProfile';
import type { Client, Invoice } from '../types/database';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile: biz } = useBusinessProfile();

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
  const outstanding = totalBilled - totalPaid;

  // Account statement: a one-page PDF ledger of all the client's invoices.
  const exportStatement = () => {
    if (!client) return;
    const doc = new jsPDF();
    const margin = 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('STATEMENT OF ACCOUNT', margin, 22);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    let y = 32;
    if (biz?.business_name) { doc.text(biz.business_name, margin, y); y += 5; }
    doc.text(`Statement for: ${client.name}`, margin, y); y += 5;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);

    autoTable(doc, {
      startY: y + 8,
      head: [['Invoice', 'Issued', 'Due', 'Status', 'Amount']],
      body: invoices.map(i => [
        i.invoice_number,
        i.issue_date,
        i.due_date || '—',
        i.status,
        `${i.currency} ${Number(i.total).toFixed(2)}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
      styles: { fontSize: 9.5, cellPadding: 3 },
      margin: { left: margin, right: margin },
    });

    let ty = ((doc as any).lastAutoTable?.finalY || y + 20) + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    const row = (label: string, value: string) => { doc.text(label, 130, ty); doc.text(value, 195, ty, { align: 'right' }); ty += 6; };
    row('Total Billed', formatMoney(totalBilled, 'USD'));
    row('Total Paid', formatMoney(totalPaid, 'USD'));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    row('Outstanding', formatMoney(outstanding, 'USD'));

    doc.save(`Statement-${client.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate('/app/clients')} className="btn btn-ghost"><ArrowLeft size={18} /> Back to Clients</button>
        {invoices.length > 0 && (
          <button onClick={exportStatement} className="btn btn-ghost"><FileDown size={18} /> Statement PDF</button>
        )}
      </div>

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
                    <td><Link to={`/app/invoices/${inv.id}`} className="link">{inv.invoice_number}</Link></td>
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
