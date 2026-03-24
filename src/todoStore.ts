import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { EventEmitter } from "events";

export interface TodoItem {
  id?: string;
  text: string;
  done: boolean;
  createdAt: string;
  doneAt?: string;
  children?: TodoItem[];
}

interface TodoData {
  items: TodoItem[];
}

export class TodoStore extends EventEmitter {
  private filePath: string;
  private watcher: fs.FSWatcher | null = null;

  constructor() {
    super();
    this.filePath = path.join(os.homedir(), ".tick-todo", "todo.json");
  }

  start(): void {
    this.ensureFile();
    const dir = path.dirname(this.filePath);
    this.watcher = fs.watch(dir, (_, filename) => {
      if (filename === "todo.json") {
        this.emit("change");
      }
    });
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  get notesDir(): string {
    return path.join(path.dirname(this.filePath), "notes");
  }

  getNotePath(item: TodoItem): string {
    const id = this.ensureId(item);
    return path.join(this.notesDir, `${id}.md`);
  }

  private ensureId(item: TodoItem): string {
    if (item.id) return item.id;
    // 给没有 id 的旧数据补上
    const data = this.read();
    const target = this.findItem(data, item);
    if (target && !target.id) {
      target.id = this.generateId();
      this.write(data);
    }
    return target?.id ?? this.generateId();
  }

  private findItem(data: TodoData, item: TodoItem): TodoItem | undefined {
    for (const i of data.items) {
      if (i.text === item.text && i.createdAt === item.createdAt) return i;
      for (const c of i.children ?? []) {
        if (c.text === item.text && c.createdAt === item.createdAt) return c;
      }
    }
    return undefined;
  }

  private ensureFile(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ items: [] }, null, 2));
    }
    if (!fs.existsSync(this.notesDir)) {
      fs.mkdirSync(this.notesDir, { recursive: true });
    }
  }

  private read(): TodoData {
    this.ensureFile();
    const raw = fs.readFileSync(this.filePath, "utf-8");
    return JSON.parse(raw);
  }

  private write(data: TodoData): void {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2) + "\n");
  }

  getPending(): TodoItem[] {
    return this.read().items.filter((i) => !i.done);
  }

  getPendingCount(): number {
    const items = this.read().items;
    let count = 0;
    for (const item of items) {
      if (!item.done) {
        count++;
        for (const child of item.children ?? []) {
          if (!child.done) count++;
        }
      }
    }
    return count;
  }

  getDone(): TodoItem[] {
    const data = this.read();
    const doneItems: TodoItem[] = [];
    for (const item of data.items) {
      if (item.done) {
        doneItems.push(item);
      }
      for (const child of item.children ?? []) {
        if (child.done) {
          doneItems.push(child);
        }
      }
    }
    return doneItems.sort((a, b) =>
      (b.doneAt ?? "").localeCompare(a.doneAt ?? "")
    );
  }

  getPendingChildren(parent: TodoItem): TodoItem[] {
    return (parent.children ?? []).filter((c) => !c.done);
  }

  getChildrenProgress(parent: TodoItem): { done: number; total: number } {
    const children = parent.children ?? [];
    if (children.length === 0) return { done: 0, total: 0 };
    return {
      done: children.filter((c) => c.done).length,
      total: children.length,
    };
  }

  add(text: string): void {
    const data = this.read();
    data.items.push({ id: this.generateId(), text, done: false, createdAt: new Date().toISOString() });
    this.write(data);
  }

  addChild(parentIndex: number, text: string): void {
    const data = this.read();
    const pending = data.items.filter((i) => !i.done);
    if (parentIndex < 0 || parentIndex >= pending.length) return;
    const parent = pending[parentIndex];
    if (!parent.children) parent.children = [];
    parent.children.push({
      id: this.generateId(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
    });
    this.write(data);
  }

  markDone(index: number): void {
    const data = this.read();
    const pending = data.items.filter((i) => !i.done);
    if (index < 0 || index >= pending.length) return;
    const item = pending[index];
    item.done = true;
    item.doneAt = new Date().toISOString();
    // 同时完成所有子项
    for (const child of item.children ?? []) {
      if (!child.done) {
        child.done = true;
        child.doneAt = new Date().toISOString();
      }
    }
    this.write(data);
  }

  markChildDone(parentIndex: number, childIndex: number): void {
    const data = this.read();
    const pending = data.items.filter((i) => !i.done);
    if (parentIndex < 0 || parentIndex >= pending.length) return;
    const parent = pending[parentIndex];
    const pendingChildren = (parent.children ?? []).filter((c) => !c.done);
    if (childIndex < 0 || childIndex >= pendingChildren.length) return;
    pendingChildren[childIndex].done = true;
    pendingChildren[childIndex].doneAt = new Date().toISOString();
    // 检查是否所有子项都完成，自动完成父项
    const allDone = (parent.children ?? []).every((c) => c.done);
    if (allDone && (parent.children ?? []).length > 0) {
      parent.done = true;
      parent.doneAt = new Date().toISOString();
    }
    this.write(data);
  }

  edit(item: TodoItem, newText: string): void {
    const data = this.read();
    const target = data.items.find(
      (i) => i.text === item.text && i.createdAt === item.createdAt
    );
    if (target) {
      target.text = newText;
    }
    this.write(data);
  }

  editChild(parent: TodoItem, child: TodoItem, newText: string): void {
    const data = this.read();
    const p = data.items.find(
      (i) => i.text === parent.text && i.createdAt === parent.createdAt
    );
    if (p?.children) {
      const c = p.children.find(
        (i) => i.text === child.text && i.createdAt === child.createdAt
      );
      if (c) c.text = newText;
    }
    this.write(data);
  }

  moveItem(item: TodoItem, beforeItem?: TodoItem): void {
    const data = this.read();
    const idx = data.items.findIndex(
      (i) => i.text === item.text && i.createdAt === item.createdAt
    );
    if (idx < 0) return;
    const [removed] = data.items.splice(idx, 1);
    if (!beforeItem) {
      data.items.push(removed);
    } else {
      const targetIdx = data.items.findIndex(
        (i) => i.text === beforeItem.text && i.createdAt === beforeItem.createdAt
      );
      data.items.splice(targetIdx >= 0 ? targetIdx : data.items.length, 0, removed);
    }
    this.write(data);
  }

  moveChild(parent: TodoItem, child: TodoItem, beforeChild?: TodoItem): void {
    const data = this.read();
    const p = data.items.find(
      (i) => i.text === parent.text && i.createdAt === parent.createdAt
    );
    if (!p?.children) return;
    const idx = p.children.findIndex(
      (c) => c.text === child.text && c.createdAt === child.createdAt
    );
    if (idx < 0) return;
    const [removed] = p.children.splice(idx, 1);
    if (!beforeChild) {
      p.children.push(removed);
    } else {
      const targetIdx = p.children.findIndex(
        (c) => c.text === beforeChild.text && c.createdAt === beforeChild.createdAt
      );
      p.children.splice(targetIdx >= 0 ? targetIdx : p.children.length, 0, removed);
    }
    this.write(data);
  }

  remove(item: TodoItem): void {
    const data = this.read();
    data.items = data.items.filter(
      (i) => !(i.text === item.text && i.createdAt === item.createdAt)
    );
    this.write(data);
  }

  removeChild(parent: TodoItem, child: TodoItem): void {
    const data = this.read();
    const target = data.items.find(
      (i) => i.text === parent.text && i.createdAt === parent.createdAt
    );
    if (target && target.children) {
      target.children = target.children.filter(
        (c) => !(c.text === child.text && c.createdAt === child.createdAt)
      );
    }
    this.write(data);
  }
}
