import test from "node:test";
import assert from "node:assert/strict";
import {
  compareDateTime,
  formatDateOnlyLabel,
  formatDatePickerValue,
  normalizeDateOnlyValue,
  toDateTimeBoundary,
} from "../app/utils/date.js";

test("date utilities format and normalize valid values", () => {
  assert.equal(formatDatePickerValue("2026-04-25 13:45:00"), "2026/04/25");
  assert.equal(formatDatePickerValue("2026-04-25"), "2026/04/25");
  assert.equal(normalizeDateOnlyValue("2026/04/25"), "2026-04-25");
  assert.equal(formatDateOnlyLabel("2026-04-25 00:00:00"), "2026-04-25");
});

test("date utilities gracefully handle invalid values", () => {
  assert.equal(formatDatePickerValue(""), "");
  assert.equal(formatDatePickerValue(undefined), "");
  assert.equal(normalizeDateOnlyValue("not-a-date"), "");
  assert.equal(normalizeDateOnlyValue("2026-13-40"), "");
  assert.equal(formatDateOnlyLabel(undefined), "—");
  assert.equal(toDateTimeBoundary("", "start"), null);
  assert.ok(Number.isNaN(compareDateTime(undefined, undefined)));
});

test("date utilities build boundaries and compare ranges", () => {
  assert.equal(toDateTimeBoundary("2026-04-25", "start"), "2026-04-25 00:00:00");
  assert.equal(toDateTimeBoundary("2026-04-25", "end"), "2026-04-25 23:59:00");
  assert.ok(compareDateTime("2026-04-25 00:00:00", "2026-04-24 23:59:00") > 0);
  assert.ok(compareDateTime("2026-04-25", "2026-04-25") === 0);
  assert.ok(Number.isNaN(compareDateTime("invalid", "2026-04-25")));
  assert.ok(Number.isNaN(compareDateTime("2026-04-25", "invalid")));
});

test("date utilities normalize iso strings and incomplete time fragments", () => {
  assert.equal(formatDatePickerValue("2026-04-25T09:30:00.000Z"), "2026/04/25");
  assert.equal(formatDatePickerValue("2026-04-25T09:30Z"), "2026/04/25");
  assert.equal(normalizeDateOnlyValue("2026-04-25 9:30"), "2026-04-25");
  assert.equal(normalizeDateOnlyValue(null), "");
});
