import React, { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import type { Task, TaskStatus, Column as ColumnType } from '../../types';
import { Column } from './Column';

const COLUMNS: ColumnType[] = [
  { id: 'todo',        title: 'To Do',      color: '#6b7280', dotColor: '#9ca3af' },
  { id: 'in_progress', title: 'In Progress', color: '#f59e0b', dotColor: '#f59e0b' },
  { id: 'in_review',   title: 'In Review',   color: '#6366f1', dotColor: '#818cf8' },
  { id: 'done',        title: 'Done',        color: '#10b981', dotColor: '#34d399' },
];

interface BoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: TaskStatus, newPosition: number) => void;
  onAddTask: (status: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
  onTaskMenu: (task: Task, e: React.MouseEvent) => void;
}

/** Renders the board columns and translates drag events into persisted task positions. */
export function Board({ tasks, onMoveTask, onAddTask, onTaskClick, onTaskMenu }: BoardProps) {
  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const destStatus = destination.droppableId as TaskStatus;
    const destTasks = getColumnTasks(destStatus).filter(t => t.id !== draggableId);
    // Use gaps between neighboring positions so most reorders only update one row.
    const newPos = destTasks.length === 0
      ? 1000
      : destination.index === 0
        ? destTasks[0].position - 500
        : destination.index >= destTasks.length
          ? destTasks[destTasks.length - 1].position + 1000
          : (destTasks[destination.index - 1].position + destTasks[destination.index].position) / 2;
    onMoveTask(draggableId, destStatus, newPos);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="board-container">
        {COLUMNS.map(col => (
          <Column
            key={col.id}
            column={col}
            tasks={getColumnTasks(col.id)}
            onAddTask={() => onAddTask(col.id)}
            onTaskClick={onTaskClick}
            onTaskMenu={onTaskMenu}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

export { COLUMNS };
