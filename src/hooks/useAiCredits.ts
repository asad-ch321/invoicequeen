import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Reads the current user's AI credit balance. Returns 0 if no row exists yet.
export function useAiCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('ai_credits').select('balance').eq('user_id', user.id).single();
    setBalance(data?.balance ?? 0);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  return { balance, setBalance, refetch };
}
