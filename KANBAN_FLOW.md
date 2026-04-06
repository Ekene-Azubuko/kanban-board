# Kanban Board — User Interaction & Database Flow

## 1. App Launch / Guest Session

**What happens:**
- `useAuth` calls `ensureGuestSession()`
- Checks for an existing Supabase session
- If none exists, calls `supabase.auth.signInAnonymously()`
- Supabase creates a new anonymous user in `auth.users`
- The `user.id` (UUID) is stored in React state and passed to `useTasks`

**Database:**
- A new row is created in `auth.users` with `is_anonymous = true`
- All subsequent tasks are tied to this `user_id`
- RLS ensures the user only sees rows where `user_id = auth.uid()`

---

## 2. Board Loads

**What happens:**
- `useTasks` fires a Supabase query:
  ```
  SELECT tasks.*, members.*, labels.*, COUNT(comments), COUNT(attachments)
  FROM tasks
  LEFT JOIN members ON tasks.assignee_id = members.id
  LEFT JOIN task_labels ON tasks.id = task_labels.task_id
  LEFT JOIN labels ON task_labels.label_id = labels.id
  WHERE tasks.user_id = <current_user_id>
  ORDER BY position ASC
  ```
- Tasks are grouped into columns by `status`
- A Supabase Realtime subscription is opened on the `tasks` table

**Database:** Read-only SELECT, filtered by RLS

---

## 3. Creating a Task

**User action:** Clicks `+` on a column → fills the modal → clicks "Create Task"

**What happens:**
1. `createTask()` calculates `position = max(existing positions in column) + 1000`
2. Inserts a new row into `tasks`
3. If labels were selected, inserts rows into `task_labels`
4. Inserts a row into `activity_logs` with `action = 'created'`
5. Refetches the task list

**Database writes:**
```sql
INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, user_id, position)
VALUES (...);

INSERT INTO task_labels (task_id, label_id) VALUES (...);  -- for each label

INSERT INTO activity_logs (task_id, user_id, action, field_name, new_value)
VALUES (task_id, uid, 'created', 'task', title);
```

---

## 4. Dragging a Task Between Columns

**User action:** Drags a task card and drops it into a different column

**What happens:**
1. `@hello-pangea/dnd` fires `onDragEnd` with `source` and `destination`
2. `handleDragEnd` calculates the new `position` based on surrounding tasks:
   - If dropped at index 0: `position = firstTask.position - 500`
   - If dropped at end: `position = lastTask.position + 1000`
   - Otherwise: `position = (prevTask.position + nextTask.position) / 2`
3. `moveTask()` updates the task in Supabase
4. If status changed, inserts an activity log row

**Database write:**
```sql
UPDATE tasks
SET status = 'in_progress', position = 2500.0, updated_at = now()
WHERE id = task_id;

INSERT INTO activity_logs (task_id, user_id, action, field_name, old_value, new_value)
VALUES (task_id, uid, 'moved', 'status', 'todo', 'in_progress');
```

---

## 5. Opening a Task Detail Sidebar

**User action:** Clicks a task card

**What happens:**
1. The clicked `Task` object is stored in `selectedTask` state
2. `TaskDetail` panel slides in from the right
3. `useComments(task.id)` fetches comments for this task
4. `useActivityLog(task.id)` fetches the activity log

**Database:**
```sql
SELECT * FROM comments WHERE task_id = task_id ORDER BY created_at ASC;
SELECT * FROM activity_logs WHERE task_id = task_id ORDER BY created_at DESC;
```

---

## 6. Editing Task Properties (Inline)

**User actions (all in the sidebar):**
- Click title → editable textarea → blur/Enter saves
- Change Status dropdown → saves immediately
- Change Priority dropdown → saves immediately
- Change Assignee dropdown → saves immediately
- Change Due Date → saves immediately

**What happens for each:**
1. `onUpdate(taskId, { field: newValue }, oldTask)` called
2. `updateTask` sends a PATCH to Supabase
3. Compares old vs new value — if different, logs to `activity_logs`
4. `selectedTask` state is updated optimistically

**Database:**
```sql
UPDATE tasks SET status = 'done', updated_at = now() WHERE id = task_id;
INSERT INTO activity_logs (...) VALUES ('updated', 'status', 'in_review', 'done');
```

---

## 7. Adding / Removing Labels

**User action:** Clicks a tag pill in the task detail sidebar

**What happens:**
1. Toggles the label ID in the local array
2. Calls `updateTaskLabels(taskId, newLabelIds)`
3. Deletes all existing `task_labels` rows for this task
4. Re-inserts only the selected ones

**Database:**
```sql
DELETE FROM task_labels WHERE task_id = task_id;
INSERT INTO task_labels (task_id, label_id) VALUES (...);  -- for each selected
```

---

## 8. Adding a Comment

**User action:** Types in the comment box and presses Enter or the send button

**What happens:**
1. `addComment(content, userId, authorName)` called
2. Inserts a row into `comments`
3. Comment appears instantly in the list (optimistic local state update)
4. `comment_count` on the card updates after next refetch

**Database:**
```sql
INSERT INTO comments (task_id, user_id, content, author_name)
VALUES (task_id, uid, 'Comment text', 'Guest');
```

---

## 9. Search & Filtering

**User action:** Types in the sidebar search box, or opens Filter and selects values

**What happens:**
- The `filters` object is updated in state
- `useTasks` re-runs its query with the new filter values applied:
  - `search` → `.ilike('title', '%term%')`
  - `priority` → `.eq('priority', 'high')`
  - `assigneeId` → `.eq('assignee_id', memberId)`
  - `labelId` → client-side filter (after fetching) on `task.labels`

**No additional DB writes** — read-only filtering

---

## 10. Adding a Team Member

**User action:** Clicks "Add Member" → fills name/email → submits

**What happens:**
1. Generates a random avatar color and derives initials from the name
2. Inserts into `members`
3. Member immediately appears in the header avatar stack and all assignee dropdowns

**Database:**
```sql
INSERT INTO members (name, email, avatar_color, avatar_initials)
VALUES ('Jane Doe', 'jane@co.com', '#10b981', 'JD');
```

---

## 11. Deleting a Task

**User action:** Right-clicks a task card → "Delete Task"

**What happens:**
1. `deleteTask(taskId)` sends a DELETE to Supabase
2. Cascade deletes: `task_labels`, `comments`, `attachments`, `activity_logs`
3. Task removed from local state immediately

**Database:**
```sql
DELETE FROM tasks WHERE id = task_id;
-- Cascade removes related rows in task_labels, comments, attachments, activity_logs
```

---

## 12. Realtime Sync

- A Supabase Realtime channel is subscribed to changes on `tasks` filtered by `user_id`
- Any INSERT, UPDATE, or DELETE triggers a `fetchTasks()` refetch
- This means two browser tabs with the same guest session stay in sync automatically
