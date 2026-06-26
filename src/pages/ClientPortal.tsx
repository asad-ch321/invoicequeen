import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../lib/currencies';
import { buildPaymentOptions } from '../lib/payments';

interface PortalItem { description: string; quantity: number; unit_price: number; amount: number; tax_rate: number; }
interface PortalInvoice {
  invoice_number: string; status: string; issue_date: string; due_date: string | null;
  currency: string; subtotal: number; tax_amount: number; discount: number; total: number;
  notes: string | null; payment_link: string | null; late_fee_amount: number;
}
interface PortalBusiness {
  business_name: string; email: string | null; phone: string | null; logo_url: string | null;
  paypal_me: string | null; stripe_payment_link: string | null; payment_instructions: string | null;
}

export default function ClientPortal() {
  const { token } = useParams();
  const [data, setData] = useState<{ invoice: PortalInvoice; items: PortalItem[]; business: PortalBusiness | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: res, error: err } = await supabase.functions.invoke('public-invoice', { body: { token } });
      if (err || !res?.invoice) setError('This invoice link is invalid or has expired.');
      else setData(res);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error || !data) return <div className="portal-wrap"><div className="card"><p>{error}</p></div></div>;

  const { invoice, items, business } = data;
  const cur = invoice.currency;
  const amountDue = Number(invoice.total) + Number(invoice.late_fee_amount || 0);
  const payOptions = buildPaymentOptions(business, amountDue, cur);
  const paid = invoice.status === 'paid';

  return (
    <div className="portal-wrap" style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <div className="card">
        <div className="invoice-brand-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
          <div className="invoice-brand-info">
            {business?.logo_url && <img src={business.logo_url} alt="Logo" className="invoice-brand-logo" />}
            <h2>{business?.business_name || 'Invoice'}</h2>
            {business?.email && <p>{business.email}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0 }}>INVOICE</h1>
            <p>#{invoice.invoice_number}</p>
            <span className={`badge ${paid ? 'badge-paid' : invoice.status === 'overdue' ? 'badge-overdue' : 'badge-unpaid'}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        <p style={{ marginTop: 16, color: '#64748b' }}>
          Issued: {invoice.issue_date}{invoice.due_date ? ` · Due: ${invoice.due_date}` : ''}
        </p>

        <table className="table" style={{ marginTop: 16 }}>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td>{it.quantity}</td>
                <td>{formatMoney(Number(it.unit_price), cur)}</td>
                <td>{formatMoney(Number(it.amount), cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals-section" style={{ marginTop: 16 }}>
          <div className="total-row"><span>Subtotal</span><span>{formatMoney(Number(invoice.subtotal), cur)}</span></div>
          <div className="total-row"><span>Tax</span><span>{formatMoney(Number(invoice.tax_amount), cur)}</span></div>
          {Number(invoice.discount) > 0 && <div className="total-row"><span>Discount</span><span>-{formatMoney(Number(invoice.discount), cur)}</span></div>}
          {Number(invoice.late_fee_amount) > 0 && <div className="total-row"><span>Late fee</span><span>{formatMoney(Number(invoice.late_fee_amount), cur)}</span></div>}
          <div className="total-row total-final"><span>Amount Due</span><span>{formatMoney(amountDue, cur)}</span></div>
        </div>

        {invoice.notes && <p style={{ marginTop: 16, color: '#64748b', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>}

        {!paid && payOptions.length > 0 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            {payOptions.map(o => (
              <a key={o.label} href={o.url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ margin: 4 }}>
                {o.label}
              </a>
            ))}
          </div>
        )}

        {!paid && business?.payment_instructions && (
          <p style={{ marginTop: 16, color: '#64748b', whiteSpace: 'pre-wrap', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            {business.payment_instructions}
          </p>
        )}

        {paid && <p style={{ marginTop: 24, textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>This invoice has been paid. Thank you!</p>}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={() => window.print()} className="btn btn-ghost">Print / Save PDF</button>
        </div>
      </div>
    </div>
  );
}
