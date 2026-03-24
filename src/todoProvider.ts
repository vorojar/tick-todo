import * as vscode from "vscode";
import { TodoItem, TodoStore, Priority } from "./todoStore";

/** 用于 TreeView 的节点，包含父项引用信息 */
export interface TodoNode {
  item: TodoItem;
  parent?: TodoItem;
}

const MIME_TYPE = "application/vnd.code.tree.clitodo.pending";

function getPriorityIcon(priority?: Priority): vscode.ThemeIcon {
  switch (priority) {
    case "high":
      return new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("charts.red"));
    case "medium":
      return new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("charts.yellow"));
    case "low":
      return new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("charts.blue"));
    default:
      return new vscode.ThemeIcon("circle-outline");
  }
}

export class PendingProvider
  implements vscode.TreeDataProvider<TodoNode>, vscode.TreeDragAndDropController<TodoNode>
{
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  readonly dropMimeTypes = [MIME_TYPE];
  readonly dragMimeTypes = [MIME_TYPE];

  constructor(private store: TodoStore) {}

  refresh(): void {
    this._onDidChange.fire();
  }

  getTreeItem(node: TodoNode): vscode.TreeItem {
    const { item, parent } = node;

    if (!parent) {
      const pending = this.store.getPending();
      const index = pending.findIndex(
        (i) => i.text === item.text && i.createdAt === item.createdAt
      );
      const progress = this.store.getChildrenProgress(item);
      const label =
        progress.total > 0
          ? `${index + 1}. ${item.text} [${progress.done}/${progress.total}]`
          : `${index + 1}. ${item.text}`;

      const hasChildren = (item.children ?? []).length > 0;
      const ti = new vscode.TreeItem(
        label,
        hasChildren
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.None
      );
      ti.contextValue = "pending";
      ti.iconPath = getPriorityIcon(item.priority);
      ti.command = { command: "clitodo.openNote", title: "打开笔记", arguments: [node] };
      this.applyNote(ti, item);
      return ti;
    } else {
      const allChildren = parent.children ?? [];
      const childIndex = allChildren.findIndex(
        (c) => c.text === item.text && c.createdAt === item.createdAt
      );
      const pending = this.store.getPending();
      const parentIndex = pending.findIndex(
        (i) => i.text === parent.text && i.createdAt === parent.createdAt
      );

      if (item.done) {
        const ti = new vscode.TreeItem(
          `${parentIndex + 1}.${childIndex + 1} ${item.text}`
        );
        ti.contextValue = "done-child";
        ti.iconPath = new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("disabledForeground"));
        return ti;
      }

      const ti = new vscode.TreeItem(
        `${parentIndex + 1}.${childIndex + 1} ${item.text}`
      );
      ti.contextValue = "pending-child";
      ti.iconPath = getPriorityIcon(item.priority);
      ti.command = { command: "clitodo.openNote", title: "打开笔记", arguments: [node] };
      this.applyNote(ti, item);
      return ti;
    }
  }

  private applyNote(ti: vscode.TreeItem, item: TodoItem): void {
    const content = this.store.getNoteContent(item);
    if (content) {
      ti.description = "☰";
      const md = new vscode.MarkdownString(content);
      md.supportHtml = true;
      ti.tooltip = md;
    }
  }

  getChildren(node?: TodoNode): TodoNode[] {
    if (!node) {
      return this.store.getPending().map((item) => ({ item }));
    }
    if (!node.parent) {
      return (node.item.children ?? [])
        .map((child) => ({ item: child, parent: node.item }));
    }
    return [];
  }

  handleDrag(source: readonly TodoNode[], dataTransfer: vscode.DataTransfer): void {
    dataTransfer.set(MIME_TYPE, new vscode.DataTransferItem(source[0]));
  }

  handleDrop(target: TodoNode | undefined, dataTransfer: vscode.DataTransfer): void {
    const raw = dataTransfer.get(MIME_TYPE);
    if (!raw) return;
    const source: TodoNode = raw.value;

    if (!source.parent && !target?.parent) {
      this.store.moveItem(source.item, target?.item);
    } else if (
      source.parent && target?.parent &&
      source.parent.createdAt === target.parent.createdAt
    ) {
      this.store.moveChild(source.parent, source.item, target.item);
    }
    this.refresh();
  }
}

export class DoneProvider implements vscode.TreeDataProvider<TodoNode> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private store: TodoStore) {}

  refresh(): void {
    this._onDidChange.fire();
  }

  private formatDate(dateStr?: string): string {
    const date = dateStr ? new Date(dateStr) : new Date();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:${min}`;
  }

  getTreeItem(node: TodoNode): vscode.TreeItem {
    const { item } = node;
    const dateStr = this.formatDate(item.doneAt);
    const doneChildren = this.store.getDoneChildren(item);
    const hasChildren = !node.parent && doneChildren.length > 0;

    const ti = new vscode.TreeItem(
      `${item.text}  (${dateStr})`,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    ti.contextValue = "done";
    ti.iconPath = new vscode.ThemeIcon("check");
    return ti;
  }

  getChildren(node?: TodoNode): TodoNode[] {
    if (!node) {
      return this.store.getDone().map((item) => ({ item }));
    }
    if (!node.parent) {
      return this.store.getDoneChildren(node.item)
        .map((child) => ({ item: child, parent: node.item }));
    }
    return [];
  }
}
