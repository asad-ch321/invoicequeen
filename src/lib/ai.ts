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
    // Supabase wraps non-2xx as FunctionsHttpError; surface the body if present.
    const ctx = (error as any).context;
    if (ctx?.status === 402) throw new Error('insufficient_credits');
    throw new Error(error.message || 'AI request failed');
  }
  if (!data?.ok) throw new Error(data?.error || 'AI request failed');
  return data as AiResult<T>;
}
