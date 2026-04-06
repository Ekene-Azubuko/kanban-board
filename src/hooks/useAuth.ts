import { useState, useEffect } from 'react';
import { supabase, ensureGuestSession } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

/** Exposes the current Supabase user and waits for the guest session on first load. */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureGuestSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
