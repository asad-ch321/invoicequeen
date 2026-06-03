import { useEffect, useState } from 'react';
import { DollarSign, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import type { Invoice } from '../types/database';

export default function Payments() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const fetchInvoices = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('invoices')
      .select('*, client:clients(name)')
      .eq('user_id', user.id)
      .in('status', ['unpaid', 'overdue', 'paid'])
      .order('created_at', { ascending: false });
    setInvoices((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, [user]);

  const recordPayment = async (invoice: Invoice, amount: number) => {
    const newTotal = Number(invoice.total);
    const isFullPayment = amount >= newTotal;

    if (isFullPayment) {
      await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      }).eq('id', invoice.id);
    } else {
      await supabase.from('invoices').update({
        total: newTotal - amount,
        notes: `${invoice.notes || ''}\nPartial payment of $${amount.toFixed(2)} recorded on ${new Date().toLocaleDateString()}`.trim(),
      }).eq('id', invoice.id);
    }

    setPayingId(null);
    setPaymentAmount(0);
    fetchInvoices();
  };

  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
  const paidInvoices = invoices.filter(i => i.status === 'paid');

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Payments</h1>
      </div>

      <div className="card mb-6">
        <h3>Pending Payments</h3>
        {unpaidInvoices.length === 0 ? <p className="empty-text">No pending payments</p> : (
          <table className="table">
            <thead><tr><th>Invoice</th><th>Client</th><th>Amount Due</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {unpaidInvoices.map(inv => (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.invoice_number}</td>
                  <td>{(inv as any).client?.name || '—'}</td>
                  <td className="font-medium">${Number(inv.total).toFixed(2)}</td>
                  <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>
                    {payingId === inv.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                          min="0.01"
                          max={Number(inv.total)}
                          step="0.01"
                          className="input-sm"
                          placeholder="Amount"
                          autoFocus
                        />
                        <button onClick={() => recordPayment(inv, paymentAmount)} className="btn btn-sm btn-primary" disabled={paymentAmount <= 0}>
                          <CheckCircle size={14} /> Record
                        </button>
                        <button onClick={() => setPayingId(null)} className="btn btn-sm btn-ghost">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setPayingId(inv.id); setPaymentAmount(Number(inv.total)); }} className="btn btn-sm btn-primary">
                        <DollarSign size={14} /> Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Payment History</h3>
        {paidInvoices.length === 0 ? <p className="empty-text">No payments recorded yet</p> : (
          <table className="table">
            <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Paid On</th><th>Status</th></tr></thead>
            <tbody>
              {paidInvoices.map(inv => (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.invoice_number}</td>
                  <td>{(inv as any).client?.name || '—'}</td>
                  <td className="font-medium">${Number(inv.total).toFixed(2)}</td>
                  <td>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '—'}</td>
                  <td><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
