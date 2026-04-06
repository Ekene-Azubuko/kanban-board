import React, { useState, useCallback, useEffect } from 'react';
import { UserPlus, Filter, Search } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useMembers } from './hooks/useMembers';
import { useLabels } from './hooks/useLabels';
import { Board } from './components/Board/Board';
import { AppSidebar } from './components/Sidebar/AppSidebar';
import { TaskDetail } from './components/Sidebar/TaskDetail';
import { CreateTaskModal } from './components/Modals/CreateTaskModal';
import { AddMemberModal } from './components/Modals/AddMemberModal';
import { FilterBar } from './components/Modals/FilterBar';
import { BoardStats } from './components/Modals/BoardStats';
import { AvatarStack } from './components/UI/Avatar';
import type { Task, TaskStatus, TaskPriority, Label } from './types';

/** Wires together auth, data hooks, and the main board UI. */
export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { members, addMember } = useMembers(user?.id);
  const { labels, addLabel, updateLabel, deleteLabel } = useLabels(user?.id);

  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);

  const filters = { search, priority: filterPriority, assigneeId: filterAssignee, labelId: filterLabel };
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    updateTaskAssignees,
    updateTaskLabels,
    incrementTaskCommentCount,
    refetch: refetchTasks,
  } = useTasks(user?.id, filters, labels, members);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [taskMenuTarget, setTaskMenuTarget] = useState<{ task: Task; x: number; y: number } | null>(null);

  const handleTaskMenu = useCallback((task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskMenuTarget({ task, x: e.clientX, y: e.clientY });
  }, []);

  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => {
    await createTask(data);
    setCreateStatus(null);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>, old: Task) => {
    updateTask(taskId, updates, old);
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  const handleUpdateTaskAssignees = (taskId: string, assigneeIds: string[], old: Task) => {
    updateTaskAssignees(taskId, assigneeIds, old);
    if (selectedTask?.id === taskId) {
      const nextAssignees = members.filter(member => assigneeIds.includes(member.id));
      setSelectedTask(prev => prev ? {
        ...prev,
        assignee_id: assigneeIds[0],
        assignee_ids: assigneeIds,
        assignee: nextAssignees[0],
        assignees: nextAssignees,
      } : prev);
    }
  };

  const handleCreateLabel = async (name: string, color: string) => {
    return addLabel(name, color);
  };

  const handleUpdateLabel = async (labelId: string, updates: Pick<Label, 'name' | 'color'>) => {
    const label = await updateLabel(labelId, updates);
    await refetchTasks();
    return label;
  };

  const handleDeleteLabel = async (labelId: string) => {
    await deleteLabel(labelId);
    if (filterLabel === labelId) {
      setFilterLabel('');
    }
    await refetchTasks();
  };

  useEffect(() => {
    if (!selectedTask) return;

    // Keep the detail panel aligned with the latest optimistic or realtime task state.
    const nextSelectedTask = tasks.find(task => task.id === selectedTask.id);
    if (nextSelectedTask) {
      setSelectedTask(nextSelectedTask);
    }
  }, [tasks, selectedTask?.id]);

  useEffect(() => {
    // Clear a stale label filter after the label is deleted.
    if (filterLabel && !labels.some(label => label.id === filterLabel)) {
      setFilterLabel('');
    }
  }, [filterLabel, labels]);

  const clearFilters = () => {
    setFilterPriority('');
    setFilterAssignee('');
    setFilterLabel('');
  };

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Initializing session…</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <AppSidebar onSearch={setSearch} searchValue={search} />

      <main className="main-content">
        {/* Top Nav */}
        <header className="main-header">
          <div className="header-left">
            <div className="header-logo-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 6v8l7 4 7-4V6L10 2z" fill="#d4f542" stroke="#d4f542" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M10 2v16M3 6l7 4 7-4" stroke="#1a1a1a" strokeWidth="1.5"/>
              </svg>
            </div>
            <h1 className="header-title">Kanban Board</h1>
          </div>
          <div className="header-right">
            <div className="header-search">
              <Search size={13} className="header-search-icon" />
              <input
                className="header-search-input"
                placeholder="Search tasks by title…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <AvatarStack members={members} max={4} />
            <button className="btn-primary btn-add-member" onClick={() => setShowAddMember(true)}>
              <UserPlus size={14} />Add Member
            </button>
            <button className={`btn-filter ${showFilterBar ? 'active' : ''}`} onClick={() => setShowFilterBar(p => !p)}>
              <Filter size={14} />Filter
            </button>
          </div>
        </header>

        {/* Tab row */}
        <div className="main-tabs">
          <button className="main-tab active">Tasks</button>
          <button className="main-tab">Timeline</button>
          <button className="main-tab">Notes</button>
          <button className="main-tab">Files</button>
          <button className="main-tab">Members</button>
          <div className="tab-spacer" />
          <BoardStats tasks={tasks} />
        </div>

        {/* Filter bar */}
        {showFilterBar && (
          <FilterBar
            members={members} labels={labels}
            priority={filterPriority} assigneeId={filterAssignee} labelId={filterLabel}
            onPriority={setFilterPriority} onAssignee={setFilterAssignee} onLabel={setFilterLabel}
            onClear={clearFilters}
          />
        )}

        {/* Board */}
        {loading ? (
          <div className="board-loading">
            <div className="loading-spinner" />
          </div>
        ) : (
          <Board
            tasks={tasks}
            onMoveTask={moveTask}
            onAddTask={status => setCreateStatus(status)}
            onTaskClick={setSelectedTask}
            onTaskMenu={handleTaskMenu}
          />
        )}
      </main>

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          members={members}
          labels={labels}
          userId={user?.id ?? ''}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onUpdateAssignees={handleUpdateTaskAssignees}
          onUpdateLabels={updateTaskLabels}
          onCommentAdded={incrementTaskCommentCount}
          onCreateLabel={handleCreateLabel}
          onUpdateLabel={handleUpdateLabel}
          onDeleteLabel={handleDeleteLabel}
        />
      )}

      {/* Create Task Modal */}
      {createStatus && (
        <CreateTaskModal
          defaultStatus={createStatus}
          members={members}
          labels={labels}
          onClose={() => setCreateStatus(null)}
          onSubmit={handleCreateTask}
          onCreateLabel={handleCreateLabel}
          onUpdateLabel={handleUpdateLabel}
          onDeleteLabel={handleDeleteLabel}
        />
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onSubmit={addMember}
        />
      )}

      {/* Context Menu */}
      {taskMenuTarget && (
        <>
          <div className="ctx-backdrop" onClick={() => setTaskMenuTarget(null)} />
          <div className="ctx-menu" style={{ top: taskMenuTarget.y, left: taskMenuTarget.x }}>
            <button className="ctx-item" onClick={() => { setSelectedTask(taskMenuTarget.task); setTaskMenuTarget(null); }}>Open Detail</button>
            <button className="ctx-item ctx-danger" onClick={() => { deleteTask(taskMenuTarget.task.id); setTaskMenuTarget(null); }}>Delete Task</button>
          </div>
        </>
      )}
    </div>
  );
}
