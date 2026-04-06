import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env and fill in your values.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Ensures the app always has an anonymous session before any data loads. */
export async function ensureGuestSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
  return supabase.auth.getSession();
}
