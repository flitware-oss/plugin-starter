import { MockDatabase, type MockListOptions, type MockProjectDefinition, type MockRecord } from "./mock-engine.js";

type PluginProxyMessage = {
  action?: string;
  collection?: string;
  options?: Record<string, unknown> & { id?: string };
  page?: number;
  perPage?: number;
  data?: {
    operation?: "create" | "update" | "delete";
    id?: string;
    payload?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
};

export type PluginDevDataSource = {
  getList: (collection: string, options?: MockListOptions, page?: number, perPage?: number) => Promise<unknown>;
  getById: (collection: string, id: string, options?: MockListOptions) => Promise<unknown>;
  create: (collection: string, payload: Record<string, unknown>) => Promise<unknown>;
  update: (collection: string, id: string, payload: Record<string, unknown>) => Promise<unknown>;
  delete: (collection: string, id: string) => Promise<boolean>;
};

function record(id: string, values: Record<string, unknown>): MockRecord {
  return {
    id,
    created: String(values.created ?? "2026-04-01 08:00:00"),
    updated: String(values.updated ?? "2026-04-25 12:00:00"),
    ...values,
  };
}

export const taskMockProject: MockProjectDefinition = {
  storageKey: "flitware-plugin-dev:dummy-tasks",
  collections: {
    task_status: {
      records: [
        record("task_status_todo", {
          created: "2026-03-28 09:00:00",
          updated: "2026-04-24 10:30:00",
          name: "TODO",
          description: "Task ready to start.",
        }),
        record("task_status_in_progress", {
          name: "IN_PROGRESS",
          description: "Task currently in progress.",
        }),
        record("task_status_done", {
          name: "DONE",
          description: "Task completed successfully.",
        }),
        record("task_status_blocked", {
          name: "BLOCKED",
          description: "Task blocked by an external dependency.",
        }),
      ],
    },
    users: {
      records: [
        record("user_juan", {
          created: "2026-03-15 08:15:00",
          name: "Juan Bautista",
          username: "juan.bautista",
          email: "juan@flitware.test",
          phone: "3100001001",
        }),
        record("user_natalia", {
          name: "Natalia Rojas",
          username: "natalia.rojas",
          email: "natalia@flitware.test",
          phone: "3100001002",
        }),
        record("user_camilo", {
          name: "Camilo Perez",
          username: "camilo.perez",
          email: "camilo@flitware.test",
          phone: "3100001003",
        }),
      ],
    },
    tasks: {
      relations: {
        status: { collection: "task_status" },
        assignee: { collection: "users" },
      },
      records: [
        record("task_001", {
          title: "Prepare plugin starter documentation",
          description: "Write the first draft of the public starter guide and validate the local dev environment.",
          start_date: "2026-04-21 00:00:00",
          end_date: "2026-04-28 23:59:00",
          status: "task_status_in_progress",
          assignee: "user_juan",
        }),
        record("task_002", {
          title: "Review mock collections",
          description: "Check CRUD flows, filters, pagination and expand behaviour for starter mocks.",
          start_date: "2026-04-18 00:00:00",
          end_date: "2026-04-23 23:59:00",
          status: "task_status_done",
          assignee: "user_natalia",
        }),
        record("task_003", {
          title: "Design onboarding checklist",
          description: "Define the first-run checklist plugin developers should complete before publishing.",
          start_date: "2026-04-25 00:00:00",
          end_date: "2026-05-02 23:59:00",
          status: "task_status_todo",
          assignee: "user_camilo",
        }),
        record("task_004", {
          title: "Validate theme inheritance",
          description: "Confirm Cloudscape custom tokens and light/dark mode behave exactly like Flitware host.",
          start_date: "2026-04-22 00:00:00",
          end_date: "2026-04-29 23:59:00",
          status: "task_status_blocked",
          assignee: "user_juan",
        }),
      ],
    },
  },
};

export function createMockPluginDataSource(database: MockDatabase): PluginDevDataSource {
  return {
    async getList(collection, options = {}, page = 1, perPage = 20) {
      return database.getList(collection, options, page, perPage);
    },
    async getById(collection, id, options = {}) {
      return database.getById(collection, id, options);
    },
    async create(collection, payload) {
      return database.create(collection, payload);
    },
    async update(collection, id, payload) {
      return database.update(collection, id, payload);
    },
    async delete(collection, id) {
      return database.delete(collection, id);
    },
  };
}

export async function resolvePluginProxyMessage(
  dataSource: PluginDevDataSource,
  message: PluginProxyMessage,
) {
  const action = String(message.action ?? "").trim();
  const collection = String(message.collection ?? "").trim();

  if (!collection) {
    throw new Error("Plugin proxy requires a collection.");
  }

  if (action === "getData") {
    const query = { ...(message.options ?? {}) };
    const recordId = typeof query.id === "string" ? query.id.trim() : "";

    if (recordId) {
      delete query.id;
      return await dataSource.getById(collection, recordId, query);
    }

    return await dataSource.getList(
      collection,
      query,
      Number(message.page ?? 1),
      Number(message.perPage ?? 20),
    );
  }

  if (action === "postData") {
    const mutation = message.data ?? {};
    const operation = String(mutation.operation ?? "create").trim() || "create";
    const mutationPayload = mutation.payload ?? mutation.data ?? {};
    const mutationId = String(mutation.id ?? "").trim();

    if (operation === "create") {
      return await dataSource.create(collection, mutationPayload);
    }

    if (operation === "update") {
      if (!mutationId) {
        throw new Error("Plugin proxy update requires an id.");
      }

      return await dataSource.update(collection, mutationId, mutationPayload);
    }

    if (operation === "delete") {
      if (!mutationId) {
        throw new Error("Plugin proxy delete requires an id.");
      }

      return await dataSource.delete(collection, mutationId);
    }

    throw new Error(`Unsupported plugin proxy operation: ${operation}`);
  }

  throw new Error(`Unsupported plugin proxy action: ${action}`);
}

export function createTaskMockEnvironment() {
  const database = new MockDatabase(taskMockProject);
  const dataSource = createMockPluginDataSource(database);

  return {
    database,
    dataSource,
    resolveMessage: (message: PluginProxyMessage) => resolvePluginProxyMessage(dataSource, message),
  };
}
