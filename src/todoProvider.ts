import * as vscode from "vscode";
import { TodoItem, TodoStore } from "./todoStore";

/** 用于 TreeView 的节点，包含父项引用信息 */
export interface TodoNode {
  item: TodoItem;
  parent?: TodoItem;
}

const MIME_TYPE = "application/vnd.code.tree.clitodo.pending";

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

      const hasChildren = (item.children ?? []).some((c) => !c.done);
      const ti = new vscode.TreeItem(
        label,
        hasChildren
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.None
      );
      ti.contextValue = "pending";
      ti.iconPath = new vscode.ThemeIcon("circle-outline");
      ti.command = { command: "clitodo.openNote", title: "打开笔记", arguments: [node] };
      return ti;
    } else {
      const pendingChildren = this.store.getPendingChildren(parent);
      const childIndex = pendingChildren.findIndex(
        (c) => c.text === item.text && c.createdAt === item.createdAt
      );
      const pending = this.store.getPending();
      const parentIndex = pending.findIndex(
        (i) => i.text === parent.text && i.createdAt === parent.createdAt
      );
      const ti = new vscode.TreeItem(
        `${parentIndex + 1}.${childIndex + 1} ${item.text}`
      );
      ti.contextValue = "pending-child";
      ti.iconPath = new vscode.ThemeIcon("circle-outline");
      ti.command = { command: "clitodo.openNote", title: "打开笔记", arguments: [node] };
      return ti;
    }
  }

  getChildren(node?: TodoNode): TodoNode[] {
    if (!node) {
      return this.store.getPending().map((item) => ({ item }));
    }
    if (!node.parent) {
      return this.store
        .getPendingChildren(node.item)
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

    // 只支持同级拖拽：顶级之间、同父子项之间
    if (!source.parent && !target?.parent) {
      // 顶级项排序
      this.store.moveItem(source.item, target?.item);
    } else if (
      source.parent && target?.parent &&
      source.parent.createdAt === target.parent.createdAt
    ) {
      // 同父项下子项排序
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

  getTreeItem(node: TodoNode): vscode.TreeItem {
    const { item } = node;
    const date = item.doneAt ? new Date(item.doneAt) : new Date();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const ti = new vscode.TreeItem(`${item.text}  (${mm}-${dd} ${hh}:${min})`);
    ti.contextValue = "done";
    ti.iconPath = new vscode.ThemeIcon("check");
    return ti;
  }

  getChildren(): TodoNode[] {
    return this.store.getDone().map((item) => ({ item }));
  }
}
