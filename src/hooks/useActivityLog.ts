import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ActivityLog } from '../types';

/** Loads the activity timeline for the selected task. */
export function useActivityLog(taskId: string | null) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const fetchLogs = useCallback(async () => {
    if (!taskId) return;
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    if (!error && data) setLogs(data);
  }, [taskId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, refetch: fetchLogs };
}
