// ai-generate — credit-metered AI helper backed by DeepSeek (via Vercel AI Gateway).
//
// Three modes:
//   invoice_writer — project description -> { line_items:[{description,quantity,unit_price}], notes }
//   reminder_email — overdue context    -> { subject, body }
//   due_date       — client + amount    -> { days, rationale }
//
// Auth = caller JWT. Each successful generation consumes one AI credit (atomic,
// after the model responds, so failures are free). DeepSeek key never leaves here.
//
// Secrets: AI_GATEWAY_API_KEY, DEEPSEEK_MODEL (optional, default deepseek/deepseek-chat),
//          plus auto-injected SUPABASE_*.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

interface Prompt { system: string; user: string; json: boolean; }

function buildPrompt(mode: string, input: any): Prompt | null {
  switch (mode) {
    case 'invoice_writer':
      return {
        json: true,
        system:
          'You are an invoicing assistant. From a freelancer/business project description, produce realistic invoice line items. ' +
          'Respond ONLY with JSON: {"line_items":[{"description":string,"quantity":number,"unit_price":number}],"notes":string}. ' +
          'Use sensible quantities and unit prices in the given currency. Keep descriptions concise and professional.',
        user: `Currency: ${input?.currency || 'USD'}\nProject description: ${input?.description || ''}`,
      };
    case 'reminder_email':
      return {
        json: true,
        system:
          'You write polite, professional overdue-invoice reminder emails. ' +
          'Respond ONLY with JSON: {"subject":string,"body":string}. Keep it warm, brief, and clear about the amount due.',
        user: `Business: ${input?.business_name || ''}\nClient: ${input?.client_name || ''}\nInvoice: ${input?.invoice_number || ''}\nAmount due: ${input?.currency || ''} ${input?.amount ?? ''}\nDays overdue: ${input?.days_overdue ?? ''}`,
      };
    case 'due_date':
      return {
        json: true,
        system:
          'You suggest invoice payment terms. Respond ONLY with JSON: {"days":number,"rationale":string}. ' +
          'Pick a common net term (7, 14, 30, 45, 60) based on the context.',
        user: `Client: ${input?.client_name || ''}\nAmount: ${input?.currency || ''} ${input?.amount ?? ''}\nNotes: ${input?.notes || ''}`,
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  const AI_KEY = Deno.env.get('AI_GATEWAY_API_KEY');
  if (!AI_KEY) return json({ error: 'AI service not configured' }, 500);
  const MODEL = Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek/deepseek-v4-flash';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

  const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return json({ error: 'Invalid session' }, 401);

  let body: { mode?: string; input?: any };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const prompt = body.mode ? buildPrompt(body.mode, body.input) : null;
  if (!prompt) return json({ error: 'Unknown mode' }, 400);

  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Pre-check balance to avoid spending an LLM call when the user has no credits.
  const { data: credits } = await admin
    .from('ai_credits').select('balance').eq('user_id', auth.user.id).single();
  if (!credits || credits.balance < 1) {
    return json({ error: 'insufficient_credits', balance: credits?.balance ?? 0 }, 402);
  }

  // DeepSeek via Vercel AI Gateway (OpenAI-compatible).
  const aiRes = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      ...(prompt.json ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.4,
    }),
  });

  if (!aiRes.ok) {
    const detail = await aiRes.text();
    return json({ error: 'AI request failed', detail }, 502);
  }

  const aiJson = await aiRes.json();
  const content: string = aiJson?.choices?.[0]?.message?.content ?? '';
  let result: unknown = content;
  if (prompt.json) {
    try { result = JSON.parse(content); } catch { return json({ error: 'AI returned malformed output' }, 502); }
  }

  // Charge one credit now that we have a valid result.
  const { data: remaining } = await admin.rpc('consume_ai_credit', { p_user: auth.user.id, p_mode: body.mode });

  return json({ ok: true, result, balance: remaining ?? credits.balance - 1 });
});
