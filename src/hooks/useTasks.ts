import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus, TaskPriority, Label, Member } from '../types';

interface TaskFilters {
  search: string;
  priority: TaskPriority | '';
  assigneeId: string;
  labelId: string;
}

// Pull related members, labels, and count summaries in one query.
const TASK_SELECT = `
  *,
  assignee:members!tasks_assignee_id_fkey(*),
  task_assignees(member:members(*)),
  task_labels(label:labels(*)),
  comment_count:comments(count),
  attachment_count:attachments(count)
`;

/** Flattens Supabase relation payloads into the task shape used across the app. */
function normalizeTask(task: any): Task {
  const relatedAssignees = task.task_assignees?.map((taskAssignee: any) => taskAssignee.member).filter(Boolean) ?? [];
  // Keep older single-assignee records working until they are backfilled into task_assignees.
  const fallbackAssignees = relatedAssignees.length > 0
    ? relatedAssignees
    : task.assignee
      ? [task.assignee]
      : [];

  return {
    ...task,
    assignee_ids: fallbackAssignees.map((member: Member) => member.id),
    assignees: fallbackAssignees,
    assignee_id: fallbackAssignees[0]?.id ?? task.assignee_id,
    assignee: fallbackAssignees[0] ?? task.assignee,
    labels: task.task_labels?.map((taskLabel: any) => taskLabel.label).filter(Boolean) ?? [],
    comment_count: task.comment_count?.[0]?.count ?? 0,
    attachment_count: task.attachment_count?.[0]?.count ?? 0,
  };
}

/** Applies the active search and filter state to a single task. */
function taskMatchesFilters(task: Task, filters: TaskFilters) {
  const search = filters.search.trim().toLowerCase();

  if (search && !task.title.toLowerCase().includes(search)) return false;
  if (filters.priority && task.priority !== filters.priority) return false;
  if (filters.assigneeId && !task.assignee_ids?.includes(filters.assigneeId)) return false;
  if (filters.labelId && !task.labels?.some(label => label.id === filters.labelId)) return false;

  return true;
}

/** Builds a stable label lookup for optimistic updates. */
function buildKnownLabels(availableLabels: Label[], tasks: Task[]) {
  const knownLabels = new Map<string, Label>();

  availableLabels.forEach(label => {
    knownLabels.set(label.id, label);
  });

  tasks.forEach(task => {
    task.labels?.forEach(label => knownLabels.set(label.id, label));
  });

  return knownLabels;
}

/** Builds a stable member lookup for optimistic updates. */
function buildKnownMembers(availableMembers: Member[], tasks: Task[]) {
  const knownMembers = new Map<string, Member>();

  availableMembers.forEach(member => {
    knownMembers.set(member.id, member);
  });

  tasks.forEach(task => {
    task.assignees?.forEach(member => knownMembers.set(member.id, member));
    if (task.assignee) knownMembers.set(task.assignee.id, task.assignee);
  });

  return knownMembers;
}

