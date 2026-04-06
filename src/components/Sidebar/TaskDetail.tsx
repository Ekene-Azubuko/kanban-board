import React, { useState, useEffect } from 'react';
import { X, Timer, Edit3, ExternalLink, Calendar, Flag, Tag, User, Send, Plus } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import type { Task, Member, Label, TaskStatus, TaskPriority } from '../../types';
import { PriorityBadge } from '../UI/PriorityBadge';
import { MemberPicker } from '../UI/MemberPicker';
import { useComments } from '../../hooks/useComments';
import { useActivityLog } from '../../hooks/useActivityLog';
import { ManageLabelsModal } from '../Modals/ManageLabelsModal';

interface Props {
  task: Task;
  members: Member[];
  labels: Label[];
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>, old: Task) => void;
  onUpdateAssignees: (taskId: string, assigneeIds: string[], old: Task) => void;
  onUpdateLabels: (taskId: string, labelIds: string[]) => void;
  onCommentAdded: (taskId: string) => void;
  onCreateLabel: (name: string, color: string) => Promise<Label | undefined>;
  onUpdateLabel: (labelId: string, updates: Pick<Label, 'name' | 'color'>) => Promise<Label | undefined>;
  onDeleteLabel: (labelId: string) => Promise<void>;
  userId: string;
}

type Tab = 'description' | 'comments' | 'activities';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done'
};

