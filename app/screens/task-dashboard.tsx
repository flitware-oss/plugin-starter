import Alert from "@cloudscape-design/components/alert";
import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import Select from "@cloudscape-design/components/select";
import type { SelectProps } from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import type { TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import Textarea from "@cloudscape-design/components/textarea";
import Wizard from "@cloudscape-design/components/wizard";
import React from "react";
import { usePluginApi } from "../api/plugin-client";
import { PluginDateField } from "../components/plugin-date-field";
import { RelationAutosuggest } from "../components/relation-autosuggest";
import { ResourceTable } from "../components/resource-table";
import { usePluginRuntime } from "../runtime/plugin-runtime";
import type { FlashMessage, ListResult, PluginRecord, SelectOption } from "../types";
import { compareDateTime, formatDateOnlyLabel, normalizeDateOnlyValue, toDateTimeBoundary } from "../utils/date";
import { buildCaseInsensitiveContainsFilter, joinFilterParts } from "../utils/filter";
import { useDebouncedValue } from "../utils/use-debounced-value";

type LookupRecord = PluginRecord & {
  name?: string;
  description?: string;
};

type UserRecord = PluginRecord & {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
};

type TaskRecord = PluginRecord & {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  assignee?: string;
  expand?: {
    status?: LookupRecord | null;
    assignee?: UserRecord | null;
  };
};

type TaskFormState = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  statusId: string;
  assigneeId: string;
};

type Dictionary = {
  pageTitle: string;
  pageDescription: string;
  tasks: string;
  records: string;
  completed: string;
  inProgress: string;
  newTask: string;
  editTask: string;
  loading: string;
  loadingOptions: string;
  emptyTasks: string;
  noOptionsAvailable: string;
  minSearchHint: string;
  cancel: string;
  save: string;
  create: string;
  review: string;
  actions: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  assignee: string;
  taskDetailsStep: string;
  assignmentStep: string;
  reviewStep: string;
  invalidStep: string;
  saveSuccessTask: string;
  saveError: string;
  searchPlaceholder: string;
  generalError: string;
  assigneeHelp: string;
  statusFilterLabel: string;
  assigneeFilterLabel: string;
};

const ES: Dictionary = {
  pageTitle: "Starter de Tareas",
  pageDescription: "Gestiona tareas con una base profesional para plugins Flitware reutilizando flux-proxy, Cloudscape y mocks locales.",
  tasks: "Tareas",
  records: "Registros",
  completed: "Completadas",
  inProgress: "En progreso",
  newTask: "Nueva tarea",
  editTask: "Editar tarea",
  loading: "Cargando datos...",
  loadingOptions: "Cargando opciones...",
  emptyTasks: "No hay tareas registradas todavía.",
  noOptionsAvailable: "No hay opciones disponibles.",
  minSearchHint: "Escribe al menos 3 caracteres para buscar.",
  cancel: "Cancelar",
  save: "Guardar cambios",
  create: "Crear",
  review: "Resumen",
  actions: "Acciones",
  title: "Titulo",
  description: "Descripcion",
  startDate: "Fecha de inicio",
  endDate: "Fecha de finalizacion",
  status: "Estado",
  assignee: "Usuario asignado",
  taskDetailsStep: "Detalles",
  assignmentStep: "Asignacion",
  reviewStep: "Revision",
  invalidStep: "Completa los campos requeridos antes de continuar.",
  saveSuccessTask: "Tarea guardada correctamente.",
  saveError: "No se pudo guardar la informacion.",
  searchPlaceholder: "Buscar tareas...",
  generalError: "No fue posible completar la operacion.",
  assigneeHelp: "Busca usuarios por nombre, username, email o telefono.",
  statusFilterLabel: "Filtrar por estado",
  assigneeFilterLabel: "Filtrar por usuario",
};

