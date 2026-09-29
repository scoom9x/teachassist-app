# Teach Assist customization API v1

Themes are CSS files. Import one in Settings → Customization; it is saved locally and restored on launch. Reset theme returns to the built-in appearance. `?reset-theme` is a recovery URL if a theme hides settings. The sample in `examples/midnight-gold.css` can be imported directly. Only import themes you trust: CSS may load remote fonts or images.

## Theme contract

`src/theme.css` is the public token layer and loads after the existing styles. Custom CSS is appended last. Use `:root:root` to override both built-in light and dark defaults, or target `:root[data-theme="light"]` and `:root[data-theme="dark"]` separately.

Available variables: `--ta-color-canvas`, `--ta-color-surface`, `--ta-color-text`, `--ta-color-accent`, `--ta-color-highlight`, `--ta-color-danger`, `--ta-color-muted-surface`, `--ta-font-family`, `--ta-border-width`, `--ta-control-radius`, `--ta-card-radius`, `--ta-shadow`, `--ta-shadow-large`, `--ta-space`, `--ta-icon-stroke`, `--ta-motion-duration`. Existing color variables remain aliases for compatibility. SVG icons inherit text color and the icon stroke token.

Stable HTML hooks: `[data-app="teach-assist"]`, `[data-ui-version="1"]`, `[data-page]`, `[data-part="sidebar"]`, `[data-part="topbar"]`, `[data-part="content"]`, `[data-part="preferences"]`, `[data-part="customization"]`, `[data-part="trends"]`, `[data-part="trend-card"]`, `[data-slot]`, `[data-plugin]`. Existing semantic classes are available for finer styling, but these hooks and tokens form the versioned API. Avoid relying on child indices or generated markup.

## Local UI plugins

Add a trusted source module at `src/plugins/<plugin-id>/index.tsx` and export a `TeachAssistPlugin` as default. Vite bundles these modules; no runtime JavaScript URL or marketplace installer is implemented. Settings lists registered plugins and persists enable/disable state. Disabled plugin views unmount; components should clean up timers/listeners in React effect cleanup functions.

```tsx
import type { TeachAssistPlugin } from "../../extensions";
export default {
  id: "study-note",
  name: "Study note",
  version: "1.0.0",
  apiVersion: 1,
  slots: {
    "dashboard.after": () => <section className="settings-card">Take one step at a time.</section>,
  },
} satisfies TeachAssistPlugin;
```

Supported slots: `dashboard.after`, `course.after`, `settings.after`. Views receive `{page, courseId}`. Each view has an error boundary and a `[data-plugin="id"]` wrapper. Plugins are trusted bundled code, not sandboxed third-party code; disabling a view does not undo top-level module side effects. Keep side effects inside components. This is the extension foundation for a future store, not a permission or package distribution system. No credentials or grade data are passed to plugin views by default.

App logos use `public/brand/logo-original.png` as the source. Derived web, iOS, Android, and widget resources are generated at platform sizes from this artwork.
