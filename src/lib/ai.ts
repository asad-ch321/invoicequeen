import { supabase } from './supabase';

export interface AiResult<T> {
  ok: boolean;
  result: T;
  balance: number;
}

// Call the ai-generate edge function. Throws with a friendly message on failure,
// including the special 'insufficient_credits' case so the UI can prompt a top-up.
export async function callAi<T>(mode: string, input: unknown): Promise<AiResult<T>> {
  const { data, error } = await supabase.functions.invoke('ai-generate', {
    body: { mode, input },
  });
  if (error) {
    // Supabase wraps non-2xx as FunctionsHttpError; read the JSON body for the real reason.
    const ctx = (error as any).context;
    let detail = error.message || 'AI request failed';
    try {
      const body = await ctx?.json?.();
      if (body?.error === 'insufficient_credits') throw new Error('insufficient_credits');
      if (body) detail = body.detail ? `${body.error}: ${body.detail}` : (body.error || detail);
    } catch (e) {
      if ((e as Error).message === 'insufficient_credits') throw e;
    }
    throw new Error(detail);
  }
  if (!data?.ok) throw new Error(data?.error || 'AI request failed');
  return data as AiResult<T>;
}
