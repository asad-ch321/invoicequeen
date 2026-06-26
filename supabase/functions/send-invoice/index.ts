// send-invoice — emails an invoice (branded HTML + PDF attachment) to its client.
//
// Flow: the browser builds the PDF (jsPDF) and posts it as base64. This function
// verifies the caller owns the invoice (RLS via the caller's JWT), renders a
// branded HTML email, sends it through Resend, and records delivery on the row.
//
// Required secrets (set via Supabase dashboard / CLI):
//   RESEND_API_KEY   — Resend API key
//   RESEND_FROM      — verified "from" address, e.g. "InvoiceQueen <invoices@yourdomain.com>"
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY — auto-injected

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'InvoiceQueen <onboarding@resend.dev>';
  if (!RESEND_API_KEY) return json({ error: 'Email service not configured' }, 500);

  // Client scoped to the caller's JWT — RLS ensures they can only read their own rows.
  const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return json({ error: 'Invalid session' }, 401);

  let payload: { invoice_id?: string; pdf_base64?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { invoice_id, pdf_base64 } = payload;
  if (!invoice_id) return json({ error: 'invoice_id required' }, 400);

  // Fetch invoice (RLS-guarded) + related client and business profile.
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoice_id)
    .single();
  if (invErr || !invoice) return json({ error: 'Invoice not found' }, 404);

  const { data: client } = invoice.client_id
    ? await supabase.from('clients').select('*').eq('id', invoice.client_id).single()
    : { data: null };
  if (!client?.email) return json({ error: 'Client has no email address' }, 400);

  const { data: biz } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', auth.user.id)
    .single();

  const fromName = biz?.business_name || 'InvoiceQueen';
  const total = Number(invoice.total).toFixed(2);
  const dueLine = invoice.due_date ? `<p style="margin:4px 0;color:#64748b">Due: ${esc(invoice.due_date)}</p>` : '';

  const payButton = invoice.payment_link
    ? `<div style="margin:24px 0;text-align:center">
         <a href="${esc(invoice.payment_link)}" style="background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block;font-weight:bold">Pay Now</a>
       </div>`
    : '';
  const instructions = biz?.payment_instructions
    ? `<p style="color:#64748b;font-size:13px;white-space:pre-wrap;border-top:1px solid #e2e8f0;padding-top:12px">${esc(biz.payment_instructions)}</p>`
    : '';

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
    <div style="border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px">
      <h2 style="margin:0;color:#6366f1">${esc(fromName)}</h2>
      ${biz?.email ? `<p style="margin:2px 0;color:#64748b;font-size:13px">${esc(biz.email)}</p>` : ''}
    </div>
    <p>Hi ${esc(client.name || 'there')},</p>
    <p>Please find attached invoice <strong>#${esc(invoice.invoice_number)}</strong>.</p>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:4px 0"><strong>Invoice:</strong> #${esc(invoice.invoice_number)}</p>
      <p style="margin:4px 0"><strong>Amount due:</strong> ${esc(invoice.currency)} ${total}</p>
      ${dueLine}
    </div>
    ${payButton}
    ${invoice.notes ? `<p style="color:#64748b;font-size:14px">${esc(invoice.notes)}</p>` : ''}
    ${instructions}
    <p style="margin-top:24px">Thank you for your business!</p>
    <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:24px">
      Sent via InvoiceQueen
    </p>
  </div>`;

  const emailBody: Record<string, unknown> = {
    from: RESEND_FROM,
    to: [client.email],
    reply_to: biz?.email || undefined,
    subject: `Invoice #${invoice.invoice_number} from ${fromName}`,
    html,
  };
  if (pdf_base64) {
    emailBody.attachments = [
      { filename: `${invoice.invoice_number}.pdf`, content: pdf_base64 },
    ];
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailBody),
  });

  if (!resendRes.ok) {
    const detail = await resendRes.text();
    return json({ error: 'Failed to send email', detail }, 502);
  }

  // Record delivery. Use the service role so the update isn't blocked by RLS write rules,
  // but key it to this user's invoice id (already ownership-verified above).
  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const nextStatus = invoice.status === 'draft' ? 'unpaid' : invoice.status;
  await admin
    .from('invoices')
    .update({
      last_sent_at: new Date().toISOString(),
      sent_count: (invoice.sent_count ?? 0) + 1,
      status: nextStatus,
    })
    .eq('id', invoice_id);

  return json({ ok: true, status: nextStatus });
});
