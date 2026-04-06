import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Label } from '../types';

/** Keeps labels sorted alphabetically anywhere they are shown in the UI. */
function sortLabels(labels: Label[]) {
  return [...labels].sort((a, b) => a.name.localeCompare(b.name));
}

/** Loads and mutates the current user's label list. */
export function useLabels(userId: string | undefined) {
  const [labels, setLabels] = useState<Label[]>([]);

  const fetchLabels = useCallback(async () => {
    if (!userId) {
      setLabels([]);
      return;
    }

    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    if (!error && data) setLabels(sortLabels(data));
  }, [userId]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const addLabel = async (name: string, color: string) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('labels')
      .insert({ name, color, user_id: userId })
      .select()
      .single();
    if (!error && data) {
      setLabels(prev => sortLabels([...prev, data]));
      return data as Label;
    }
    throw error;
  };

  const updateLabel = async (labelId: string, updates: Pick<Label, 'name' | 'color'>) => {
    const { data, error } = await supabase
      .from('labels')
      .update(updates)
      .eq('id', labelId)
      .select()
      .single();

    if (!error && data) {
      setLabels(prev => sortLabels(prev.map(label => label.id === labelId ? data as Label : label)));
      return data as Label;
    }

    throw error;
  };

  const deleteLabel = async (labelId: string) => {
    const { error } = await supabase.from('labels').delete().eq('id', labelId);

    if (!error) {
      setLabels(prev => prev.filter(label => label.id !== labelId));
      return;
    }

    throw error;
  };

  return { labels, addLabel, updateLabel, deleteLabel, refetch: fetchLabels };
}
