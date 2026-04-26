import Box from "@cloudscape-design/components/box";
import CollectionPreferences from "@cloudscape-design/components/collection-preferences";
import type { CollectionPreferencesProps } from "@cloudscape-design/components/collection-preferences";
import Pagination from "@cloudscape-design/components/pagination";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import type { TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import React from "react";

type ResourceTableProps<T> = {
  collectionName: string;
  items: T[];
  loading: boolean;
  loadingText: string;
  emptyText: string;
  columnDefinitions: TableProps.ColumnDefinition<T>[];
  currentPageIndex: number;
  pagesCount: number;
  pageSize: number;
  totalItems: number;
  header?: React.ReactNode;
  actions?: React.ReactNode;
  filterText?: string;
  filteringPlaceholder?: string;
  onFilterChange?: (value: string) => void;
  filteringControl?: React.ReactNode;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  trackBy?: string;
  labels?: {
    preferencesTitle: string;
    confirmLabel: string;
    cancelLabel: string;
    pageSizeTitle: string;
    wrapLinesLabel: string;
    stripedRowsLabel: string;
    columnsTitle: string;
    formatRecordsLabel: (count: number) => string;
  };
};

export function ResourceTable<T>(props: ResourceTableProps<T>) {
  const {
    collectionName,
    items,
    loading,
    loadingText,
    emptyText,
    columnDefinitions,
    currentPageIndex,
    pagesCount,
    pageSize,
    totalItems,
    header,
    actions,
    filterText = "",
    filteringPlaceholder = "Buscar...",
    onFilterChange,
    filteringControl,
    pageSizeOptions = [10, 30, 50, 100],
    onPageChange,
    onPageSizeChange,
    trackBy = "id",
    labels,
  } = props;

  const tableLabels = React.useMemo(() => ({
    preferencesTitle: labels?.preferencesTitle ?? "Preferences",
    confirmLabel: labels?.confirmLabel ?? "Apply",
    cancelLabel: labels?.cancelLabel ?? "Cancel",
    pageSizeTitle: labels?.pageSizeTitle ?? "Page size",
    wrapLinesLabel: labels?.wrapLinesLabel ?? "Wrap lines",
    stripedRowsLabel: labels?.stripedRowsLabel ?? "Striped rows",
    columnsTitle: labels?.columnsTitle ?? "Columns",
    formatRecordsLabel: labels?.formatRecordsLabel ?? ((count: number) => `${count} records`),
  }), [labels]);

  const preferencesStorageId = React.useMemo(
    () => `${collectionName}-${collectionName.length}-${columnDefinitions.map((column) => column.id?.[0] ?? "x").join("")}`,
    [collectionName, columnDefinitions],
  );
  const defaultPreferences = React.useMemo<CollectionPreferencesProps.Preferences>(() => ({
    pageSize,
    wrapLines: false,
    stripedRows: false,
    contentDisplay: columnDefinitions.map((column) => ({
      id: String(column.id),
      visible: true,
    })),
  }), [columnDefinitions, pageSize]);
  const [preferences, setPreferences] = React.useState<CollectionPreferencesProps.Preferences>(defaultPreferences);

  React.useEffect(() => {
    setPreferences(defaultPreferences);
  }, [defaultPreferences]);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(preferencesStorageId);

    if (!stored) {
      window.localStorage.setItem(preferencesStorageId, JSON.stringify(defaultPreferences));
      return;
    }

    try {
      const parsed = JSON.parse(stored) as CollectionPreferencesProps.Preferences;
      setPreferences({
        ...defaultPreferences,
        ...parsed,
      });
    } catch {
      window.localStorage.setItem(preferencesStorageId, JSON.stringify(defaultPreferences));
    }
  }, [defaultPreferences, preferencesStorageId]);

  const visibleColumns = React.useMemo(() => {
    const visibilityMap = new Map((preferences.contentDisplay ?? []).map((item) => [item.id, item.visible !== false]));
    return columnDefinitions.filter((column) => visibilityMap.get(String(column.id)) !== false);
  }, [columnDefinitions, preferences.contentDisplay]);

  const savePreferences = React.useCallback((nextPreferences: CollectionPreferencesProps.Preferences) => {
    setPreferences(nextPreferences);
    window.localStorage.setItem(preferencesStorageId, JSON.stringify(nextPreferences));
  }, [preferencesStorageId]);

  return (
    <SpaceBetween size="m">
      {header}
      {filteringControl ?? (typeof onFilterChange === "function" ? (
        <TextFilter
          filteringText={filterText}
          filteringPlaceholder={filteringPlaceholder}
          countText=""
          onChange={({ detail }) => onFilterChange(detail.filteringText)}
        />
      ) : null)}
      <Table
        items={items}
        columnDefinitions={visibleColumns}
        columnDisplay={(preferences.contentDisplay ?? []) as TableProps.ColumnDisplayProperties[]}
        loading={loading}
        loadingText={loadingText}
        trackBy={trackBy}
        stickyHeader
        resizableColumns
        wrapLines={Boolean(preferences.wrapLines)}
        stripedRows={Boolean(preferences.stripedRows)}
        empty={(
          <Box variant="p" textAlign="center" className="plugin-empty">
            {emptyText}
          </Box>
        )}
        pagination={(
          <SpaceBetween direction="horizontal" size="xs">
            {actions}
            <Pagination
              currentPageIndex={currentPageIndex}
              pagesCount={pagesCount}
              disabled={loading}
              onChange={({ detail }) => onPageChange(detail.currentPageIndex)}
            />
            <CollectionPreferences
              title={tableLabels.preferencesTitle}
              confirmLabel={tableLabels.confirmLabel}
              cancelLabel={tableLabels.cancelLabel}
              preferences={preferences}
              onConfirm={({ detail }) => {
                savePreferences(detail);

                if (detail.pageSize) {
                  onPageSizeChange(Number(detail.pageSize));
                }
              }}
              pageSizePreference={{
                title: tableLabels.pageSizeTitle,
                options: pageSizeOptions.map((value) => ({ value, label: tableLabels.formatRecordsLabel(value) })),
              }}
              wrapLinesPreference={{ label: tableLabels.wrapLinesLabel }}
              stripedRowsPreference={{ label: tableLabels.stripedRowsLabel }}
              contentDisplayPreference={{
                title: tableLabels.columnsTitle,
                options: columnDefinitions.map((column) => ({
                  id: String(column.id),
                  label: typeof column.header === "string" ? column.header : String(column.id),
                })),
              }}
            />
            <Box variant="small" color="text-body-secondary">
              {tableLabels.formatRecordsLabel(totalItems)}
            </Box>
          </SpaceBetween>
        )}
      />
    </SpaceBetween>
  );
}
