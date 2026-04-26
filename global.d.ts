import type { Theme } from "@cloudscape-design/components/theming";

export {};

declare global {
  interface Window {
    __PLUGIN_CONFIG__?: {
      theme?: string;
      language?: string;
      cloudscapeTheme?: Theme;
      fluxProxy?: {
        targetOrigin?: string;
      };
      plugin?: {
        installedPluginId?: string;
        pluginId?: string;
        version?: string;
      };
    };
  }
}

declare module "*.css";
