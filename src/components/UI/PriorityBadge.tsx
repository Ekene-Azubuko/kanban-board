import React from 'react';
import type { TaskPriority } from '../../types';

const cfg: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  normal: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  low: { label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

/** Shows the task priority with a consistent color treatment. */
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, color, bg } = cfg[priority];
  return (
    <span className="priority-badge" style={{ color, backgroundColor: bg, border: `1px solid ${color}30` }}>
      <span className="priority-dot" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
