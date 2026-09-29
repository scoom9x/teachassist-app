// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { RefreshInterval, PreferenceSwitch } from "../src/PreferenceControls";

it("keeps custom intervals editable and commits valid minute bounds", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const change = vi.fn();
  await act(async () =>
    root.render(<RefreshInterval value={17} onChange={change} />),
  );
  const number = host.querySelector<HTMLInputElement>('input[type="number"]')!;
  expect(number.value).toBe("17");
  expect(host.querySelector("details")!.open).toBe(false);
  const set = async (value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(number, value);
      number.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () =>
      number.dispatchEvent(new FocusEvent("focusout", { bubbles: true })),
    );
  };
  await set("2");
  expect(change).toHaveBeenLastCalledWith(5);
  await set("2000");
  expect(change).toHaveBeenLastCalledWith(1440);
  await set("0");
  expect(change).toHaveBeenLastCalledWith(0);
  await set("");
  expect(number.value).toBe("17");
  await act(async () => root.unmount());
  host.remove();
});
it("exposes accessible switches and respects disabled settings", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const change = vi.fn();
  await act(async () =>
    root.render(
      <PreferenceSwitch label="Privacy blur" checked={false} onChange={change}>
        Hide marks.
      </PreferenceSwitch>,
    ),
  );
  await act(async () =>
    host.querySelector<HTMLInputElement>('[role="switch"]')!.click(),
  );
  expect(change).toHaveBeenCalledWith(true);
  await act(async () =>
    root.render(
      <PreferenceSwitch
        label="Privacy blur"
        checked={false}
        disabled
        onChange={change}
      >
        Hide marks.
      </PreferenceSwitch>,
    ),
  );
  change.mockClear();
  await act(async () =>
    host.querySelector<HTMLInputElement>('[role="switch"]')!.click(),
  );
  expect(change).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});
