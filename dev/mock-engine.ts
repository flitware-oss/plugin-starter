export type MockRecord = {
  id: string;
  created?: string;
  updated?: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MockRelationDefinition = {
  collection: string;
  many?: boolean;
};

export type MockCollectionDefinition = {
  records: MockRecord[];
  relations?: Record<string, MockRelationDefinition>;
};

export type MockProjectDefinition = {
  storageKey: string;
  collections: Record<string, MockCollectionDefinition>;
};

export type MockListOptions = {
  filter?: string;
  sort?: string;
  expand?: string;
  fields?: string;
  [key: string]: unknown;
};

export type MockListResult<T> = {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: T[];
};

type FilterToken =
  | { type: "lparen" | "rparen" | "and" | "or" }
  | { type: "identifier"; value: string }
  | { type: "string"; value: string }
  | { type: "operator"; value: "=" | "!=" | "~" };

type FilterNode =
  | { type: "and"; left: FilterNode; right: FilterNode }
  | { type: "or"; left: FilterNode; right: FilterNode }
  | { type: "comparison"; field: string; operator: "=" | "!=" | "~"; value: string };

type ExpandTree = Map<string, ExpandTree>;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

function coerceComparable(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function tokenizeFilter(input: string): FilterToken[] {
  const tokens: FilterToken[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const char = input[cursor];

    if (/\s/.test(char)) {
      cursor += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen" });
      cursor += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "rparen" });
      cursor += 1;
      continue;
    }

    if (input.startsWith("&&", cursor)) {
      tokens.push({ type: "and" });
      cursor += 2;
      continue;
    }

    if (input.startsWith("||", cursor)) {
      tokens.push({ type: "or" });
      cursor += 2;
      continue;
    }

    if (input.startsWith("!=", cursor)) {
      tokens.push({ type: "operator", value: "!=" });
      cursor += 2;
      continue;
    }

    if (char === "=" || char === "~") {
      tokens.push({ type: "operator", value: char });
      cursor += 1;
      continue;
    }

    if (char === "\"") {
      let value = "";
      cursor += 1;

      while (cursor < input.length) {
        const next = input[cursor];

        if (next === "\\" && cursor + 1 < input.length) {
          value += input[cursor + 1];
          cursor += 2;
          continue;
        }

        if (next === "\"") {
          cursor += 1;
          break;
        }

        value += next;
        cursor += 1;
      }

      tokens.push({ type: "string", value });
      continue;
    }

    const identifierMatch = input.slice(cursor).match(/^[A-Za-z0-9_.-]+/);

    if (identifierMatch) {
      tokens.push({ type: "identifier", value: identifierMatch[0] });
      cursor += identifierMatch[0].length;
      continue;
    }

    throw new Error(`Unsupported filter token near: ${input.slice(cursor, cursor + 20)}`);
  }

  return tokens;
}

function parseFilter(input: string): FilterNode | null {
  const trimmed = String(input ?? "").trim();

  if (!trimmed) {
    return null;
  }

  const tokens = tokenizeFilter(trimmed);
  let cursor = 0;

  function currentToken() {
    return tokens[cursor] ?? null;
  }

  function consumeToken<T extends FilterToken["type"]>(type: T) {
    const token = currentToken();

    if (!token || token.type !== type) {
      throw new Error(`Unexpected token while parsing filter: expected ${type}`);
    }

    cursor += 1;
    return token as Extract<FilterToken, { type: T }>;
  }

  function parsePrimary(): FilterNode {
    if (currentToken()?.type === "lparen") {
      consumeToken("lparen");
      const node = parseOr();
      consumeToken("rparen");
      return node;
    }

    const field = consumeToken("identifier").value;
    const operator = consumeToken("operator").value;
    const value = consumeToken("string").value;

    return {
      type: "comparison",
      field,
      operator,
      value,
    };
  }

  function parseAnd(): FilterNode {
    let node = parsePrimary();

    while (currentToken()?.type === "and") {
      consumeToken("and");
      node = {
        type: "and",
        left: node,
        right: parsePrimary(),
      };
    }

    return node;
  }

  function parseOr(): FilterNode {
    let node = parseAnd();

    while (currentToken()?.type === "or") {
      consumeToken("or");
      node = {
        type: "or",
        left: node,
        right: parseAnd(),
      };
    }

    return node;
  }

  const node = parseOr();

  if (cursor < tokens.length) {
    throw new Error("Unexpected trailing tokens in filter.");
  }

  return node;
}

