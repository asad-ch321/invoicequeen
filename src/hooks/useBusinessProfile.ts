import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { BusinessProfile } from '../types/database';

export function useBusinessProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) { setLoading(false); return; }
    // A user may now have multiple profiles — use the default (or most recent).
    const { data } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    setProfile(data as BusinessProfile | null);
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, [user]);

  return { profile, loading, refetch: fetchProfile };
}