/** Owns task loading, optimistic updates, and task-related mutations. */
export function useTasks(
  userId: string | undefined,
  filters: TaskFilters,
  availableLabels: Label[] = [],
  availableMembers: Member[] = []
) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
    if (!userId) {
      setAllTasks([]);
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);

    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (!error && data) {
      setAllTasks(data.map(normalizeTask));
    }

    if (showLoading) setLoading(false);
  }, [userId]);

  const tasks = useMemo(
    () => allTasks.filter(task => taskMatchesFilters(task, filters)),
    [allTasks, filters]
  );

  useEffect(() => { fetchTasks({ showLoading: true }); }, [fetchTasks]);

  // Refresh the board whenever tasks or comments change for the current user.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => {
        fetchTasks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `user_id=eq.${userId}` }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchTasks]);

  const createTask = async (task: {
    title: string;
    description?: string;
    priority: TaskPriority;
    due_date?: string;
    assigneeIds?: string[];
    status: TaskStatus;
    labelIds?: string[];
  }) => {
    if (!userId) return;
    const { labelIds = [], assigneeIds = [], ...taskFields } = task;
    const position = allTasks
      .filter(existingTask => existingTask.status === task.status)
      .reduce((maxPosition, existingTask) => Math.max(maxPosition, existingTask.position), 0) + 1000;
    const knownLabels = buildKnownLabels(availableLabels, allTasks);
    const knownMembers = buildKnownMembers(availableMembers, allTasks);
    const assignees = assigneeIds.map(assigneeId => knownMembers.get(assigneeId)).filter(Boolean) as Member[];
    const optimisticId = `temp-${Date.now()}`;
    // Render the new card immediately, then replace it with the saved row once Supabase responds.
    const optimisticTask: Task = {
      id: optimisticId,
      title: taskFields.title,
      description: taskFields.description,
      status: taskFields.status,
      priority: taskFields.priority,
      due_date: taskFields.due_date,
      assignee_id: assigneeIds[0],
      assignee_ids: assigneeIds,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      position,
      assignee: assignees[0],
      assignees,
      labels: labelIds.map(labelId => knownLabels.get(labelId)).filter(Boolean) as Label[],
      comment_count: 0,
      attachment_count: 0,
    };

    setAllTasks(prev => [...prev, optimisticTask]);

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...taskFields, user_id: userId, position, assignee_id: assigneeIds[0] ?? null })
      .select()
      .single();

    if (error) {
      setAllTasks(prev => prev.filter(existingTask => existingTask.id !== optimisticId));
      throw error;
    }

    if (labelIds.length && data) {
      const { error: labelsError } = await supabase
        .from('task_labels')
        .insert(labelIds.map(labelId => ({ task_id: data.id, label_id: labelId })));

      if (labelsError) {
        setAllTasks(prev => prev.filter(existingTask => existingTask.id !== optimisticId));
        throw labelsError;
      }
    }

    if (assigneeIds.length && data) {
      const { error: assigneesError } = await supabase
        .from('task_assignees')
        .insert(assigneeIds.map(memberId => ({ task_id: data.id, member_id: memberId })));

      if (assigneesError) {
        setAllTasks(prev => prev.filter(existingTask => existingTask.id !== optimisticId));
        throw assigneesError;
      }
    }

    if (data) {
      await supabase.from('activity_logs').insert({
        task_id: data.id, user_id: userId, action: 'created', field_name: 'task', new_value: taskFields.title
      });

      // Refetch the full task shape so relation data and counts stay in sync.
      const { data: createdTask, error: createdTaskError } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('id', data.id)
        .single();

      if (!createdTaskError && createdTask) {
        setAllTasks(prev => prev.map(existingTask => existingTask.id === optimisticId ? normalizeTask(createdTask) : existingTask));
      } else {
        setAllTasks(prev => prev.map(existingTask => existingTask.id === optimisticId ? {
          ...optimisticTask,
          id: data.id,
        } : existingTask));
      }
    }

    return data;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>, oldTask?: Task) => {
    if (!userId) return;
    const previousTasks = allTasks;
    const updatedAt = new Date().toISOString();

    setAllTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;

      return {
        ...task,
        ...updates,
        updated_at: updatedAt,
      };
    }));

    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: updatedAt })
      .eq('id', taskId)
      .select(TASK_SELECT)
      .single();

    if (error) {
      setAllTasks(previousTasks);
      throw error;
    }

    if (data) {
      const normalizedTask = normalizeTask(data);
      setAllTasks(prev => prev.map(task => task.id === taskId ? normalizedTask : task));
    }

    // Keep the activity timeline focused on fields that are edited directly in the UI.
    const logFields = ['status', 'priority', 'due_date', 'title'] as const;
    for (const field of logFields) {
      if (updates[field] !== undefined && oldTask && String(oldTask[field]) !== String(updates[field])) {
        await supabase.from('activity_logs').insert({
          task_id: taskId, user_id: userId, action: 'updated', field_name: field,
          old_value: String(oldTask[field] ?? ''), new_value: String(updates[field] ?? '')
        });
      }
    }

    return data;
  };

  const moveTask = async (taskId: string, newStatus: TaskStatus, newPosition: number) => {
    if (!userId) return;
    const previousTasks = allTasks;
    const task = allTasks.find(existingTask => existingTask.id === taskId);
    const updatedAt = new Date().toISOString();

    setAllTasks(prev => prev.map(existingTask => existingTask.id === taskId
      ? { ...existingTask, status: newStatus, position: newPosition, updated_at: updatedAt }
      : existingTask
    ));

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, position: newPosition, updated_at: updatedAt })
      .eq('id', taskId);

    if (error) {
      setAllTasks(previousTasks);
      throw error;
    }

    if (task && task.status !== newStatus) {
      await supabase.from('activity_logs').insert({
        task_id: taskId, user_id: userId, action: 'moved',
        field_name: 'status', old_value: task.status, new_value: newStatus
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    setAllTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const updateTaskAssignees = async (taskId: string, assigneeIds: string[], oldTask?: Task) => {
    if (!userId) return;

    const previousTasks = allTasks;
    const knownMembers = buildKnownMembers(availableMembers, allTasks);
    const assignees = assigneeIds.map(assigneeId => knownMembers.get(assigneeId)).filter(Boolean) as Member[];
    const assigneeNames = assignees.map(member => member.name).join(', ');
    const oldAssigneeNames = oldTask?.assignees?.map(member => member.name).join(', ') ?? '';

    setAllTasks(prev => prev.map(task => task.id === taskId
      ? {
          ...task,
          assignee_id: assigneeIds[0],
          assignee_ids: assigneeIds,
          assignee: assignees[0],
          assignees,
          updated_at: new Date().toISOString(),
        }
      : task
    ));

    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({ assignee_id: assigneeIds[0] ?? null, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (taskUpdateError) {
      setAllTasks(previousTasks);
      throw taskUpdateError;
    }

    const { error: deleteError } = await supabase.from('task_assignees').delete().eq('task_id', taskId);
    if (deleteError) {
      setAllTasks(previousTasks);
      throw deleteError;
    }

    // Replace the junction rows so the database exactly matches the current picker state.
    if (assigneeIds.length) {
      const { error: insertError } = await supabase
        .from('task_assignees')
        .insert(assigneeIds.map(memberId => ({ task_id: taskId, member_id: memberId })));

      if (insertError) {
        setAllTasks(previousTasks);
        throw insertError;
      }
    }

    if (oldTask && oldAssigneeNames !== assigneeNames) {
      await supabase.from('activity_logs').insert({
        task_id: taskId,
        user_id: userId,
        action: 'updated',
        field_name: 'assignees',
        old_value: oldAssigneeNames,
        new_value: assigneeNames,
      });
    }

    fetchTasks();
  };

  const updateTaskLabels = async (taskId: string, labelIds: string[]) => {
    const previousTasks = allTasks;
    const knownLabels = buildKnownLabels(availableLabels, allTasks);

    setAllTasks(prev => prev.map(task => task.id === taskId
      ? { ...task, labels: labelIds.map(labelId => knownLabels.get(labelId)).filter(Boolean) as Label[] }
      : task
    ));

    const { error: deleteError } = await supabase.from('task_labels').delete().eq('task_id', taskId);
    if (deleteError) {
      setAllTasks(previousTasks);
      throw deleteError;
    }

    // Replace the junction rows so removed labels are cleared cleanly.
    if (labelIds.length) {
      const { error: insertError } = await supabase
        .from('task_labels')
        .insert(labelIds.map(labelId => ({ task_id: taskId, label_id: labelId })));

      if (insertError) {
        setAllTasks(previousTasks);
        throw insertError;
      }
    }

    fetchTasks();
  };

  const incrementTaskCommentCount = (taskId: string) => {
    // The sidebar adds comments immediately, so the card count should keep pace locally.
    setAllTasks(prev => prev.map(task => task.id === taskId
      ? { ...task, comment_count: (task.comment_count ?? 0) + 1 }
      : task
    ));
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    updateTaskAssignees,
    updateTaskLabels,
    incrementTaskCommentCount,
    refetch: fetchTasks,
  };
}
