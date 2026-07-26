import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://lwfqviufvkgfqjgcoqjg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Uy37vlwN98RzDNq4czAyGA_565KefLI';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});
