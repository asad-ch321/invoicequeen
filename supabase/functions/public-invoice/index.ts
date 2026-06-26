// public-invoice — returns a single invoice for the client portal, by public token.
// No auth: the unguessable uuid token is the capability. Only safe, client-facing
// fields are returned (no user_id, no internal config beyond payment endpoints).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { token?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body.token) return json({ error: 'token required' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, user_id, invoice_number, status, issue_date, due_date, currency, subtotal, tax_amount, discount, total, notes, payment_link, late_fee_amount')
    .eq('public_token', body.token)
    .single();
  if (!invoice) return json({ error: 'Invoice not found' }, 404);

  const [{ data: items }, { data: biz }] = await Promise.all([
    admin.from('invoice_items').select('description, quantity, unit_price, amount, tax_rate, position').eq('invoice_id', invoice.id).order('position'),
    admin.from('business_profiles').select('business_name, email, phone, logo_url, paypal_me, stripe_payment_link, payment_instructions').eq('user_id', invoice.user_id).single(),
  ]);

  // Strip user_id before returning.
  const { user_id: _omit, ...publicInvoice } = invoice as any;

  return json({ invoice: publicInvoice, items: items ?? [], business: biz ?? null });
});