/** Shows the editable task sidebar, comments, and activity history. */
export function TaskDetail({
  task,
  members,
  labels,
  onClose,
  onUpdate,
  onUpdateAssignees,
  onUpdateLabels,
  onCommentAdded,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  userId,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('description');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState(task.description ?? '');
  const [commentText, setCommentText] = useState('');
  const [showManageLabels, setShowManageLabels] = useState(false);
  const { comments, addComment } = useComments(task.id);
  const { logs } = useActivityLog(task.id);
  const currentLabels = task.labels?.map(l => l.id) ?? [];

  useEffect(() => {
    // Reset local inputs whenever the user opens a different task.
    setTitleVal(task.title);
    setDescVal(task.description ?? '');
  }, [task.id]);

  const handleTitleSave = () => {
    if (titleVal.trim() && titleVal !== task.title) onUpdate(task.id, { title: titleVal.trim() }, task);
    setEditingTitle(false);
  };

  const handleDescSave = () => {
    if (descVal !== task.description) onUpdate(task.id, { description: descVal }, task);
    setEditingDesc(false);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { status: e.target.value as TaskStatus }, task);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { priority: e.target.value as TaskPriority }, task);
  };

  const handleAssigneeToggle = (memberId: string) => {
    const nextAssigneeIds = task.assignee_ids?.includes(memberId)
      ? (task.assignee_ids ?? []).filter(id => id !== memberId)
      : [...(task.assignee_ids ?? []), memberId];
    onUpdateAssignees(task.id, nextAssigneeIds, task);
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(task.id, { due_date: e.target.value || undefined }, task);
  };

  const toggleLabel = (labelId: string) => {
    const next = currentLabels.includes(labelId)
      ? currentLabels.filter(id => id !== labelId)
      : [...currentLabels, labelId];
    onUpdateLabels(task.id, next);
  };

  const sendComment = async () => {
    if (!commentText.trim()) return;
    await addComment(commentText.trim(), userId, 'Guest');
    // Keep the card count in sync without waiting for the next board refetch.
    onCommentAdded(task.id);
    setCommentText('');
  };

  const due = task.due_date ? new Date(task.due_date) : null;
  const overdue = due && isPast(due) && !isToday(due);

  return (
    <>
      <div className="task-detail-overlay" onClick={onClose}>
        <div className="task-detail-panel" onClick={e => e.stopPropagation()}>
          {/* Top toolbar */}
          <div className="detail-toolbar">
            <div className="detail-toolbar-left">
              <button className="icon-btn"><Timer size={15} /></button>
              <button className="icon-btn"><Edit3 size={15} /></button>
              <button className="icon-btn"><ExternalLink size={15} /></button>
            </div>
            <button className="icon-btn" onClick={onClose}><X size={15} /></button>
          </div>

          {/* Title */}
          <div className="detail-title-wrap">
            {editingTitle ? (
              <textarea
                className="detail-title-input"
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleSave(); }}}
                autoFocus
              />
            ) : (
              <h2 className="detail-title" onClick={() => setEditingTitle(true)}>{task.title}</h2>
            )}
          </div>

          {/* Properties */}
          <div className="detail-props">
            <div className="detail-prop-row">
              <span className="prop-label"><User size={13} />Assignees</span>
              <div className="prop-value">
                <MemberPicker
                  members={members}
                  selectedIds={task.assignee_ids ?? []}
                  onToggle={handleAssigneeToggle}
                  emptyMessage="Add team members first to assign this task."
                />
              </div>
            </div>

            <div className="detail-prop-row">
              <span className="prop-label"><Flag size={13} />Status</span>
              <div className="prop-value">
                <select className="prop-select" value={task.status} onChange={handleStatusChange}>
                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="detail-prop-row">
              <span className="prop-label"><Calendar size={13} />Due Date</span>
              <div className="prop-value">
                <input type="date" className={`prop-select ${overdue ? 'overdue-text' : ''}`}
                  value={task.due_date ?? ''} onChange={handleDueDateChange} />
              </div>
            </div>

            <div className="detail-prop-row">
              <span className="prop-label"><Flag size={13} />Priority</span>
              <div className="prop-value">
                <PriorityBadge priority={task.priority} />
                <select className="prop-select" value={task.priority} onChange={handlePriorityChange}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="detail-prop-row">
              <span className="prop-label"><Tag size={13} />Tags</span>
              <div className="prop-value prop-tags">
                {labels.map(l => (
                  <button
                    key={l.id}
                    className={`tag-toggle ${currentLabels.includes(l.id) ? 'tag-active' : ''}`}
                    style={{ '--label-color': l.color } as React.CSSProperties}
                    onClick={() => toggleLabel(l.id)}>
                    {l.name}
                  </button>
                ))}
                <button type="button" className="tag-add-btn" onClick={() => setShowManageLabels(true)}>
                  <Plus size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="detail-tabs">
            {(['description', 'comments', 'activities'] as Tab[]).map(t => (
              <button key={t} className={`detail-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'comments' && comments.length > 0 && <span className="tab-badge">{comments.length}</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="detail-content">
            {activeTab === 'description' && (
              <div className="tab-description">
                {editingDesc ? (
                  <textarea className="desc-input" value={descVal}
                    onChange={e => setDescVal(e.target.value)}
                    onBlur={handleDescSave}
                    placeholder="Add a description…"
                    autoFocus rows={8} />
                ) : (
                  <div className="desc-text" onClick={() => setEditingDesc(true)}>
                    {descVal ? descVal.split('\n').map((p, i) => <p key={i}>{p}</p>) : (
                      <span className="desc-placeholder">Click to add a description…</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="tab-comments">
                <div className="comments-list">
                  {comments.length === 0 && <p className="empty-state">No comments yet.</p>}
                  {comments.map(c => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-avatar">
                        <div className="avatar" style={{ width: 28, height: 28, backgroundColor: '#6366f1', fontSize: 11 }}>
                          {(c.author_name ?? 'G')[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="comment-body">
                        <div className="comment-meta">
                          <span className="comment-author">{c.author_name ?? 'Guest'}</span>
                          <span className="comment-time">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="comment-text">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="comment-input-row">
                  <input className="comment-input" placeholder="Write a comment…"
                    value={commentText} onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendComment(); }} />
                  <button className="comment-send" onClick={sendComment}><Send size={14} /></button>
                </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div className="tab-activities">
                {logs.length === 0 && <p className="empty-state">No activity yet.</p>}
                {logs.map(log => (
                  <div key={log.id} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-body">
                      <span className="activity-action">
                        {log.action === 'created' && `Task created`}
                        {log.action === 'updated' && log.field_name && `Updated ${log.field_name}: `}
                        {log.action === 'moved' && `Moved from ${log.old_value} → ${log.new_value}`}
                      </span>
                      {log.action === 'updated' && log.new_value && (
                        <span className="activity-value">{log.old_value} → {log.new_value}</span>
                      )}
                      <span className="activity-time">{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showManageLabels && (
        <ManageLabelsModal
          labels={labels}
          onClose={() => setShowManageLabels(false)}
          onCreate={onCreateLabel}
          onUpdate={onUpdateLabel}
          onDelete={onDeleteLabel}
          onSelectLabel={labelId => {
            if (!currentLabels.includes(labelId)) {
              // Newly created labels can be attached immediately from this modal.
              onUpdateLabels(task.id, [...currentLabels, labelId]);
            }
          }}
        />
      )}
    </>
  );
}
