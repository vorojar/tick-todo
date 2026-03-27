# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tick Todo — a lightweight VS Code sidebar extension for managing personal todos with subtasks, priorities, markdown notes, and drag-and-drop reordering. Data is stored locally in `~/.tick-todo/`.

## Build & Package

```bash
npm run build                    # Compile TypeScript
npm run watch                    # Watch mode
npx vsce package --allow-missing-repository   # Package .vsix
antigravity --install-extension tick-todo-X.Y.Z.vsix  # Install to Antigravity
```

**Critical**: Every code change requires a version bump in `package.json` before packaging — same-version installs are silently ignored.

## Architecture

Three source files with clear separation:

- **`src/extension.ts`** — Entry point. Registers all commands, creates TreeViews, manages badge count, wires up file change listeners.
- **`src/todoProvider.ts`** — `PendingProvider` (implements TreeDataProvider + TreeDragAndDropController) and `DoneProvider`. Handles rendering, priority icons, note indicators, and drag-and-drop.
- **`src/todoStore.ts`** — EventEmitter-based store. All CRUD, reordering, priority, and note operations. Reads/writes `~/.tick-todo/todo.json` and `~/.tick-todo/notes/*.md`. Watches the directory for external changes.

Data flow: Command → Store (mutate JSON) → file write → fs.watch fires `change` event → Providers refresh → TreeView re-renders.

## Data Model

```typescript
type Priority = "high" | "medium" | "low" | "none";

interface TodoItem {
  id?: string;           // Generated ID, used for note file naming
  text: string;
  done: boolean;
  priority?: Priority;
  createdAt: string;     // ISO 8601
  doneAt?: string;
  children?: TodoItem[]; // One level only, no nested subtasks
}
```

## Key Behaviors

- Subtasks are one level deep only (no nesting).
- Completing all children auto-completes the parent.
- Completed children stay visible under their parent in pending view (gray dot icon, with undo button).
- Items are identified by `text + createdAt` pair for matching (not by array index).
- `done-child` contextValue controls which inline buttons appear (no "complete" button on already-done items).
- Note files are created on first click with `# {title}\n\n` template.

## Extension IDs

The internal viewContainer/view IDs use `clitodo` prefix (legacy), while the package name is `tick-todo`. Don't rename the internal IDs as it would break existing installations.
