import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = 'https://fmcxfihrsqcqzazxpbxv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
