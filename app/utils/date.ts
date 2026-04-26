function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateOnly(value?: string | null) {
  const normalized = String(value ?? "").trim().slice(0, 10).replaceAll("/", "-");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function parseDateTime(value?: string | null) {
  const normalized = String(value ?? "").trim().replace("T", " ").replace(/:\d{2}\.\d+Z$/, "").replace(/Z$/, "");

  if (!normalized) {
    return null;
  }

  const datePart = normalized.slice(0, 10);
  const date = parseDateOnly(datePart);

  if (!date) {
    return null;
  }

  const timePart = normalized.slice(11, 16);
  const [hours, minutes] = /^\d{2}:\d{2}$/.test(timePart) ? timePart.split(":").map(Number) : [0, 0];
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

export function formatDatePickerValue(value?: string | null) {
  const parsed = parseDateTime(value) ?? parseDateOnly(value);

  if (!parsed) {
    return "";
  }

  return buildDateString(parsed).replaceAll("-", "/");
}

export function normalizeDateOnlyValue(value?: string | null) {
  const parsed = parseDateTime(value) ?? parseDateOnly(value);

  if (!parsed) {
    return "";
  }

  return buildDateString(parsed);
}

export function formatDateOnlyLabel(value?: string | null) {
  return normalizeDateOnlyValue(value) || "—";
}

export function toDateTimeBoundary(value: string, boundary: "start" | "end") {
  const normalizedDate = normalizeDateOnlyValue(value);

  if (!normalizedDate) {
    return null;
  }

  return `${normalizedDate} ${boundary === "start" ? "00:00:00" : "23:59:00"}`;
}

export function compareDateTime(left?: string | null, right?: string | null) {
  const leftTime = parseDateTime(left)?.getTime() ?? parseDateOnly(left)?.getTime() ?? Number.NaN;
  const rightTime = parseDateTime(right)?.getTime() ?? parseDateOnly(right)?.getTime() ?? Number.NaN;

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return Number.NaN;
  }

  return leftTime - rightTime;
}
