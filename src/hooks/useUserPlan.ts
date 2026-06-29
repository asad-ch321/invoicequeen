import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserPlan {
  plan: 'free' | 'lifetime';
  monthly_ai_credits: number;
  activated_at: string | null;
}

// Reads the current user's plan; defaults to 'free' if no row exists.
export function useUserPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('user_plans')
      .select('plan, monthly_ai_credits, activated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    setPlan((data as UserPlan) || { plan: 'free', monthly_ai_credits: 0, activated_at: null });
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  return { plan, loading, refetch };
}
