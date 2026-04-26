import React from "react";
import { PluginRuntimeProvider } from "./runtime/plugin-runtime";
import TaskDashboard from "./screens/task-dashboard";

export default function App() {
  return (
    <PluginRuntimeProvider>
      <TaskDashboard />
    </PluginRuntimeProvider>
  );
}
