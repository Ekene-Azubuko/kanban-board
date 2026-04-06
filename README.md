# Kanban Board

A polished Kanban board built with React, TypeScript, Vite, and Supabase. This project delivers a feature-rich Kanban board with thoughtful UX and a backend model that is simple, secure, and easy to reason about. It covers the full advanced feature set from the prompt while keeping the implementation approachable through a React frontend and Supabase-powered data layer.

The app is designed around a few core decisions:
- Supabase is used directly from the frontend to keep the architecture simple and to let Row Level Security enforce per-user access.
- Anonymous auth removes onboarding friction so a user can land on the board and start working immediately.
- Task ordering uses floating-point `position` values so cards can be reordered without expensive full-list rewrites.
- Optimistic UI updates keep task creation and edits feeling instant by updating local state immediately and syncing with Supabase in the background, so users do not need to wait for a full refresh to see changes.
- The task detail panel concentrates editing, comments, labels, and history in one place so the board stays visually lightweight.

## Links

- Live frontend app: [https://kanban-board-one-jade.vercel.app/](https://kanban-board-one-jade.vercel.app/)
- GitHub repository: [https://github.com/Ekene-Azubuko/kanban-board](https://github.com/Ekene-Azubuko/kanban-board)

## Tech Stack

- React
- TypeScript
- Vite
- Supabase
- `@hello-pangea/dnd` for drag and drop
- `date-fns` for date formatting and due-date indicators

## Advanced Features Built

This project includes all of the advanced features given in the pdf.

### 1. Team Members and Assignees

- Users can create team members with a name and optional email.
- Each member gets an avatar color and initials for quick visual identification.
- Members appear in the board UI header and in task assignment controls.
- A task can have one or more assignees.
- Assignee avatars are shown directly on task cards.

How it works:
- Team members are stored in the `members` table.
- Multi-assignee support is stored in the `task_assignees` junction table.
- The task detail view uses a member picker to toggle assignees on and off.

### 2. Task Comments

- Users can open a task detail panel and write comments.
- Comments are shown in chronological order with timestamps.
- Comments are stored separately from tasks in Supabase.

How it works:
- Comments live in the `comments` table.
- The task detail panel loads comments for the selected task and allows inline comment creation.

### 3. Task Activity Log

- The app tracks key task changes such as creation, status changes, edits, and assignment updates.
- Activity is displayed as a timeline in the task detail panel.
- This makes it easy to understand how a task changed over time.

How it works:
- Activity entries are stored in the `activity_logs` table.
- Logs are written when tasks are created, moved between columns, or updated in important fields.

### 4. Labels and Tags

- Users can create custom labels such as `Bug`, `Feature`, or `Design`.
- Tasks can have multiple labels.
- The board can be filtered by label.

How it works:
- Labels are stored in the `labels` table.
- Task-to-label relationships are stored in `task_labels`.
- Labels can be added or removed from the task detail panel.

### 5. Due Date Indicators

- Tasks due soon or overdue are highlighted directly on the task card.
- Urgency is communicated with color and icon treatment.

How it works:
- Due dates are stored on the `tasks` table.
- The UI checks whether a date is today, tomorrow, or in the past and applies the correct visual state.

### 6. Search and Filtering

- Users can search tasks by title.
- Users can filter by priority, assignee, and label.

How it works:
- Filter state is managed and passed into the task hook.
- Matching is applied against the fetched task list so the board updates instantly.

### 7. Board Summary and Stats

- The board header shows a compact summary of progress.
- It includes total tasks, completed tasks, overdue tasks, and completion percentage.

How it works:
- Stats are derived from the current task list and rendered in a lightweight summary component in the header.

## Extra Features Beyond the Advanced List

- Realtime task syncing through Supabase Realtime
- Optimistic UI updates for a snappier editing experience

## Database Schema
The database structure is:

### `members`

Stores team members created by a specific user.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Owner of the member record |
| `name` | `text` | Member display name |
| `email` | `text` | Optional email |
| `avatar_color` | `text` | Avatar background color |
| `avatar_initials` | `text` | Avatar initials |
| `created_at` | `timestamptz` | Creation timestamp |

### `labels`

Stores custom labels created by a specific user.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Owner of the label |
| `name` | `text` | Label name |
| `color` | `text` | Label color |
| `created_at` | `timestamptz` | Creation timestamp |

### `tasks`

Stores the main Kanban cards.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `title` | `text` | Task title |
| `description` | `text` | Task description |
| `status` | `text` | Column state: `todo`, `in_progress`, `in_review`, `done` |
| `priority` | `text` | Priority: `low`, `normal`, `high` |
| `due_date` | `date` | Optional due date |
| `assignee_id` | `uuid` | Primary assignee reference |
| `user_id` | `uuid` | Task owner |
| `position` | `float8` | Used for drag-and-drop ordering |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

### `task_assignees`

Junction table that supports multiple assignees per task.

| Column | Type | Purpose |
| --- | --- | --- |
| `task_id` | `uuid` | Linked task |
| `member_id` | `uuid` | Linked member |
| `created_at` | `timestamptz` | Creation timestamp |

### `task_labels`

Junction table that supports multiple labels per task.

| Column | Type | Purpose |
| --- | --- | --- |
| `task_id` | `uuid` | Linked task |
| `label_id` | `uuid` | Linked label |

### `comments`

Stores task discussion.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `task_id` | `uuid` | Linked task |
| `user_id` | `uuid` | Comment author |
| `content` | `text` | Comment body |
| `author_name` | `text` | Display name shown in UI |
| `created_at` | `timestamptz` | Creation timestamp |

### `attachments`

Stub table for attachment metadata and attachment counts.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `task_id` | `uuid` | Linked task |
| `user_id` | `uuid` | Owner |
| `name` | `text` | File name |
| `url` | `text` | File URL |
| `created_at` | `timestamptz` | Creation timestamp |

### `activity_logs`

Stores the change history for each task.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `task_id` | `uuid` | Linked task |
| `user_id` | `uuid` | User who made the change |
| `action` | `text` | Action type such as `created`, `updated`, `moved` |
| `field_name` | `text` | Field that changed |
| `old_value` | `text` | Previous value |
| `new_value` | `text` | New value |
| `created_at` | `timestamptz` | Log timestamp |

### Security Model

- Anonymous auth creates a guest user automatically.
- Every user-owned table uses `user_id` to scope access.
- Supabase Row Level Security ensures users can only read and modify their own tasks, members, labels, comments, and logs.

## Setup Instructions to Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a new Supabase project, then copy:
- Project URL
- Anon/public API key

### 3. Enable anonymous sign-in

In Supabase:
- Go to `Authentication`
- Open `Providers`
- Enable `Anonymous Sign-Ins`

### 4. Log in to the Supabase CLI

```bash
npx supabase login
```

### 5. Link this repo to your remote Supabase project

Run:

```bash
npx supabase link --project-ref your_project_ref
```

You can find the project ref in the Supabase dashboard URL or in `Project Settings`.

### 6. Apply the database migrations

```bash
npm run db:push
```

This applies the versioned SQL migration in `supabase/migrations` to your hosted database.

### 7. Add environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 8. Start the app

```bash
npm run dev
```

Then open `http://localhost:5173`.

### 9. Optional production build

```bash
npm run build
npm run preview
```

## Project Structure

```text
src/
├── components/
│   ├── Board/         # Board, columns, task cards
│   ├── Modals/        # Create task, filter bar, stats, label management
│   ├── Sidebar/       # App sidebar and task detail panel
│   └── UI/            # Reusable UI primitives like avatars and badges
├── hooks/             # Supabase-backed hooks for tasks, auth, comments, labels, members
├── lib/               # Supabase client setup
└── types/             # Shared TypeScript types

supabase/
├── config.toml        # Supabase CLI project config
├── migrations/        # Versioned database migrations
└── seed.sql           # Optional seed entry point
```

## Tradeoffs and What I Would Improve With More Time

- Search and filtering are currently driven from the client-side task list. Moving more of that logic server-side would scale better for large boards.
- Floating-point task positions make drag-and-drop simple, but they eventually need rebalancing after many moves.
- Anonymous auth is great for reducing friction, but named accounts and true multi-user collaboration would be better for a production product.
- Realtime currently refetches task data after changes. A more selective cache update strategy would reduce network traffic.
- The `attachments` table is present, but file upload and Supabase Storage are not fully wired into the UI yet.
- The app is strong on core board workflows, but it could go further with keyboard shortcuts, offline support, notifications, and richer analytics.
