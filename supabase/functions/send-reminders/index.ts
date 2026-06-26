// send-reminders — daily job: emails reminders for overdue invoices and applies late fees.
//
// Triggered by pg_cron via pg_net (not user JWT). Auth = shared secret in the
// `x-cron-secret` header, matched against the CRON_SECRET env var.
//
// Per business, this only runs when reminder_enabled = true. A reminder is sent at
// most once every REMINDER_INTERVAL_DAYS. Late fees are (re)computed off the base
// total when late_fee_enabled and the grace period has elapsed — stored separately
// in invoices.late_fee_amount so the original `total` is never mutated.
//
// Secrets: CRON_SECRET, RESEND_API_KEY, RESEND_FROM, plus auto-injected SUPABASE_*.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REMINDER_INTERVAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'InvoiceQueen <onboarding@resend.dev>';
  if (!RESEND_API_KEY) return json({ error: 'Email service not configured' }, 500);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Overdue invoices with a client + the owning business profile in one round trip.
  const { data: invoices, error } = await admin
    .from('invoices')
    .select('*, client:clients(*), biz:business_profiles!invoices_user_id_fkey(*)')
    .eq('status', 'overdue');
  if (error) return json({ error: error.message }, 500);

  const now = Date.now();
  let sent = 0;
  const results: Array<{ invoice: string; action: string }> = [];

  for (const inv of invoices ?? []) {
    const biz = (inv as any).biz;
    const client = (inv as any).client;
    if (!biz?.reminder_enabled || !client?.email) {
      results.push({ invoice: inv.invoice_number, action: 'skipped' });
      continue;
    }

    // Cadence gate.
    if (inv.last_reminder_at && now - new Date(inv.last_reminder_at).getTime() < REMINDER_INTERVAL_DAYS * DAY_MS) {
      results.push({ invoice: inv.invoice_number, action: 'too-soon' });
      continue;
    }

    // Late fee: percent of the base total, applied once grace days have elapsed past due date.
    let lateFee = Number(inv.late_fee_amount) || 0;
    if (biz.late_fee_enabled && Number(biz.late_fee_percent) > 0 && inv.due_date) {
      const feeStart = new Date(inv.due_date).getTime() + (Number(biz.late_fee_grace_days) || 0) * DAY_MS;
      if (now >= feeStart) {
        lateFee = Math.round(Number(inv.total) * (Number(biz.late_fee_percent) / 100) * 100) / 100;
      }
    }
    const amountDue = (Number(inv.total) + lateFee).toFixed(2);
    const feeLine = lateFee > 0
      ? `<p style="margin:4px 0;color:#dc2626"><strong>Late fee:</strong> ${esc(inv.currency)} ${lateFee.toFixed(2)}</p>`
      : '';

    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
      <div style="border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px">
        <h2 style="margin:0;color:#6366f1">${esc(biz.business_name || 'InvoiceQueen')}</h2>
      </div>
      <p>Hi ${esc(client.name || 'there')},</p>
      <p>This is a friendly reminder that invoice <strong>#${esc(inv.invoice_number)}</strong> is overdue.</p>
      <div style="background:#fef2f2;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:4px 0"><strong>Invoice:</strong> #${esc(inv.invoice_number)}</p>
        <p style="margin:4px 0"><strong>Due date:</strong> ${esc(inv.due_date)}</p>
        ${feeLine}
        <p style="margin:8px 0 0;font-size:16px"><strong>Amount due:</strong> ${esc(inv.currency)} ${amountDue}</p>
      </div>
      <p>Please arrange payment at your earliest convenience. Thank you!</p>
      <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:24px">
        Sent via InvoiceQueen
      </p>
    </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [client.email],
        reply_to: biz.email || undefined,
        subject: `Reminder: Invoice #${inv.invoice_number} is overdue`,
        html,
      }),
    });

    if (!res.ok) {
      results.push({ invoice: inv.invoice_number, action: 'send-failed' });
      continue;
    }

    await admin
      .from('invoices')
      .update({
        last_reminder_at: new Date().toISOString(),
        reminder_count: (inv.reminder_count ?? 0) + 1,
        late_fee_amount: lateFee,
      })
      .eq('id', inv.id);

    sent++;
    results.push({ invoice: inv.invoice_number, action: 'sent' });
  }

  return json({ ok: true, sent, total: invoices?.length ?? 0, results });
});
