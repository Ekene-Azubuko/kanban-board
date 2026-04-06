import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Member, Label, TaskStatus, TaskPriority } from '../../types';
import { ManageLabelsModal } from './ManageLabelsModal';
import { MemberPicker } from '../UI/MemberPicker';

interface Props {
  defaultStatus: TaskStatus;
  members: Member[];
  labels: Label[];
  onClose: () => void;
  onSubmit: (data: {
    title: string; description?: string; priority: TaskPriority;
    due_date?: string; assigneeIds?: string[]; status: TaskStatus; labelIds: string[];
  }) => void;
  onCreateLabel: (name: string, color: string) => Promise<Label | undefined>;
  onUpdateLabel: (labelId: string, updates: Pick<Label, 'name' | 'color'>) => Promise<Label | undefined>;
  onDeleteLabel: (labelId: string) => Promise<void>;
}

/** Collects the inputs needed to create a new task in a chosen column. */
export function CreateTaskModal({
  defaultStatus,
  members,
  labels,
  onClose,
  onSubmit,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showManageLabels, setShowManageLabels] = useState(false);

  /** Toggles a label chip in the local selection list. */
  const toggleLabel = (id: string) => setSelectedLabels(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  /** Toggles a member chip in the local assignee list. */
  const toggleAssignee = (memberId: string) => setAssigneeIds(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);

  useEffect(() => {
    // Remove labels that were deleted while the modal is still open.
    setSelectedLabels(prev => prev.filter(labelId => labels.some(label => label.id === labelId)));
  }, [labels]);

  useEffect(() => {
    // Remove assignees that no longer exist while the modal is still open.
    setAssigneeIds(prev => prev.filter(memberId => members.some(member => member.id === memberId)));
  }, [members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit({
      title: title.trim(), description: description || undefined, priority,
      due_date: dueDate || undefined, assigneeIds: assigneeIds.length ? assigneeIds : undefined,
      status, labelIds: selectedLabels
    });
    onClose();
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Create Task</h2>
            <button className="icon-btn" onClick={onClose}><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="modal-form">
            <label className="field-label">Title *</label>
            <input className="field-input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Task title..." autoFocus required />

            <label className="field-label">Description</label>
            <textarea className="field-input field-textarea" value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={3} />

            <div className="form-row">
              <div className="form-col">
                <label className="field-label">Status</label>
                <select className="field-input field-select" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-col">
                <label className="field-label">Priority</label>
                <select className="field-input field-select" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <label className="field-label">Assignees</label>
                <MemberPicker
                  members={members}
                  selectedIds={assigneeIds}
                  onToggle={toggleAssignee}
                  emptyMessage="Add team members first to assign this task."
                />
              </div>
              <div className="form-col">
                <label className="field-label">Due Date</label>
                <input type="date" className="field-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="label-section-head">
              <label className="field-label">Labels</label>
              <button type="button" className="label-manage-trigger" onClick={() => setShowManageLabels(true)}>
                <Plus size={12} /> New label
              </button>
            </div>
            {labels.length > 0 ? (
              <div className="label-picker">
                {labels.map(l => (
                  <button type="button" key={l.id}
                    className={`label-chip ${selectedLabels.includes(l.id) ? 'selected' : ''}`}
                    style={{ '--label-color': l.color } as React.CSSProperties}
                    onClick={() => toggleLabel(l.id)}>
                    {l.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="label-picker-empty">
                <p>No labels yet.</p>
                <button type="button" className="btn-secondary" onClick={() => setShowManageLabels(true)}>
                  <Plus size={12} /> Add first label
                </button>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!title.trim() || submitting}>
                {submitting ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </form>
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
            setSelectedLabels(prev => prev.includes(labelId) ? prev : [...prev, labelId]);
          }}
        />
      )}
    </>
  );
}
