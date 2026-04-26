import type { Theme } from "@cloudscape-design/components/theming";

export type PluginRecord = {
  id: string;
  created?: string;
  updated?: string;
  expand?: Record<string, any>;
  [key: string]: any;
};

export type ListResult<T> = {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: T[];
};

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
  tags?: string[];
  data?: unknown;
};

export type PluginRuntimeConfig = {
  theme: string;
  language: string;
  cloudscapeTheme?: Theme;
  targetOrigin: string;
  installedPluginId: string;
  pluginId: string;
  pluginVersion: string;
};

export type FlashMessage = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  content: string;
};
