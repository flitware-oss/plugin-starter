import { applyDensity, applyMode, Density, Mode } from "@cloudscape-design/global-styles";
import { applyTheme as applyCloudscapeTheme, type Theme } from "@cloudscape-design/components/theming";
import React from "react";
import type { PluginRuntimeConfig } from "../types";

const RUNTIME_SYNC_EVENT = "flitware:runtime-sync";

type RuntimeSyncMessage = {
  type: typeof RUNTIME_SYNC_EVENT;
  payload?: {
    theme?: string;
    language?: string;
    cloudscapeTheme?: Theme;
  };
};

const defaultRuntime: PluginRuntimeConfig = {
  theme: "light",
  language: "es",
  cloudscapeTheme: undefined,
  targetOrigin: "*",
  installedPluginId: "",
  pluginId: "",
  pluginVersion: "0.0.0",
};

let cloudscapeThemeResetHandle: ReturnType<typeof applyCloudscapeTheme> | null = null;

export function readRuntimeConfig(): PluginRuntimeConfig {
  const config = window.__PLUGIN_CONFIG__;

  return {
    theme: config?.theme ?? defaultRuntime.theme,
    language: config?.language ?? defaultRuntime.language,
    cloudscapeTheme: config?.cloudscapeTheme,
    targetOrigin: config?.fluxProxy?.targetOrigin ?? defaultRuntime.targetOrigin,
    installedPluginId: config?.plugin?.installedPluginId ?? defaultRuntime.installedPluginId,
    pluginId: config?.plugin?.pluginId ?? defaultRuntime.pluginId,
    pluginVersion: config?.plugin?.version ?? defaultRuntime.pluginVersion,
  };
}

export function applyPluginRuntimeAppearance(
  runtime: Pick<PluginRuntimeConfig, "theme" | "language" | "cloudscapeTheme">,
) {
  const mode = runtime.theme === "dark" ? Mode.Dark : Mode.Light;

  applyMode(mode);
  applyDensity(Density.Comfortable);
  document.body.classList.remove("awsui-light-mode", "awsui-dark-mode");
  document.body.classList.add(mode === Mode.Dark ? "awsui-dark-mode" : "awsui-light-mode");
  document.documentElement.classList.remove("awsui-light-mode", "awsui-dark-mode");
  document.documentElement.classList.add(mode === Mode.Dark ? "awsui-dark-mode" : "awsui-light-mode");
  document.body.style.colorScheme = mode === Mode.Dark ? "dark" : "light";
  document.documentElement.style.colorScheme = mode === Mode.Dark ? "dark" : "light";
  document.documentElement.lang = runtime.language || "es";

  cloudscapeThemeResetHandle?.reset();
  cloudscapeThemeResetHandle = null;

  if (!runtime.cloudscapeTheme) {
    return;
  }

  cloudscapeThemeResetHandle = applyCloudscapeTheme({
    theme: runtime.cloudscapeTheme,
  });
}

const PluginRuntimeContext = React.createContext<PluginRuntimeConfig>(defaultRuntime);

export function PluginRuntimeProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const [runtime, setRuntime] = React.useState<PluginRuntimeConfig>(() => readRuntimeConfig());

  React.useLayoutEffect(() => {
    applyPluginRuntimeAppearance(runtime);
  }, [runtime]);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent<RuntimeSyncMessage>) => {
      if (event.data?.type !== RUNTIME_SYNC_EVENT) {
        return;
      }

      setRuntime((current) => ({
        ...current,
        theme: event.data.payload?.theme ?? current.theme,
        language: event.data.payload?.language ?? current.language,
        cloudscapeTheme: event.data.payload?.cloudscapeTheme ?? current.cloudscapeTheme,
      }));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <PluginRuntimeContext.Provider value={runtime}>
      {children}
    </PluginRuntimeContext.Provider>
  );
}

export function usePluginRuntime() {
  return React.useContext(PluginRuntimeContext);
}
