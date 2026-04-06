import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import type { Task, Column as ColumnType } from '../../types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
  onTaskMenu: (task: Task, e: React.MouseEvent) => void;
}

/** Displays one status column and its draggable task cards. */
export function Column({ column, tasks, onAddTask, onTaskClick, onTaskMenu }: ColumnProps) {
  return (
    <div className="kanban-column">
      <div className="column-header">
        <div className="column-title-row">
          <span className="column-dot" style={{ backgroundColor: column.dotColor }} />
          <span className="column-title">{column.title}</span>
          <span className="column-count">{tasks.length}</span>
        </div>
        <button className="column-add-btn" onClick={onAddTask} title={`Add task to ${column.title}`}>
          <Plus size={14} />
        </button>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-tasks ${snapshot.isDraggingOver ? 'drop-active' : ''}`}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                  >
                    <TaskCard
                      task={task}
                      isDragging={snap.isDragging}
                      onClick={() => onTaskClick(task)}
                      onMenuClick={(e) => onTaskMenu(task, e)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="column-empty">
                <p>No tasks yet</p>
                <button className="column-empty-add" onClick={onAddTask}>+ Add task</button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
