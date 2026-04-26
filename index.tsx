import React from "react";
import ReactDOM from "react-dom/client";
import "@cloudscape-design/global-styles/index.css";
import "./style.css";
import App from "./app/app";
import { applyPluginRuntimeAppearance, readRuntimeConfig } from "./app/runtime/plugin-runtime";

applyPluginRuntimeAppearance(readRuntimeConfig());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />,
);
