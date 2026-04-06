import React from 'react';
import { MessageSquare, Paperclip, MoreHorizontal, CalendarDays, AlertCircle } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import type { Task } from '../../types';
import { AvatarStack } from '../UI/Avatar';
import { PriorityBadge } from '../UI/PriorityBadge';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onMenuClick: (e: React.MouseEvent) => void;
  isDragging?: boolean;
}

/** Converts a raw due date into the label and urgency state used by the card. */
function dueDateDisplay(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const overdue = isPast(d) && !isToday(d);
  const soon = isToday(d) || isTomorrow(d);
  const label = isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'dd MMM yyyy');
  return { label, overdue, soon };
}

/** Renders the compact task card shown inside each board column. */
export function TaskCard({ task, onClick, onMenuClick, isDragging }: TaskCardProps) {
  const due = dueDateDisplay(task.due_date);
  const assignees = task.assignees ?? (task.assignee ? [task.assignee] : []);

  return (
    <div className={`task-card ${isDragging ? 'dragging' : ''}`} onClick={onClick}>
      {/* Tags row */}
      <div className="task-card-header">
        <div className="task-card-badges">
          <div className="task-card-tags">
            {task.labels?.map(label => (
              <span key={label.id} className="tag-pill" style={{ backgroundColor: label.color + '22', color: label.color, borderColor: label.color + '40' }}>
                {label.name}
              </span>
            ))}
          </div>
          <div className="task-card-priority">
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <button className="card-menu-btn" onClick={onMenuClick}>
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Title */}
      <p className="task-card-title">{task.title}</p>

      {/* Due date */}
      {due && (
        <div className={`task-due-date ${due.overdue ? 'overdue' : due.soon ? 'soon' : ''}`}>
          {due.overdue ? <AlertCircle size={11} /> : <CalendarDays size={11} />}
          <span>Due Date: {due.label}</span>
        </div>
      )}

      <div className="task-card-divider" />

      {/* Footer */}
      <div className="task-card-footer">
        <div className="task-card-assignee">
          {assignees.length > 0 && <AvatarStack members={assignees} max={3} />}
        </div>
        <div className="task-card-meta">
          {(task.attachment_count ?? 0) > 0 && (
            <span className="meta-item"><Paperclip size={11} />{task.attachment_count}</span>
          )}
          {(task.comment_count ?? 0) > 0 && (
            <span className="meta-item"><MessageSquare size={11} />{task.comment_count}</span>
          )}
        </div>
      </div>
    </div>
  );
}
