import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Member, Label, TaskPriority } from '../../types';

interface Props {
  members: Member[];
  labels: Label[];
  priority: TaskPriority | '';
  assigneeId: string;
  labelId: string;
  onPriority: (v: TaskPriority | '') => void;
  onAssignee: (v: string) => void;
  onLabel: (v: string) => void;
  onClear: () => void;
}

/** Displays the active board filters for priority, assignee, and label. */
export function FilterBar({ members, labels, priority, assigneeId, labelId, onPriority, onAssignee, onLabel, onClear }: Props) {
  const hasFilter = priority || assigneeId || labelId;

  return (
    <div className="filter-bar">
      <SlidersHorizontal size={14} className="filter-icon" />
      <select className="filter-select" value={priority} onChange={e => onPriority(e.target.value as TaskPriority | '')}>
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="normal">Normal</option>
        <option value="low">Low</option>
      </select>
      <select className="filter-select" value={assigneeId} onChange={e => onAssignee(e.target.value)}>
        <option value="">All Assignees</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <select className="filter-select" value={labelId} onChange={e => onLabel(e.target.value)}>
        <option value="">All Labels</option>
        {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      {hasFilter && (
        <button className="filter-clear" onClick={onClear}><X size={12} /> Clear</button>
      )}
    </div>
  );
}