const EN: Dictionary = {
  pageTitle: "Task Starter",
  pageDescription: "Manage tasks with a professional Flitware plugin base powered by flux-proxy, Cloudscape and local mocks.",
  tasks: "Tasks",
  records: "Records",
  completed: "Completed",
  inProgress: "In progress",
  newTask: "New task",
  editTask: "Edit task",
  loading: "Loading data...",
  loadingOptions: "Loading options...",
  emptyTasks: "There are no tasks yet.",
  noOptionsAvailable: "No options available.",
  minSearchHint: "Type at least 3 characters to search.",
  cancel: "Cancel",
  save: "Save changes",
  create: "Create",
  review: "Summary",
  actions: "Actions",
  title: "Title",
  description: "Description",
  startDate: "Start date",
  endDate: "End date",
  status: "Status",
  assignee: "Assignee",
  taskDetailsStep: "Details",
  assignmentStep: "Assignment",
  reviewStep: "Review",
  invalidStep: "Complete the required fields before continuing.",
  saveSuccessTask: "Task saved successfully.",
  saveError: "The task could not be saved.",
  searchPlaceholder: "Search tasks...",
  generalError: "The operation could not be completed.",
  assigneeHelp: "Search users by name, username, email or phone.",
  statusFilterLabel: "Filter by status",
  assigneeFilterLabel: "Filter by assignee",
};

const TASKS_COLLECTION = "tasks";
const TASK_STATUS_COLLECTION = "task_status";
const USERS_COLLECTION = "users";
const MIN_AUTOSUGGEST_QUERY_LENGTH = 3;

function isAutoCancelledError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return normalized.includes("autocancelled") || normalized.includes("auto-cancellation");
}

function usePagedRecords<T extends PluginRecord>(loader: (page: number, pageSize: number) => Promise<ListResult<T>>) {
  const [items, setItems] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [pagesCount, setPagesCount] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);
  const [reloadToken, setReloadToken] = React.useState(0);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loader(currentPageIndex, pageSize);
      setItems(result.items ?? []);
      setPagesCount(Math.max(result.totalPages ?? 1, 1));
      setTotalItems(result.totalItems ?? 0);
    } catch (error) {
      if (!isAutoCancelledError(error)) {
        setError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setLoading(false);
    }
  }, [currentPageIndex, loader, pageSize, reloadToken]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    items,
    loading,
    error,
    currentPageIndex,
    pageSize,
    pagesCount,
    totalItems,
    setCurrentPageIndex,
    setPageSize: (value: number) => {
      setPageSize(value);
      setCurrentPageIndex(1);
    },
    reload: () => setReloadToken((value) => value + 1),
  };
}

function useLookupRecords<T extends PluginRecord>(loader: () => Promise<T[]>) {
  const [items, setItems] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    void loader()
      .then((value) => {
        if (active) {
          setItems(value);
        }
      })
      .catch((error) => {
        if (active && !isAutoCancelledError(error)) {
          setError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loader]);

  return {
    items,
    loading,
    error,
  };
}

function useRemoteSearchRecords<T extends PluginRecord>(params: {
  query: string;
  loader: (query: string) => Promise<T[]>;
  enabled?: boolean;
}) {
  const { query, loader, enabled = true } = params;
  const normalizedQuery = query.trim();
  const [items, setItems] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!enabled || !normalizedQuery || normalizedQuery.length < MIN_AUTOSUGGEST_QUERY_LENGTH) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    void loader(normalizedQuery)
      .then((nextItems) => {
        if (requestIdRef.current === requestId) {
          setItems(nextItems);
        }
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId || isAutoCancelledError(error)) {
          return;
        }

        setItems([]);
        setError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [enabled, loader, normalizedQuery]);

  return {
    items,
    loading,
    error,
  };
}

function useCountValue(loader: () => Promise<number>) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    let active = true;

    void loader()
      .then((nextValue) => {
        if (active) {
          setValue(nextValue);
        }
      })
      .catch(() => {
        if (active) {
          setValue(0);
        }
      });

    return () => {
      active = false;
    };
  }, [loader]);

  return value;
}

