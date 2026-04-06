import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Comment } from '../types';

/** Handles comment loading and creation for the active task detail view. */
export function useComments(taskId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (!error && data) setComments(data);
    setLoading(false);
  }, [taskId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const addComment = async (content: string, userId: string, authorName?: string) => {
    const { data, error } = await supabase
      .from('comments')
      .insert({ task_id: taskId, user_id: userId, content, author_name: authorName ?? 'Guest' })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      setComments(prev => [...prev, data]);
      return data;
    }
  };

  return { comments, loading, addComment };
}
