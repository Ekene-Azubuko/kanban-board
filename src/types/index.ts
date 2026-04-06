export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface Member {
  id: string;
  name: string;
  email?: string;
  user_id: string;
  avatar_color: string;
  avatar_initials: string;
  created_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assignee_id?: string;
  assignee_ids?: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
  position: number;
  assignee?: Member;
  assignees?: Member[];
  labels?: Label[];
  comment_count?: number;
  attachment_count?: number;
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
}

export interface TaskAssignee {
  task_id: string;
  member_id: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  field_name?: string;
  created_at: string;
}

export interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  dotColor: string;
}
