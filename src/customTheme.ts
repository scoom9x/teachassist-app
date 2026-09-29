const key = "teach-assist.custom-theme.v1";
export interface CustomTheme {
  name: string;
  css: string;
}
export function readCustomTheme(): CustomTheme | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value &&
      typeof value.name === "string" &&
      typeof value.css === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function applyCustomTheme(theme: CustomTheme | null) {
  let style = document.getElementById("teach-assist-custom-theme");
  if (!style) {
    style = document.createElement("style");
    style.id = "teach-assist-custom-theme";
  }
  style.textContent = theme?.css ?? "";
  document.head.append(style);
  document.documentElement.dataset.customTheme = theme?.name ?? "";
}
export function saveCustomTheme(theme: CustomTheme | null) {
  if (theme) localStorage.setItem(key, JSON.stringify(theme));
  else localStorage.removeItem(key);
  applyCustomTheme(theme);
}
// A recovery URL works even when a theme accidentally hides the settings UI.
if (new URLSearchParams(location.search).has("reset-theme")) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Session recovery still works. */
  }
  applyCustomTheme(null);
} else applyCustomTheme(readCustomTheme());
