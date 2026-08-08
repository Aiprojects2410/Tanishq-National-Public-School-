import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : null;

export async function getCurrentProfile() {
  if (!supabase) return { user: null, profile: null, error: new Error('Supabase is not configured') };
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { user: null, profile: null, error: userError ?? null };
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { user, profile, error };
}
