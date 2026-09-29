import { useState } from "react";
import { Palette, Upload, RotateCcw } from "lucide-react";
import { PreferenceSwitch } from "./PreferenceControls";
import { readCustomTheme, saveCustomTheme } from "./customTheme";
import { setPluginEnabled, usePlugins } from "./extensions";
export function Customization() {
  const [theme, setTheme] = useState(readCustomTheme);
  const [error, setError] = useState("");
  const plugins = usePlugins();
  return (
    <section
      className="settings-card customization-card"
      data-part="customization"
    >
      <h2>
        <Palette size={22} aria-hidden="true" />
        Customization
      </h2>
      <p>{theme ? theme.name : "Default theme"}</p>
      <div className="customization-actions">
        <label className="theme-upload">
          <Upload size={16} aria-hidden="true" />
          Import CSS theme
          <input
            aria-label="Import CSS theme"
            type="file"
            accept=".css,text/css"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 250000)
                  throw new Error("Choose a CSS theme smaller than 250 KB.");
                const next = { name: file.name, css: await file.text() };
                saveCustomTheme(next);
                setTheme(next);
                setError("");
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not load theme.",
                );
              } finally {
                event.target.value = "";
              }
            }}
          />
        </label>
        <button
          className="secondary"
          disabled={!theme}
          onClick={() => {
            try {
              saveCustomTheme(null);
              setTheme(null);
              setError("");
            } catch {
              setError("Could not reset theme.");
            }
          }}
        >
          <RotateCcw size={16} />
          Reset theme
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {plugins.map((plugin) => (
        <PreferenceSwitch
          key={plugin.id}
          label={plugin.name}
          checked={plugin.enabled}
          onChange={(enabled) => {
            try {
              setPluginEnabled(plugin.id, enabled);
            } catch {
              setError("Could not save plugin preference.");
            }
          }}
        >
          Version {plugin.version}
        </PreferenceSwitch>
      ))}
      {!plugins.length && <p className="muted">No plugins installed.</p>}
    </section>
  );
}
