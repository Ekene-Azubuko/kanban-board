import React from 'react';
import { CheckCircle2, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { isPast, isToday } from 'date-fns';
import type { Task } from '../../types';

/** Summarizes board progress from the currently visible task list. */
export function BoardStats({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="board-stats">
      <div className="stat-item"><BarChart3 size={13} /><span>{total} total</span></div>
      <div className="stat-item stat-done"><CheckCircle2 size={13} /><span>{done} done</span></div>
      {overdue > 0 && <div className="stat-item stat-overdue"><AlertCircle size={13} /><span>{overdue} overdue</span></div>}
      <div className="stat-progress">
        <div className="stat-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-pct">{pct}%</span>
    </div>
  );
}
