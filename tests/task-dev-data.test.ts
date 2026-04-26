import test from "node:test";
import assert from "node:assert/strict";
import {
  createMockPluginDataSource,
  createTaskMockEnvironment,
  resolvePluginProxyMessage,
  taskMockProject,
} from "../dev/task-dev-data.js";
import { MockDatabase } from "../dev/mock-engine.js";

function createLocalStorage() {
  const storage = new Map<string, string>();

  return {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
  };
}

function installWindowStorage() {
  const localStorage = createLocalStorage();
  localStorage.removeItem("unused");
  localStorage.clear();
  (globalThis as any).window = { localStorage };
}

test("task mock environment bootstraps default collections", async () => {
  installWindowStorage();
  const environment = createTaskMockEnvironment();
  const list = await environment.resolveMessage({
    action: "getData",
    collection: "tasks",
    page: 1,
    perPage: 20,
    options: { expand: "status,assignee" },
  }) as any;

  assert.equal(list.totalItems, 4);
  assert.equal(list.items[0].expand.status.name.length > 0, true);
});

test("task dev data source supports CRUD through proxy messages", async () => {
  installWindowStorage();
  const database = new MockDatabase(taskMockProject);
  const dataSource = createMockPluginDataSource(database);

  const created = await resolvePluginProxyMessage(dataSource, {
    action: "postData",
    collection: "tasks",
    data: {
      payload: {
        title: "Ship starter docs",
        description: "Finalize public docs",
        start_date: "2026-04-26 00:00:00",
        end_date: "2026-04-30 23:59:00",
        status: "task_status_todo",
        assignee: "user_juan",
      },
    },
  }) as any;
  assert.equal(created.title, "Ship starter docs");

  const fetched = await resolvePluginProxyMessage(dataSource, {
    action: "getData",
    collection: "tasks",
    options: {
      id: created.id,
      expand: "status,assignee",
    },
  }) as any;
  assert.equal(fetched.expand.assignee.username, "juan.bautista");

  const updated = await resolvePluginProxyMessage(dataSource, {
    action: "postData",
    collection: "tasks",
    data: {
      operation: "update",
      id: created.id,
      payload: {
        status: "task_status_done",
      },
    },
  }) as any;
  assert.equal(updated.status, "task_status_done");

  const deleted = await resolvePluginProxyMessage(dataSource, {
    action: "postData",
    collection: "tasks",
    data: {
      operation: "delete",
      id: created.id,
    },
  });
  assert.equal(deleted, true);
});

test("task dev data source validates malformed proxy requests", async () => {
  installWindowStorage();
  const database = new MockDatabase(taskMockProject);
  const dataSource = createMockPluginDataSource(database);

  await assert.rejects(
    () => resolvePluginProxyMessage(dataSource, { action: "getData", collection: "" }),
    /requires a collection/i,
  );

  await assert.rejects(
    () => resolvePluginProxyMessage(dataSource, {
      action: "postData",
      collection: "tasks",
      data: { operation: "update", payload: {} },
    }),
    /requires an id/i,
  );

  await assert.rejects(
    () => resolvePluginProxyMessage(dataSource, {
      action: "postData",
      collection: "tasks",
      data: { operation: "delete" },
    }),
    /requires an id/i,
  );

  await assert.rejects(
    () => resolvePluginProxyMessage(dataSource, {
      action: "postData",
      collection: "tasks",
      data: { operation: "archive" as any },
    }),
    /Unsupported plugin proxy operation/i,
  );

  await assert.rejects(
    () => resolvePluginProxyMessage(dataSource, {
      action: "unknown",
      collection: "tasks",
    }),
    /Unsupported plugin proxy action/i,
  );

  await assert.rejects(
    () => resolvePluginProxyMessage(dataSource, {
      collection: "tasks",
    }),
    /Unsupported plugin proxy action/i,
  );
});

test("task dev data source supports direct adapter calls and fallback listing", async () => {
  installWindowStorage();
  const database = new MockDatabase(taskMockProject);
  const dataSource = createMockPluginDataSource(database);

  const list = await dataSource.getList("tasks");
  assert.equal((list as any).totalItems, 4);

  const firstTask = (list as any).items[0];
  const record = await dataSource.getById("tasks", firstTask.id);
  assert.equal((record as any).id, firstTask.id);

  const expandedRecord = await dataSource.getById("tasks", firstTask.id, { expand: "status,assignee" });
  assert.equal((expandedRecord as any).expand.assignee.id.length > 0, true);

  const created = await dataSource.create("tasks", {
    title: "Adapter task",
    description: "Created directly from adapter",
    start_date: "2026-05-01 00:00:00",
    end_date: "2026-05-02 23:59:00",
    status: "task_status_todo",
    assignee: "user_camilo",
  }) as any;
  assert.ok(created.id.length > 0);

  const updated = await dataSource.update("tasks", created.id, {
    status: "task_status_done",
  }) as any;
  assert.equal(updated.status, "task_status_done");

  const deleted = await dataSource.delete("tasks", created.id);
  assert.equal(deleted, true);
});

test("task dev data source supports query fallbacks and mutation data aliases", async () => {
  installWindowStorage();
  const database = new MockDatabase(taskMockProject);
  const dataSource = createMockPluginDataSource(database);

  const list = await resolvePluginProxyMessage(dataSource, {
    action: " getData ",
    collection: " tasks ",
    options: {
      id: "   ",
      expand: "status,assignee",
    },
  }) as any;
  assert.equal(list.totalItems, 4);

  const nonStringIdList = await resolvePluginProxyMessage(dataSource, {
    action: "getData",
    collection: "tasks",
    options: {
      id: 99 as unknown as string,
    },
  }) as any;
  assert.equal(nonStringIdList.totalItems, 4);

  const created = await resolvePluginProxyMessage(dataSource, {
    action: "postData",
    collection: "tasks",
    data: {
      operation: "" as any,
      data: {
        title: "Alias payload task",
        description: "Created through data alias",
        start_date: "2026-05-03 00:00:00",
        end_date: "2026-05-04 23:59:00",
        status: "task_status_todo",
        assignee: "user_juan",
      },
    },
  }) as any;

  assert.equal(created.title, "Alias payload task");

  const emptyCreated = await resolvePluginProxyMessage(dataSource, {
    action: "postData",
    collection: "tasks",
  }) as any;
  assert.ok(emptyCreated.id.length > 0);
});
