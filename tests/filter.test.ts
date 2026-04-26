import test from "node:test";
import assert from "node:assert/strict";
import { buildCaseInsensitiveContainsFilter, escapeFilterValue, joinFilterParts } from "../app/utils/filter.js";

test("filter utilities escape special characters", () => {
  assert.equal(escapeFilterValue('a\\b"c'), 'a\\\\b\\"c');
});

test("filter utilities build case insensitive contains expression", () => {
  assert.equal(
    buildCaseInsensitiveContainsFilter(["name", "email"], "Juan"),
    'name ~ "Juan" || name ~ "JUAN" || email ~ "Juan" || email ~ "JUAN"',
  );
});

test("filter utilities join only meaningful parts", () => {
  assert.equal(
    joinFilterParts(["status = \"done\"", "", undefined, "assignee = \"user_1\""]),
    '(status = "done") && (assignee = "user_1")',
  );
  assert.equal(joinFilterParts(["", "  ", null]), "");
});

test("filter utilities trim query values before composing expressions", () => {
  assert.equal(
    buildCaseInsensitiveContainsFilter(["username"], "  juan  "),
    'username ~ "juan" || username ~ "JUAN"',
  );
  assert.equal(
    buildCaseInsensitiveContainsFilter(["username"], undefined as unknown as string),
    'username ~ "" || username ~ ""',
  );
});
