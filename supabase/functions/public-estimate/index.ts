// public-estimate — client-facing estimate view + accept/sign by public token (no auth).
//   GET-style:  { token }                          -> estimate + business
//   accept:     { token, action:'accept', signature_name } -> marks accepted + signed

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

  let body: { token?: string; action?: string; signature_name?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body.token) return json({ error: 'token required' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: est } = await admin
    .from('estimates')
    .select('id, user_id, estimate_number, status, issue_date, valid_until, currency, line_items, tax_rate, discount, total, notes, signature_name, signed_at')
    .eq('public_token', body.token)
    .single();
  if (!est) return json({ error: 'Estimate not found' }, 404);

  if (body.action === 'accept') {
    if (!body.signature_name?.trim()) return json({ error: 'Signature required' }, 400);
    if (est.status === 'converted') return json({ error: 'Already processed' }, 409);
    await admin.from('estimates').update({
      status: 'accepted',
      signature_name: body.signature_name.trim(),
      signed_at: new Date().toISOString(),
    }).eq('id', est.id);
    est.status = 'accepted';
    est.signature_name = body.signature_name.trim();
    est.signed_at = new Date().toISOString();
  }

  const { data: biz } = await admin
    .from('business_profiles')
    .select('business_name, email, logo_url')
    .eq('user_id', est.user_id)
    .single();

  const { user_id: _omit, ...publicEstimate } = est as any;
  return json({ estimate: publicEstimate, business: biz ?? null });
});