function normalizeKeyword(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatRecordCountLabel(count: number, language: string) {
  const safeCount = Number.isFinite(count) ? count : 0;
  return language === "en"
    ? `${safeCount} ${safeCount === 1 ? "record" : "records"}`
    : `${safeCount} ${safeCount === 1 ? "registro" : "registros"}`;
}

function getStatusIndicatorType(name?: string | null): "success" | "pending" | "stopped" | "warning" | "info" {
  const normalized = normalizeKeyword(name);

  if (normalized === "DONE") {
    return "success";
  }

  if (["TODO", "IN_PROGRESS"].includes(normalized)) {
    return "pending";
  }

  if (normalized === "BLOCKED") {
    return "warning";
  }

  return "info";
}

function getLookupStatus(loading: boolean, error?: string | null): "loading" | "error" | "finished" {
  if (loading) {
    return "loading";
  }

  if (error) {
    return "error";
  }

  return "finished";
}

function getLookupLabel(record?: LookupRecord | null) {
  return String(record?.name ?? "—").trim() || "—";
}

function getAssigneeLabel(record?: UserRecord | null) {
  const name = String(record?.name ?? "").trim();
  const username = String(record?.username ?? "").trim();
  return [name, username ? `@${username}` : ""].filter(Boolean).join(" · ") || "—";
}

function buildStatusOption(record?: LookupRecord | null): SelectOption | null {
  if (!record?.id) {
    return null;
  }

  return {
    label: getLookupLabel(record),
    value: record.id,
    description: String(record.description ?? "").trim() || undefined,
    data: record,
  };
}

function buildUserOption(record?: UserRecord | null): SelectOption | null {
  if (!record?.id) {
    return null;
  }

  return {
    label: getAssigneeLabel(record),
    value: record.id,
    description: [String(record.email ?? "").trim(), String(record.phone ?? "").trim()].filter(Boolean).join(" · ") || undefined,
    tags: [String(record.name ?? ""), String(record.username ?? ""), String(record.email ?? "")].filter(Boolean),
    data: record,
  };
}

function findOption(options: SelectOption[], id: string) {
  return options.find((option) => option.value === id) ?? null;
}

function getSelectValue(option: SelectProps.Option | SelectOption | null) {
  return String(option?.value ?? "");
}

function buildFlashItem(type: FlashMessage["type"], content: string): FlashbarProps.MessageDefinition {
  return {
    id: crypto.randomUUID(),
    type,
    content,
    dismissible: true,
  };
}

function buildTaskFormState(record?: TaskRecord | null): TaskFormState {
  return {
    title: String(record?.title ?? ""),
    description: String(record?.description ?? ""),
    startDate: normalizeDateOnlyValue(record?.start_date),
    endDate: normalizeDateOnlyValue(record?.end_date),
    statusId: String(record?.status ?? ""),
    assigneeId: String(record?.assignee ?? ""),
  };
}

function ReviewItem(props: { label: string; value: string }) {
  return (
    <div className="plugin-review-item">
      <span>{props.label}</span>
      <strong>{props.value || "—"}</strong>
    </div>
  );
}

function TaskWizard(props: {
  visible: boolean;
  saving: boolean;
  initialRecord: TaskRecord | null;
  statusOptions: SelectOption[];
  statusOptionsLoading: boolean;
  statusOptionsError?: string | null;
  searchUsers: (query: string) => Promise<UserRecord[]>;
  text: Dictionary;
  onDismiss: () => void;
  onSubmit: (value: TaskFormState) => Promise<void>;
}) {
  const {
    visible,
    saving,
    initialRecord,
    statusOptions,
    statusOptionsLoading,
    statusOptionsError,
    searchUsers,
    text,
    onDismiss,
    onSubmit,
  } = props;
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);
  const [errorText, setErrorText] = React.useState("");
  const [form, setForm] = React.useState<TaskFormState>(() => buildTaskFormState(initialRecord));
  const [assigneeSearchValue, setAssigneeSearchValue] = React.useState("");
  const [selectedAssigneeOptionState, setSelectedAssigneeOptionState] = React.useState<SelectOption | null>(buildUserOption(initialRecord?.expand?.assignee));
  const debouncedAssigneeSearchValue = useDebouncedValue(assigneeSearchValue, 300);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setActiveStepIndex(0);
    setErrorText("");
    setForm(buildTaskFormState(initialRecord));
    setAssigneeSearchValue("");
    setSelectedAssigneeOptionState(buildUserOption(initialRecord?.expand?.assignee));
  }, [initialRecord, visible]);

  const assigneeSearch = useRemoteSearchRecords<UserRecord>({
    enabled: visible,
    query: debouncedAssigneeSearchValue,
    loader: searchUsers,
  });

  const assigneeOptions = React.useMemo(() => (
    assigneeSearch.items
      .map((record) => buildUserOption(record))
      .filter((option): option is SelectOption => Boolean(option))
  ), [assigneeSearch.items]);

  const selectedStatus = findOption(statusOptions, form.statusId);
  const selectedAssignee = React.useMemo(() => (
    selectedAssigneeOptionState
    ?? findOption(assigneeOptions, form.assigneeId)
    ?? buildUserOption(initialRecord?.expand?.assignee)
  ), [assigneeOptions, form.assigneeId, initialRecord?.expand?.assignee, selectedAssigneeOptionState]);
  const statusState = getLookupStatus(statusOptionsLoading, statusOptionsError);
  const assigneeState = getLookupStatus(assigneeSearch.loading, assigneeSearch.error);

  const validateStep = React.useCallback((stepIndex: number) => {
    if (stepIndex === 0) {
      if (!form.title || !form.description || !form.startDate || !form.endDate) {
        return text.invalidStep;
      }

      const diff = compareDateTime(
        toDateTimeBoundary(form.startDate, "start"),
        toDateTimeBoundary(form.endDate, "end"),
      );

      if (!Number.isNaN(diff) && diff > 0) {
        return text.invalidStep;
      }
    }

    if (stepIndex === 1 && (!form.statusId || !form.assigneeId)) {
      return text.invalidStep;
    }

    return "";
  }, [form, text.invalidStep]);

  return (
    <Modal
      visible={visible}
      onDismiss={saving ? undefined : onDismiss}
      closeAriaLabel={text.cancel}
      size="large"
      header={initialRecord ? text.editTask : text.newTask}
      footer={null}
    >
      <SpaceBetween size="m">
        {errorText ? <Alert type="error">{errorText}</Alert> : null}
        <Wizard
          activeStepIndex={activeStepIndex}
          isLoadingNextStep={saving}
          onNavigate={({ detail }) => {
            if (detail.requestedStepIndex > activeStepIndex) {
              const nextError = validateStep(activeStepIndex);

              if (nextError) {
                setErrorText(nextError);
                return;
              }
            }

            setErrorText("");
            setActiveStepIndex(detail.requestedStepIndex);
          }}
          onCancel={onDismiss}
          onSubmit={async () => {
            const nextError = validateStep(activeStepIndex);

            if (nextError) {
              setErrorText(nextError);
              return;
            }

            await onSubmit(form);
          }}
          submitButtonText={initialRecord ? text.save : text.create}
          i18nStrings={{
            stepNumberLabel: (stepNumber) => `Step ${stepNumber}`,
            collapsedStepsLabel: (stepNumber, stepsCount) => `Step ${stepNumber} of ${stepsCount}`,
            skipToButtonLabel: (step, stepNumber) => `Go to ${step.title} ${stepNumber}`,
            navigationAriaLabel: "Steps",
            cancelButton: text.cancel,
            previousButton: "Previous",
            nextButton: "Next",
            optional: "Optional",
            submitButton: initialRecord ? text.save : text.create,
          }}
          steps={[
            {
              title: text.taskDetailsStep,
              content: (
                <div className="plugin-form-grid">
                  <FormField label={text.title}>
                    <Input
                      value={form.title}
                      onChange={({ detail }) => setForm((current) => ({ ...current, title: detail.value }))}
                    />
                  </FormField>
                  <PluginDateField
                    label={text.startDate}
                    value={form.startDate}
                    onChange={(value) => setForm((current) => ({ ...current, startDate: value }))}
                  />
                  <PluginDateField
                    label={text.endDate}
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(value) => setForm((current) => ({ ...current, endDate: value }))}
                  />
                  <FormField label={text.description}>
                    <Textarea
                      value={form.description}
                      rows={5}
                      onChange={({ detail }) => setForm((current) => ({ ...current, description: detail.value }))}
                    />
                  </FormField>
                </div>
              ),
            },
            {
              title: text.assignmentStep,
              content: (
                <div className="plugin-form-grid">
                  <FormField label={text.status}>
                    <Select
                      selectedOption={selectedStatus}
                      options={statusOptions}
                      statusType={statusState}
                      loadingText={text.loadingOptions}
                      errorText={statusOptionsError ?? undefined}
                      empty={text.noOptionsAvailable}
                      disabled={statusOptionsLoading}
                      onChange={({ detail }) => setForm((current) => ({ ...current, statusId: getSelectValue(detail.selectedOption) }))}
                    />
                  </FormField>
                  <FormField label={text.assignee} description={text.assigneeHelp}>
                    <RelationAutosuggest
                      selectedOption={selectedAssignee}
                      options={assigneeOptions}
                      value={assigneeSearchValue}
                      placeholder={text.assignee}
                      empty={assigneeSearchValue.trim().length < MIN_AUTOSUGGEST_QUERY_LENGTH ? text.minSearchHint : text.noOptionsAvailable}
                      ariaLabel={text.assignee}
                      disabled={assigneeSearch.loading}
                      statusType={assigneeState}
                      loadingText={text.loadingOptions}
                      errorText={assigneeSearch.error ?? undefined}
                      enteredTextLabel={(value) => `Use: "${value}"`}
                      onInputValueChange={setAssigneeSearchValue}
                      onChange={(option) => {
                        setSelectedAssigneeOptionState(option);
                        setForm((current) => ({ ...current, assigneeId: String(option?.value ?? "") }));
                      }}
                    />
                  </FormField>
                </div>
              ),
            },
            {
              title: text.reviewStep,
              content: (
                <div className="plugin-review-grid">
                  <ReviewItem label={text.title} value={form.title} />
                  <ReviewItem label={text.description} value={form.description} />
                  <ReviewItem label={text.startDate} value={form.startDate} />
                  <ReviewItem label={text.endDate} value={form.endDate} />
                  <ReviewItem label={text.status} value={selectedStatus?.label ?? "—"} />
                  <ReviewItem label={text.assignee} value={selectedAssignee?.label ?? "—"} />
                </div>
              ),
            },
          ]}
        />
      </SpaceBetween>
    </Modal>
  );
}