function buildExpandTree(expand?: string) {
  const tree: ExpandTree = new Map();

  for (const segment of String(expand ?? "").split(",").map((value) => value.trim()).filter(Boolean)) {
    const parts = segment.split(".").filter(Boolean);
    let cursor: ExpandTree = tree;

    for (const part of parts) {
      if (!cursor.has(part)) {
        cursor.set(part, new Map());
      }

      cursor = cursor.get(part) as ExpandTree;
    }
  }

  return tree;
}

export class MockDatabase {
  private state: Record<string, MockRecord[]>;

  constructor(private readonly project: MockProjectDefinition) {
    this.state = this.loadState();
  }

  reset() {
    this.state = this.loadSeedState();
    this.persistState();
  }

  getList<T extends MockRecord>(
    collection: string,
    options: MockListOptions = {},
    page = 1,
    perPage = 20,
  ): MockListResult<T> {
    const records = this.getCollectionRecords(collection);
    const filteredRecords = this.applyFilter(collection, records, String(options.filter ?? ""));
    const sortedRecords = this.applySort(collection, filteredRecords, String(options.sort ?? ""));
    const safePage = Math.max(Number(page) || 1, 1);
    const safePerPage = Math.max(Number(perPage) || 20, 1);
    const totalItems = sortedRecords.length;
    const totalPages = Math.max(Math.ceil(totalItems / safePerPage), 1);
    const offset = (safePage - 1) * safePerPage;
    const paginatedRecords = sortedRecords.slice(offset, offset + safePerPage);
    const expandedItems = paginatedRecords.map((record) =>
      this.expandRecord(collection, record, buildExpandTree(String(options.expand ?? ""))),
    );

    return {
      page: safePage,
      perPage: safePerPage,
      totalPages,
      totalItems,
      items: expandedItems as T[],
    };
  }

  getById<T extends MockRecord>(collection: string, id: string, options: MockListOptions = {}) {
    const record = this.getCollectionRecords(collection).find((item) => item.id === id);

    if (!record) {
      return undefined;
    }

    return this.expandRecord(collection, record, buildExpandTree(String(options.expand ?? ""))) as T;
  }

