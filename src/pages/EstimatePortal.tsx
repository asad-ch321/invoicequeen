import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../lib/currencies';
import type { EstimateLineItem } from '../types/database';

interface PortalEstimate {
  estimate_number: string; status: string; issue_date: string; valid_until: string | null;
  currency: string; line_items: EstimateLineItem[]; tax_rate: number; discount: number; total: number;
  notes: string | null; signature_name: string | null; signed_at: string | null;
}

export default function EstimatePortal() {
  const { token } = useParams();
  const [data, setData] = useState<{ estimate: PortalEstimate; business: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signName, setSignName] = useState('');
  const [signing, setSigning] = useState(false);

  const fetchEstimate = async (action?: string, signature_name?: string) => {
    const { data: res, error: err } = await supabase.functions.invoke('public-estimate', {
      body: { token, action, signature_name },
    });
    if (err || !res?.estimate) { setError('This estimate link is invalid or has expired.'); }
    else setData(res);
    setLoading(false);
  };

  useEffect(() => { fetchEstimate(); }, [token]);

  const accept = async () => {
    if (!signName.trim()) return;
    setSigning(true);
    await fetchEstimate('accept', signName.trim());
    setSigning(false);
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error || !data) return <div className="portal-wrap"><div className="card"><p>{error}</p></div></div>;

  const { estimate: est, business } = data;
  const cur = est.currency;
  const subtotal = est.line_items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const accepted = est.status === 'accepted' || est.status === 'converted';

  return (
    <div className="portal-wrap" style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {business?.logo_url && <img src={business.logo_url} alt="Logo" className="invoice-brand-logo" />}
            <h2>{business?.business_name || 'Estimate'}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0 }}>ESTIMATE</h1>
            <p>#{est.estimate_number}</p>
          </div>
        </div>

        <p style={{ marginTop: 12, color: '#64748b' }}>
          Issued: {est.issue_date}{est.valid_until ? ` · Valid until: ${est.valid_until}` : ''}
        </p>

        <table className="table" style={{ marginTop: 16 }}>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
          <tbody>
            {est.line_items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td>{it.quantity}</td>
                <td>{formatMoney(Number(it.unit_price), cur)}</td>
                <td>{formatMoney(Number(it.quantity) * Number(it.unit_price), cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals-section" style={{ marginTop: 16 }}>
          <div className="total-row"><span>Subtotal</span><span>{formatMoney(subtotal, cur)}</span></div>
          <div className="total-row"><span>Tax ({est.tax_rate}%)</span><span>{formatMoney(subtotal * Number(est.tax_rate) / 100, cur)}</span></div>
          {Number(est.discount) > 0 && <div className="total-row"><span>Discount</span><span>-{formatMoney(Number(est.discount), cur)}</span></div>}
          <div className="total-row total-final"><span>Total</span><span>{formatMoney(Number(est.total), cur)}</span></div>
        </div>

        {est.notes && <p style={{ marginTop: 16, color: '#64748b', whiteSpace: 'pre-wrap' }}>{est.notes}</p>}

        {accepted ? (
          <div style={{ marginTop: 24, textAlign: 'center', color: '#16a34a' }}>
            <p style={{ fontWeight: 600 }}>✓ Accepted by {est.signature_name}</p>
            {est.signed_at && <p className="text-sm">{new Date(est.signed_at).toLocaleString()}</p>}
          </div>
        ) : (
          <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <h3>Accept this estimate</h3>
            <p className="text-sm text-secondary">Type your full name as a digital signature to accept.</p>
            <div className="flex gap-2" style={{ marginTop: 8 }}>
              <input type="text" placeholder="Your full name" value={signName} onChange={e => setSignName(e.target.value)} />
              <button onClick={accept} disabled={signing || !signName.trim()} className="btn btn-primary">
                {signing ? 'Signing...' : 'Accept & Sign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
