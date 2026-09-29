import { registerPlugin, type TeachAssistPlugin } from "./extensions";
// Plugins are trusted, reviewed source modules bundled with the app.
const plugins = import.meta.glob<{ default: TeachAssistPlugin }>(
  "./plugins/*/index.tsx",
  { eager: true },
);
for (const module of Object.values(plugins)) {
  try {
    registerPlugin(module.default);
  } catch (error) {
    console.error("Could not register plugin", error);
  }
}
