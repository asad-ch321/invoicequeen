// Turn a Supabase/Postgres error into a user-facing message.
// Free-plan trigger errors are raised as "FREE_LIMIT: <message>" — strip the prefix
// so the toast shows just the friendly upgrade text.
export function dbErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const m = (error as { message?: string })?.message || '';
  if (m.includes('FREE_LIMIT')) return m.replace(/^.*FREE_LIMIT:\s*/, '');
  return m || fallback;
}

export function isFreeLimit(error: unknown): boolean {
  return ((error as { message?: string })?.message || '').includes('FREE_LIMIT');
}
