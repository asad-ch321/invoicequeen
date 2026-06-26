import { supabase } from './supabase';

// Fire-and-forget audit logging. Never blocks or throws into the caller's flow.
export async function logAudit(
  userId: string,
  action: string,
  entity?: string,
  entityId?: string,
  detail?: Record<string, unknown>,
) {
  try {
    await (supabase.from('audit_log') as any).insert({
      user_id: userId,
      action,
      entity: entity ?? null,
      entity_id: entityId ?? null,
      detail: detail ?? null,
    });
  } catch {
    // Audit failures must not affect the user action.
  }
}
