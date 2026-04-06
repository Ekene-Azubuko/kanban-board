import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Member } from '../types';

/** Loads and mutates the current user's team members. */
export function useMembers(userId: string | undefined) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!userId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (!error && data) setMembers(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const addMember = async (name: string, email?: string) => {
    if (!userId) return;

    // Keep avatar colors varied without storing extra picker state in the form.
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
    const { data, error } = await supabase
      .from('members')
      .insert({ name, email, user_id: userId, avatar_color: color, avatar_initials: initials })
      .select()
      .single();
    if (!error && data) {
      setMembers(prev => [...prev, data]);
      return data as Member;
    }
    throw error;
  };

  return { members, loading, addMember, refetch: fetchMembers };
}
