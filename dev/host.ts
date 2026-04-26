import { FluxProxy, type ProxyBridge } from "flux-proxy";
import { createTaskMockEnvironment } from "./task-dev-data";
import { flitwareCloudscapeTheme } from "./flitware-theme";

type RuntimeConfig = {
  theme: "light" | "dark";
  language: "es" | "en";
  pluginVersion: string;
};

type BootstrapConfig = {
  runtime: RuntimeConfig;
};

type FluxProxyParentClientStatic = {
  onMessage: (
    data: unknown,
    handler: ProxyBridge,
    dataSource: <G>(message: Record<string, any>) => Promise<G>,
    target?: string,
    ignoreSources?: string[],
  ) => Promise<void>;
};

declare global {
  interface Window {
    __PLUGIN_DEV_BOOTSTRAP__?: BootstrapConfig;
    __PLUGIN_DEV_CONFIG__?: Record<string, unknown>;
    __PLUGIN_DEV_DATABASE__?: ReturnType<typeof createTaskMockEnvironment>["database"];
  }
}

const RUNTIME_SYNC_EVENT = "flitware:runtime-sync";
const parentClient = FluxProxy.parentClient.constructor as unknown as FluxProxyParentClientStatic;
const environment = createTaskMockEnvironment();
const iframe = document.getElementById("plugin-preview") as HTMLIFrameElement | null;
const themeSelect = document.getElementById("theme-select") as HTMLSelectElement | null;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement | null;
const versionBadge = document.getElementById("plugin-version") as HTMLSpanElement | null;
const reloadButton = document.getElementById("reload-plugin") as HTMLButtonElement | null;
const resetButton = document.getElementById("reset-mocks") as HTMLButtonElement | null;
const hostStatus = document.getElementById("host-status") as HTMLParagraphElement | null;

function readBootstrapConfig(): RuntimeConfig {
  const bootstrap = window.__PLUGIN_DEV_BOOTSTRAP__?.runtime;

  return {
    theme: bootstrap?.theme === "dark" ? "dark" : "light",
    language: bootstrap?.language === "en" ? "en" : "es",
    pluginVersion: String(bootstrap?.pluginVersion ?? "0.1.0").trim() || "0.1.0",
  };
}

let runtime = readBootstrapConfig();

function buildPluginConfig() {
  return {
    theme: runtime.theme,
    language: runtime.language,
    cloudscapeTheme: flitwareCloudscapeTheme,
    fluxProxy: {
      targetOrigin: window.location.origin,
    },
    plugin: {
      installedPluginId: "dev-installed-plugin",
      pluginId: "dev-tasks-plugin",
      version: runtime.pluginVersion,
    },
  };
}

function updateHostShell() {
  document.documentElement.dataset.theme = runtime.theme;

  if (themeSelect) {
    themeSelect.value = runtime.theme;
  }

  if (languageSelect) {
    languageSelect.value = runtime.language;
  }

  if (versionBadge) {
    versionBadge.textContent = `v${runtime.pluginVersion}`;
  }

  if (hostStatus) {
    hostStatus.textContent = runtime.language === "en"
      ? "Local host ready with mock collections and flux-proxy bridge."
      : "Host local listo con colecciones mock y bridge de flux-proxy.";
  }
}

function setWindowPluginConfig() {
  window.__PLUGIN_DEV_CONFIG__ = buildPluginConfig();
}

function syncRuntimeToPlugin() {
  iframe?.contentWindow?.postMessage({
    type: RUNTIME_SYNC_EVENT,
    payload: {
      theme: runtime.theme,
      language: runtime.language,
      cloudscapeTheme: flitwareCloudscapeTheme,
    },
  }, window.location.origin);
}

function reloadIframe() {
  if (!iframe) {
    return;
  }

  iframe.src = `./plugin-frame.html?ts=${Date.now()}`;
}

function buildMessageBridge(source: MessageEventSource): ProxyBridge | null {
  if (!source || typeof source !== "object" || !("postMessage" in source)) {
    return null;
  }

  const postMessage = source.postMessage as (event: unknown, targetOrigin?: string) => void;

  return {
    postMessage: (event, targetOrigin = "*") => {
      postMessage(event, targetOrigin);
    },
  };
}

window.__PLUGIN_DEV_DATABASE__ = environment.database;
setWindowPluginConfig();
updateHostShell();

themeSelect?.addEventListener("change", () => {
  runtime = {
    ...runtime,
    theme: themeSelect.value === "dark" ? "dark" : "light",
  };
  setWindowPluginConfig();
  updateHostShell();
  syncRuntimeToPlugin();
});

languageSelect?.addEventListener("change", () => {
  runtime = {
    ...runtime,
    language: languageSelect.value === "en" ? "en" : "es",
  };
  setWindowPluginConfig();
  updateHostShell();
  syncRuntimeToPlugin();
});

reloadButton?.addEventListener("click", () => {
  setWindowPluginConfig();
  reloadIframe();
});

resetButton?.addEventListener("click", () => {
  environment.database.reset();
  reloadIframe();
});

iframe?.addEventListener("load", () => {
  setWindowPluginConfig();
  syncRuntimeToPlugin();
});

window.addEventListener("message", (event) => {
  if (!iframe?.contentWindow || event.source !== iframe.contentWindow) {
    return;
  }

  const bridge = buildMessageBridge(event.source);

  if (!bridge) {
    return;
  }

  void parentClient.onMessage(
    event.data,
    bridge,
    (message) => environment.resolveMessage(message) as Promise<any>,
    window.location.origin,
  );
});
