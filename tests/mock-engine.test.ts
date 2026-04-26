import test from "node:test";
import assert from "node:assert/strict";
import { MockDatabase, type MockProjectDefinition } from "../dev/mock-engine.js";

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
  (globalThis as any).window = { localStorage };
  return localStorage;
}

function createProject(): MockProjectDefinition {
  return {
    storageKey: "mock-engine-tests",
    collections: {
      users: {
        records: [
          { id: "user_1", created: "2026-04-01 08:00:00", updated: "2026-04-01 08:00:00", name: "Juan", username: "juan", email: "juan@test" },
          { id: "user_2", created: "2026-04-01 08:00:00", updated: "2026-04-01 08:00:00", name: "Natalia", username: "natalia", email: "natalia@test" },
        ],
      },
      groups: {
        relations: {
          members: { collection: "users", many: true },
        },
        records: [
          { id: "group_1", created: "2026-04-01 08:00:00", updated: "2026-04-01 08:00:00", name: "Builders", members: ["user_1", "user_2"] },
        ],
      },
      tasks: {
        relations: {
          assignee: { collection: "users" },
          group: { collection: "groups" },
        },
        records: [
          {
            id: "task_1",
            created: "2026-04-02 08:00:00",
            updated: "2026-04-02 08:00:00",
            title: 'He said "hello"',
            status: "DONE",
            assignee: "user_1",
            group: "group_1",
          },
          {
            id: "task_2",
            created: "2026-04-03 08:00:00",
            updated: "2026-04-03 08:00:00",
            title: "Needs review",
            status: "TODO",
            assignee: "user_2",
            group: "group_1",
          },
        ],
      },
    },
  };
}

test("mock engine loads seed data, expands relations and sorts/filters records", () => {
  installWindowStorage();
  const database = new MockDatabase(createProject());

  const expandedTask = database.getById("tasks", "task_1", { expand: "assignee,group,group.members" }) as any;
  assert.equal(expandedTask.expand.assignee.name, "Juan");
  assert.equal(expandedTask.expand.group.name, "Builders");
  assert.equal(expandedTask.expand.group.expand.members.length, 2);

  const filtered = database.getList("tasks", {
    filter: '(status = "DONE") && (assignee.username ~ "juan" || assignee.username ~ "JUAN")',
    expand: "assignee",
  }, 1, 10);
  assert.equal(filtered.totalItems, 1);
  assert.equal((filtered.items[0] as any).expand.assignee.username, "juan");

  const escaped = database.getList("tasks", {
    filter: 'title = "He said \\"hello\\""',
  }, 1, 10);
  assert.equal(escaped.totalItems, 1);

  const sorted = database.getList("tasks", {
    sort: "-created,title",
  }, 1, 10);
  assert.equal((sorted.items[0] as any).id, "task_2");
});

test("mock engine supports pagination, create, update, delete and reset", () => {
  const localStorage = installWindowStorage();
  localStorage.setItem("mock-engine-tests", "{broken json");
  const database = new MockDatabase(createProject());

  const paginated = database.getList("tasks", {}, 2, 1);
  assert.equal(paginated.totalPages, 2);
  assert.equal(paginated.items.length, 1);

  const created = database.create("tasks", {
    title: "New task",
    status: "TODO",
    assignee: "user_1",
  }) as any;
  assert.ok(created.id.startsWith("tasks_"));

  const updated = database.update("tasks", created.id, {
    title: "Updated task",
    status: "DONE",
  }) as any;
  assert.equal(updated.title, "Updated task");
  assert.equal(updated.status, "DONE");

  assert.equal(database.delete("tasks", created.id), true);
  assert.equal(database.getList("tasks", {}, 1, 20).totalItems, 2);

  database.create("tasks", { title: "Temporary", status: "TODO" });
  assert.equal(database.getList("tasks", {}, 1, 20).totalItems, 3);
  database.reset();
  assert.equal(database.getList("tasks", {}, 1, 20).totalItems, 2);
});

test("mock engine throws useful errors for invalid operations", () => {
  installWindowStorage();
  const database = new MockDatabase(createProject());

  assert.throws(() => database.update("tasks", "missing", { title: "X" }), /not found/i);
  assert.throws(() => database.delete("tasks", "missing"), /not found/i);
  assert.throws(() => database.getList("tasks", { filter: "status ???" }, 1, 10), /Unsupported filter token|Unexpected token/i);
  assert.throws(() => database.getList("tasks", { filter: '(status = "DONE"' }, 1, 10), /Unexpected token while parsing filter/i);
  assert.throws(() => database.getList("tasks", { filter: 'status = "DONE" unexpected' }, 1, 10), /Unexpected trailing tokens in filter/i);
});

test("mock engine covers empty filters, fallback pagination and unknown collections", () => {
  const localStorage = installWindowStorage();
  localStorage.removeItem("mock-engine-tests");
  localStorage.clear();

  const database = new MockDatabase(createProject());
  const defaults = database.getList("tasks", { filter: "", sort: "" }, 0, 0);
  assert.equal(defaults.page, 1);
  assert.equal(defaults.perPage, 20);
  assert.equal(defaults.totalItems, 2);

  assert.equal(database.getById("tasks", "missing"), undefined);

  const created = database.create("notes", {
    payload: { nested: true },
    metadata: { code: "DOCS" },
    count: 3,
    enabled: true,
    nullable: null,
  }) as any;
  database.create("notes", {
    payload: { nested: false },
    metadata: { code: "API" },
    count: 1,
    enabled: false,
  });

  const notes = database.getList("notes", { filter: 'metadata.code = "DOCS"' }, 1, 10);
  assert.equal(notes.totalItems, 1);
  assert.equal((notes.items[0] as any).id, created.id);

  const sortedNotes = database.getList("notes", { sort: "nullable,metadata,count,enabled,missing_field" }, 1, 10);
  assert.equal(sortedNotes.items.length, 2);
  assert.equal(database.getList("notes", { sort: "missing_field" }, 1, 10).items.length, 2);
});

test("mock engine expands nullable and partial relations and supports not-equals filters", () => {
  installWindowStorage();
  const database = new MockDatabase(createProject());

  database.create("groups", {
    id: "group_2",
    name: "Partial group",
    members: ["user_1", "missing_user"],
  });

  const nullableTask = database.create("tasks", {
    title: "Nullable assignment",
    status: "TODO",
    assignee: null,
    group: "group_2",
  }) as any;

  const filtered = database.getList("tasks", {
    filter: 'status != "DONE"',
    sort: "status",
    expand: "assignee,group.members,missingRelation",
  }, 1, 20);

  assert.ok(filtered.totalItems >= 2);

  const expandedNullable = database.getById("tasks", nullableTask.id, {
    expand: "assignee,group.members",
  }) as any;

  assert.equal(expandedNullable.expand.assignee, null);
  assert.equal(expandedNullable.expand.group.expand.members.length, 1);
  assert.equal(
    database.getList("tasks", { filter: 'assignee.name = "Nobody"' }, 1, 20).totalItems,
    0,
  );
  assert.equal(
    database.getList("tasks", { filter: 'group.members.name.code = "missing"' }, 1, 20).totalItems,
    0,
  );
});