  create<T extends MockRecord>(collection: string, payload: Record<string, unknown>) {
    const timestamp = nowIso();
    const nextRecord: MockRecord = {
      id: `${collection}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created: timestamp,
      updated: timestamp,
      ...deepClone(payload),
    };

    this.ensureCollection(collection).push(nextRecord);
    this.persistState();

    return deepClone(nextRecord) as T;
  }

  update<T extends MockRecord>(collection: string, id: string, payload: Record<string, unknown>) {
    const records = this.ensureCollection(collection);
    const index = records.findIndex((item) => item.id === id);

    if (index < 0) {
      throw new Error(`Record ${id} not found in collection ${collection}.`);
    }

    const currentRecord = records[index];
    const nextRecord: MockRecord = {
      ...currentRecord,
      ...deepClone(payload),
      id: currentRecord.id,
      created: currentRecord.created,
      updated: nowIso(),
    };

    records[index] = nextRecord;
    this.persistState();

    return deepClone(nextRecord) as T;
  }

  delete(collection: string, id: string) {
    const records = this.ensureCollection(collection);
    const nextRecords = records.filter((item) => item.id !== id);

    if (nextRecords.length === records.length) {
      throw new Error(`Record ${id} not found in collection ${collection}.`);
    }

    this.state[collection] = nextRecords;
    this.persistState();
    return true;
  }

  private loadSeedState() {
    return Object.fromEntries(
      Object.entries(this.project.collections).map(([collection, definition]) => [
        collection,
        deepClone(definition.records),
      ]),
    );
  }

  private loadState() {
    const stored = window.localStorage.getItem(this.project.storageKey);

    if (!stored) {
      const seedState = this.loadSeedState();
      window.localStorage.setItem(this.project.storageKey, JSON.stringify(seedState));
      return seedState;
    }

    try {
      const parsed = JSON.parse(stored) as Record<string, MockRecord[]>;

      return {
        ...this.loadSeedState(),
        ...parsed,
      };
    } catch {
      const seedState = this.loadSeedState();
      window.localStorage.setItem(this.project.storageKey, JSON.stringify(seedState));
      return seedState;
    }
  }

  private persistState() {
    window.localStorage.setItem(this.project.storageKey, JSON.stringify(this.state));
  }

  private ensureCollection(collection: string) {
    if (!this.state[collection]) {
      this.state[collection] = [];
    }

    return this.state[collection];
  }

  private getCollectionRecords(collection: string) {
    return this.ensureCollection(collection).map((record) => deepClone(record));
  }

  private getRelation(collection: string, field: string) {
    return this.project.collections[collection]?.relations?.[field];
  }

  private resolveValues(collection: string, record: MockRecord | null | undefined, path: string[]): unknown[] {
    if (!record || path.length === 0) {
      return record ? [record] : [];
    }

    const [field, ...rest] = path;
    const rawValue = record[field];

    if (rawValue === undefined || rawValue === null) {
      return [];
    }

    if (rest.length === 0) {
      return Array.isArray(rawValue) ? rawValue : [rawValue];
    }

    const relation = this.getRelation(collection, field);

    if (relation) {
      const relatedIds = Array.isArray(rawValue) ? rawValue : [rawValue];
      return relatedIds.flatMap((relatedId) => {
        const relatedRecord = this.getById(relation.collection, String(relatedId));
        return this.resolveValues(relation.collection, relatedRecord, rest);
      });
    }

    if (typeof rawValue === "object") {
      return this.resolveValues(collection, rawValue as MockRecord, rest);
    }

    return [];
  }

  private evaluateFilterNode(collection: string, record: MockRecord, node: FilterNode): boolean {
    if (node.type === "and") {
      return this.evaluateFilterNode(collection, record, node.left)
        && this.evaluateFilterNode(collection, record, node.right);
    }

    if (node.type === "or") {
      return this.evaluateFilterNode(collection, record, node.left)
        || this.evaluateFilterNode(collection, record, node.right);
    }

    const values = this.resolveValues(collection, record, node.field.split(".")).map(coerceComparable);
    const expected = String(node.value ?? "");

    if (node.operator === "=") {
      return values.some((value) => value === expected);
    }

    if (node.operator === "!=") {
      return values.every((value) => value !== expected);
    }

    return values.some((value) => value.toLowerCase().includes(expected.toLowerCase()));
  }

  private applyFilter(collection: string, records: MockRecord[], filter: string) {
    const node = parseFilter(filter);

    if (!node) {
      return records;
    }

    return records.filter((record) => this.evaluateFilterNode(collection, record, node));
  }

  private applySort(collection: string, records: MockRecord[], sort: string) {
    const sortFields = sort.split(",").map((value) => value.trim()).filter(Boolean);

    if (!sortFields.length) {
      return records;
    }

    return [...records].sort((left, right) => {
      for (const sortField of sortFields) {
        const direction = sortField.startsWith("-") ? -1 : 1;
        const field = sortField.replace(/^-/, "");
        const leftValue = coerceComparable(this.resolveValues(collection, left, field.split("."))[0]);
        const rightValue = coerceComparable(this.resolveValues(collection, right, field.split("."))[0]);

        if (leftValue === rightValue) {
          continue;
        }

        return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * direction;
      }

      return 0;
    });
  }

  private expandRecord(collection: string, record: MockRecord, expandTree: ExpandTree): MockRecord {
    const nextRecord = deepClone(record);

    if (expandTree.size === 0) {
      return nextRecord;
    }

    nextRecord.expand = nextRecord.expand ? deepClone(nextRecord.expand) : {};

    for (const [field, children] of expandTree.entries()) {
      const relation = this.getRelation(collection, field);

      if (!relation) {
        continue;
      }

      const rawValue = nextRecord[field];

      if (rawValue === undefined || rawValue === null || rawValue === "") {
        nextRecord.expand[field] = relation.many ? [] : null;
        continue;
      }

      const childTree = children as ExpandTree;

      if (relation.many || Array.isArray(rawValue)) {
        nextRecord.expand[field] = (Array.isArray(rawValue) ? rawValue : [rawValue]).map((relatedId) => {
          const relatedRecord = this.getById(relation.collection, String(relatedId));
          return relatedRecord ? this.expandRecord(relation.collection, relatedRecord, childTree) : null;
        }).filter(Boolean);
        continue;
      }

      const relatedRecord = this.getById(relation.collection, String(rawValue));
      nextRecord.expand[field] = relatedRecord
        ? this.expandRecord(relation.collection, relatedRecord, childTree)
        : null;
    }

    return nextRecord;
  }
}
