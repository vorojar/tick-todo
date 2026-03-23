# Tick Todo

Lightweight sidebar todo manager for VS Code.

## Features

- Sidebar panel with pending and completed sections
- Subtasks support with progress indicator `[1/3]`
- Badge notification on the activity bar icon
- Edit, complete, and delete items inline
- Data stored in `~/.claude/todo.json` (portable, plain JSON)

## Usage

Click the **Tick Todo** icon in the activity bar to open the sidebar.

| Action | How |
|--------|-----|
| Add todo | Click **+** in the panel header |
| Add subtask | Click **+** on a todo item, or right-click > "Add subtask" |
| Complete | Click **checkmark** on an item |
| Delete | Click **trash** on an item |
| Edit | Right-click an item > "Edit" |

When all subtasks are completed, the parent task is automatically marked as done.

## Data

All todos are stored in `~/.claude/todo.json` as plain JSON. You can edit this file directly or share it across tools.
