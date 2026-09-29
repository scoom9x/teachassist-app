// @vitest-environment jsdom
import React, { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { readCustomTheme, saveCustomTheme } from "../src/customTheme";
import {
  ExtensionSlot,
  registerPlugin,
  setPluginEnabled,
} from "../src/extensions";
it("persists and removes a CSS theme without inserting HTML", () => {
  saveCustomTheme({
    name: "Test",
    css: ":root {--ta-color-accent: red;} /* </style><script> */",
  });
  expect(readCustomTheme()?.name).toBe("Test");
  expect(
    document.querySelector("#teach-assist-custom-theme")?.textContent,
  ).toContain("--ta-color-accent");
  expect(document.querySelector("script")).toBeNull();
  saveCustomTheme(null);
  expect(readCustomTheme()).toBeNull();
  expect(
    document.querySelector("#teach-assist-custom-theme")?.textContent,
  ).toBe("");
});
it("mounts plugins only in their slot and unmounts disabled views", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const cleanup = vi.fn();
  function View() {
    useEffect(() => cleanup, []);
    return <p>Example plugin</p>;
  }
  const unregister = registerPlugin({
    id: "test-plugin",
    name: "Test",
    version: "1",
    apiVersion: 1,
    slots: { "dashboard.after": View },
  });
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <ExtensionSlot
        name="dashboard.after"
        context={{ page: "dashboard", courseId: null }}
      />,
    ),
  );
  expect(host.textContent).toContain("Example plugin");
  await act(async () => setPluginEnabled("test-plugin", false));
  expect(host.textContent).not.toContain("Example plugin");
  expect(cleanup).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
  setPluginEnabled("test-plugin", true);
  unregister();
});
