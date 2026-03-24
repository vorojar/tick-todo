import * as vscode from "vscode";
import * as fs from "fs";
import { TodoStore } from "./todoStore";
import { TodoNode, PendingProvider, DoneProvider } from "./todoProvider";

export function activate(context: vscode.ExtensionContext) {
  const store = new TodoStore();
  store.start();

  const pendingProvider = new PendingProvider(store);
  const doneProvider = new DoneProvider(store);

  const pendingView = vscode.window.createTreeView("clitodo.pending", {
    treeDataProvider: pendingProvider,
    dragAndDropController: pendingProvider,
  });
  vscode.window.createTreeView("clitodo.done", {
    treeDataProvider: doneProvider,
  });

  const updateBadge = () => {
    const count = store.getPendingCount();
    pendingView.badge = count > 0
      ? { value: count, tooltip: `${count} 项待办` }
      : undefined;
  };

  const refreshAll = () => {
    pendingProvider.refresh();
    doneProvider.refresh();
    updateBadge();
  };

  store.on("change", refreshAll);
  updateBadge();

  context.subscriptions.push(
    vscode.commands.registerCommand("clitodo.add", async () => {
      const text = await vscode.window.showInputBox({
        prompt: "输入待办内容",
        placeHolder: "例如：修复登录页 bug",
      });
      if (text) {
        store.add(text);
        refreshAll();
      }
    }),

    vscode.commands.registerCommand("clitodo.addChild", async (node: TodoNode) => {
      const text = await vscode.window.showInputBox({
        prompt: `给「${node.item.text}」添加子任务`,
        placeHolder: "例如：设计UI界面",
      });
      if (!text) return;
      const pending = store.getPending();
      const index = pending.findIndex(
        (i) => i.text === node.item.text && i.createdAt === node.item.createdAt
      );
      if (index >= 0) {
        store.addChild(index, text);
        refreshAll();
      }
    }),

    vscode.commands.registerCommand("clitodo.done", (node: TodoNode) => {
      if (node.parent) {
        const pending = store.getPending();
        const parentIndex = pending.findIndex(
          (i) =>
            i.text === node.parent!.text &&
            i.createdAt === node.parent!.createdAt
        );
        const pendingChildren = store.getPendingChildren(node.parent);
        const childIndex = pendingChildren.findIndex(
          (c) =>
            c.text === node.item.text && c.createdAt === node.item.createdAt
        );
        if (parentIndex >= 0 && childIndex >= 0) {
          store.markChildDone(parentIndex, childIndex);
        }
      } else {
        const pending = store.getPending();
        const index = pending.findIndex(
          (i) =>
            i.text === node.item.text && i.createdAt === node.item.createdAt
        );
        if (index >= 0) {
          store.markDone(index);
        }
      }
      refreshAll();
    }),

    vscode.commands.registerCommand("clitodo.edit", async (node: TodoNode) => {
      const newText = await vscode.window.showInputBox({
        prompt: "编辑内容",
        value: node.item.text,
      });
      if (!newText || newText === node.item.text) return;
      if (node.parent) {
        store.editChild(node.parent, node.item, newText);
      } else {
        store.edit(node.item, newText);
      }
      refreshAll();
    }),

    vscode.commands.registerCommand("clitodo.remove", (node: TodoNode) => {
      if (node.parent) {
        store.removeChild(node.parent, node.item);
      } else {
        store.remove(node.item);
      }
      refreshAll();
    }),

    vscode.commands.registerCommand("clitodo.openNote", (node: TodoNode) => {
      const notePath = store.getNotePath(node.item);
      if (!fs.existsSync(notePath)) {
        fs.writeFileSync(notePath, `# ${node.item.text}\n\n`);
      }
      vscode.window.showTextDocument(vscode.Uri.file(notePath));
    }),

    vscode.commands.registerCommand("clitodo.refresh", refreshAll),

    { dispose: () => store.stop() }
  );
}

export function deactivate() {}
