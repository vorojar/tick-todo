# Tick Todo

Lightweight sidebar todo manager for VS Code.

## Features

- Sidebar panel with pending and completed sections
- Subtasks with progress indicator `[1/3]`
- Priority levels (high / medium / low) with colored icons
- Markdown notes — click any item to open its note file
- Note indicator (☰) and hover preview for items with notes
- Drag-and-drop reordering
- Badge notification on the activity bar icon
- Undo complete — restore completed items back to pending
- Delete confirmation to prevent accidents
- Completed subtasks stay visible under parent with subtle styling
- Data stored in `~/.tick-todo/todo.json` (portable, plain JSON)

## Usage

Click the **Tick Todo** icon in the activity bar to open the sidebar.

| Action | How |
|--------|-----|
| Add todo | Click **+** in the panel header |
| Add subtask | Click **+** on a todo item |
| Complete | Click **checkmark** on an item |
| Undo complete | Click **undo** on a completed item |
| Delete | Click **trash** on an item |
| Edit | Right-click > "Edit" |
| Set priority | Right-click > choose priority level |
| Reorder | Drag and drop items |
| Open note | Click on any item |

When all subtasks are completed, the parent task is automatically marked as done.

## Data

All todos are stored in `~/.tick-todo/todo.json` as plain JSON. Notes are stored as Markdown files in `~/.tick-todo/notes/`.