export default function TaskDashboard() {
  const api = usePluginApi();
  const runtime = usePluginRuntime();
  const text = runtime.language === "en" ? EN : ES;
  const [flashItems, setFlashItems] = React.useState<FlashbarProps.MessageDefinition[]>([]);
  const [wizardVisible, setWizardVisible] = React.useState(false);
  const [savingTask, setSavingTask] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskRecord | null>(null);
  const [tasksSearchText, setTasksSearchText] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [assigneeFilter, setAssigneeFilter] = React.useState("");
  const debouncedTasksSearchText = useDebouncedValue(tasksSearchText, 300);

  const statusLookup = useLookupRecords<LookupRecord>(React.useCallback(async () => {
    const result = await api.list<LookupRecord>(TASK_STATUS_COLLECTION, {}, 1, 100);
    return result.items;
  }, [api]));

  const usersLookup = useLookupRecords<UserRecord>(React.useCallback(async () => {
    const result = await api.list<UserRecord>(USERS_COLLECTION, {}, 1, 100);
    return result.items;
  }, [api]));

  const searchUsers = React.useCallback(async (query: string) => {
    const result = await api.list<UserRecord>(USERS_COLLECTION, {
      filter: joinFilterParts([
        buildCaseInsensitiveContainsFilter(["name", "username", "email", "phone"], query),
      ]),
    }, 1, 20);

    return result.items;
  }, [api]);

  const tasks = usePagedRecords<TaskRecord>(React.useCallback(async (page, pageSize) => {
    return await api.list<TaskRecord>(TASKS_COLLECTION, {
      sort: "-created",
      expand: "status,assignee",
      filter: joinFilterParts([
        debouncedTasksSearchText.length >= MIN_AUTOSUGGEST_QUERY_LENGTH
          ? buildCaseInsensitiveContainsFilter(["title", "description", "assignee.name", "assignee.username"], debouncedTasksSearchText)
          : "",
        statusFilter ? `status = "${statusFilter}"` : "",
        assigneeFilter ? `assignee = "${assigneeFilter}"` : "",
      ]),
    }, page, pageSize);
  }, [api, assigneeFilter, debouncedTasksSearchText, statusFilter]));

  const statusOptions = React.useMemo<SelectOption[]>(() => (
    statusLookup.items
      .map((record) => buildStatusOption(record))
      .filter((option): option is SelectOption => Boolean(option))
  ), [statusLookup.items]);

  const userOptions = React.useMemo<SelectOption[]>(() => (
    usersLookup.items
      .map((record) => buildUserOption(record))
      .filter((option): option is SelectOption => Boolean(option))
  ), [usersLookup.items]);

  const statusFilterOptions = React.useMemo<SelectProps.Options>(() => ([
    { label: runtime.language === "en" ? "All" : "Todos" , value: "" },
    ...statusOptions,
  ]), [runtime.language, statusOptions]);

  const assigneeFilterOptions = React.useMemo<SelectProps.Options>(() => ([
    { label: runtime.language === "en" ? "All" : "Todos", value: "" },
    ...userOptions,
  ]), [runtime.language, userOptions]);

  const completedStatusIds = React.useMemo(() => (
    statusLookup.items
      .filter((record) => normalizeKeyword(record.name) === "DONE")
      .map((record) => record.id)
      .filter(Boolean)
  ), [statusLookup.items]);

  const inProgressStatusIds = React.useMemo(() => (
    statusLookup.items
      .filter((record) => normalizeKeyword(record.name) === "IN_PROGRESS")
      .map((record) => record.id)
      .filter(Boolean)
  ), [statusLookup.items]);

  const completedCount = useCountValue(React.useCallback(async () => {
    if (!completedStatusIds.length) {
      return 0;
    }

    const result = await api.list<TaskRecord>(TASKS_COLLECTION, {
      filter: `(${completedStatusIds.map((id) => `status = "${id}"`).join(" || ")})`,
    }, 1, 1);
    return result.totalItems;
  }, [api, completedStatusIds]));

  const inProgressCount = useCountValue(React.useCallback(async () => {
    if (!inProgressStatusIds.length) {
      return 0;
    }

    const result = await api.list<TaskRecord>(TASKS_COLLECTION, {
      filter: `(${inProgressStatusIds.map((id) => `status = "${id}"`).join(" || ")})`,
    }, 1, 1);
    return result.totalItems;
  }, [api, inProgressStatusIds]));

  const pushFlash = React.useCallback((type: FlashMessage["type"], content: string) => {
    setFlashItems((current) => [...current, buildFlashItem(type, content)]);
  }, []);

  const dismissFlash = React.useCallback((id?: string) => {
    if (!id) {
      return;
    }

    setFlashItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const flashbarItems = React.useMemo(() => (
    flashItems.map((item) => ({
      ...item,
      onDismiss: () => dismissFlash(item.id),
    }))
  ), [dismissFlash, flashItems]);

  const handleSaveTask = React.useCallback(async (form: TaskFormState) => {
    setSavingTask(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        start_date: toDateTimeBoundary(form.startDate, "start"),
        end_date: toDateTimeBoundary(form.endDate, "end"),
        status: form.statusId,
        assignee: form.assigneeId,
      };

      if (editingTask?.id) {
        await api.update(TASKS_COLLECTION, editingTask.id, payload);
      } else {
        await api.create(TASKS_COLLECTION, payload);
      }

      setWizardVisible(false);
      setEditingTask(null);
      tasks.reload();
      pushFlash("success", text.saveSuccessTask);
    } catch (error) {
      pushFlash("error", error instanceof Error ? error.message : text.saveError);
      throw error;
    } finally {
      setSavingTask(false);
    }
  }, [api, editingTask?.id, pushFlash, tasks, text.saveError, text.saveSuccessTask]);

  const taskColumns = React.useMemo<TableProps.ColumnDefinition<TaskRecord>[]>(() => ([
    {
      id: "title",
      header: text.title,
      cell: (item) => item.title || "—",
      isRowHeader: true,
    },
    {
      id: "description",
      header: text.description,
      cell: (item) => item.description || "—",
    },
    {
      id: "status",
      header: text.status,
      cell: (item) => (
        <StatusIndicator type={getStatusIndicatorType(item.expand?.status?.name)}>
          {getLookupLabel(item.expand?.status)}
        </StatusIndicator>
      ),
    },
    {
      id: "assignee",
      header: text.assignee,
      cell: (item) => getAssigneeLabel(item.expand?.assignee),
    },
    {
      id: "start_date",
      header: text.startDate,
      cell: (item) => formatDateOnlyLabel(item.start_date),
    },
    {
      id: "end_date",
      header: text.endDate,
      cell: (item) => formatDateOnlyLabel(item.end_date),
    },
    {
      id: "actions",
      header: "",
      cell: (item) => (
        <Button ariaLabel={text.editTask} iconName="edit" onClick={() => {
          setEditingTask(item);
          setWizardVisible(true);
        }} />
      ),
    },
  ]), [text.assignee, text.description, text.editTask, text.endDate, text.startDate, text.status, text.title]);

  const filteringControl = React.useMemo(() => (
    <SpaceBetween direction="horizontal" size="s">
      <TextFilter
        filteringText={tasksSearchText}
        filteringPlaceholder={text.searchPlaceholder}
        countText=""
        onChange={({ detail }) => setTasksSearchText(detail.filteringText)}
      />
      <Select
        selectedOption={findOption(statusFilterOptions as SelectOption[], statusFilter) ?? statusFilterOptions[0] ?? null}
        options={statusFilterOptions}
        placeholder={text.statusFilterLabel}
        onChange={({ detail }) => setStatusFilter(String(detail.selectedOption.value ?? ""))}
      />
      <Select
        selectedOption={findOption(assigneeFilterOptions as SelectOption[], assigneeFilter) ?? assigneeFilterOptions[0] ?? null}
        options={assigneeFilterOptions}
        placeholder={text.assigneeFilterLabel}
        onChange={({ detail }) => setAssigneeFilter(String(detail.selectedOption.value ?? ""))}
      />
    </SpaceBetween>
  ), [assigneeFilter, assigneeFilterOptions, statusFilter, statusFilterOptions, tasksSearchText, text.assigneeFilterLabel, text.searchPlaceholder, text.statusFilterLabel]);

  const tableLabels = React.useMemo(() => ({
    preferencesTitle: runtime.language === "en" ? "Preferences" : "Preferencias",
    confirmLabel: runtime.language === "en" ? "Apply" : "Aplicar",
    cancelLabel: runtime.language === "en" ? "Cancel" : "Cancelar",
    pageSizeTitle: runtime.language === "en" ? "Page size" : "Tamano de pagina",
    wrapLinesLabel: runtime.language === "en" ? "Wrap lines" : "Ajustar lineas",
    stripedRowsLabel: runtime.language === "en" ? "Striped rows" : "Filas rayadas",
    columnsTitle: runtime.language === "en" ? "Columns" : "Columnas",
    formatRecordsLabel: (count: number) => formatRecordCountLabel(count, runtime.language),
  }), [runtime.language]);

  return (
    <div className="plugin-shell" data-theme={runtime.theme}>
      <div className="plugin-dashboard">
        <SpaceBetween size="l">
          <Flashbar items={flashbarItems} stackItems />

          <Container
            header={(
              <Header
                variant="h1"
                description={text.pageDescription}
                actions={(
                  <div className="plugin-runtime-meta">
                    <Badge color="blue">v{String(runtime.pluginVersion ?? "").trim() || "0.0.0"}</Badge>
                  </div>
                )}
              >
                {text.pageTitle}
              </Header>
            )}
          >
            <div className="plugin-summary-grid">
              <Container>
                <div className="plugin-summary-kpi">
                  <span>{text.tasks}</span>
                  <strong>{formatCompactNumber(tasks.totalItems)}</strong>
                  <Box color="text-body-secondary">{text.records}</Box>
                </div>
              </Container>
              <Container>
                <div className="plugin-summary-kpi">
                  <span>{text.completed}</span>
                  <strong>{formatCompactNumber(completedCount)}</strong>
                  <Box color="text-body-secondary">{text.records}</Box>
                </div>
              </Container>
              <Container>
                <div className="plugin-summary-kpi">
                  <span>{text.inProgress}</span>
                  <strong>{formatCompactNumber(inProgressCount)}</strong>
                  <Box color="text-body-secondary">{text.records}</Box>
                </div>
              </Container>
            </div>
          </Container>

          {statusLookup.error || usersLookup.error ? (
            <Alert type="warning">{statusLookup.error ?? usersLookup.error ?? text.generalError}</Alert>
          ) : null}

          {tasks.error ? <Alert type="error">{tasks.error}</Alert> : null}

          <ResourceTable
            collectionName="starter-tasks-table"
            items={tasks.items}
            loading={tasks.loading}
            loadingText={text.loading}
            emptyText={text.emptyTasks}
            columnDefinitions={taskColumns}
            currentPageIndex={tasks.currentPageIndex}
            pagesCount={tasks.pagesCount}
            pageSize={tasks.pageSize}
            totalItems={tasks.totalItems}
            onPageChange={tasks.setCurrentPageIndex}
            onPageSizeChange={tasks.setPageSize}
            header={<Header variant="h2">{text.tasks}</Header>}
            filteringControl={filteringControl}
            labels={tableLabels}
            actions={<Button ariaLabel={text.newTask} iconName="add-plus" variant="primary" onClick={() => {
              setEditingTask(null);
              setWizardVisible(true);
            }} />}
          />
        </SpaceBetween>
      </div>

      <TaskWizard
        visible={wizardVisible}
        saving={savingTask}
        initialRecord={editingTask}
        statusOptions={statusOptions}
        statusOptionsLoading={statusLookup.loading}
        statusOptionsError={statusLookup.error}
        searchUsers={searchUsers}
        text={text}
        onDismiss={() => {
          if (savingTask) {
            return;
          }

          setWizardVisible(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
      />
    </div>
  );
}
