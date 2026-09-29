import {
  Component,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
export const EXTENSION_API_VERSION = 1;
export type ExtensionSlotName =
  "dashboard.after" | "course.after" | "settings.after";
export interface ExtensionContext {
  page: string;
  courseId: string | null;
}
export interface TeachAssistPlugin {
  id: string;
  name: string;
  version: string;
  apiVersion: 1;
  slots: Partial<Record<ExtensionSlotName, ComponentType<ExtensionContext>>>;
}
let registry: TeachAssistPlugin[] = [];
const listeners = new Set<() => void>();
let disabled: string[] = [];
try {
  const saved = JSON.parse(
    localStorage.getItem("teach-assist.disabled-plugins.v1") ?? "[]",
  );
  if (Array.isArray(saved))
    disabled = saved.filter((value) => typeof value === "string");
} catch {
  /* Defaults remain enabled. */
}
const emit = () => {
  registry = [...registry];
  listeners.forEach((listener) => listener());
};
export function registerPlugin(plugin: TeachAssistPlugin) {
  if (
    plugin.apiVersion !== EXTENSION_API_VERSION ||
    !/^[a-z0-9][a-z0-9.-]+$/.test(plugin.id) ||
    registry.some((entry) => entry.id === plugin.id)
  )
    throw new Error(`Invalid or duplicate plugin: ${plugin.id}`);
  registry = [...registry, plugin];
  emit();
  return () => {
    registry = registry.filter((entry) => entry.id !== plugin.id);
    emit();
  };
}
export function setPluginEnabled(id: string, enabled: boolean) {
  const next = enabled
    ? disabled.filter((value) => value !== id)
    : [...new Set([...disabled, id])];
  localStorage.setItem(
    "teach-assist.disabled-plugins.v1",
    JSON.stringify(next),
  );
  disabled = next;
  emit();
}
export function usePlugins() {
  const plugins = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => registry,
  );
  return plugins.map((plugin) => ({
    ...plugin,
    enabled: !disabled.includes(plugin.id),
  }));
}
class PluginBoundary extends Component<
  { name: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="status">
        {this.props.name} could not load. Disable it in Customization.
      </p>
    ) : (
      this.props.children
    );
  }
}
export function ExtensionSlot({
  name,
  context,
}: {
  name: ExtensionSlotName;
  context: ExtensionContext;
}) {
  const plugins = usePlugins();
  return (
    <div data-slot={name} className="extension-slot">
      {plugins
        .filter((plugin) => plugin.enabled && plugin.slots[name])
        .map((plugin) => {
          const View = plugin.slots[name]!;
          return (
            <PluginBoundary key={plugin.id} name={plugin.name}>
              <div data-plugin={plugin.id}>
                <View {...context} />
              </div>
            </PluginBoundary>
          );
        })}
    </div>
  );
}
