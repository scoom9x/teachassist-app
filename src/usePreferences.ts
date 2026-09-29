import { useEffect, useRef, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
type Settings = {
  theme: "light" | "dark";
  haptics: boolean;
  blurMarks: boolean;
  pollMinutes: number;
  notifications: boolean;
};
const key = "teach-assist.preferences.v1";
export function usePreferences() {
  const [settings, setSettings] = useState<Settings>({
    theme: "light",
    haptics: true,
    blurMarks: false,
    pollMinutes: 0,
    notifications: false,
  });
  const edited = useRef(false);
  const queue = useRef(Promise.resolve());
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    let active = true;
    Preferences.get({ key })
      .then(({ value }) => {
        if (!active || edited.current || !value) return;
        const saved = JSON.parse(value);
        setSettings({
          theme: saved.theme === "dark" ? "dark" : "light",
          haptics: saved.haptics !== false,
          blurMarks: saved.blurMarks === true,
          pollMinutes:
            Number.isFinite(saved.pollMinutes) && saved.pollMinutes >= 5
              ? Math.min(1440, Math.floor(saved.pollMinutes))
              : 0,
          notifications: saved.notifications === true,
        });
      })
      .catch(() => {
        if (active) setSaveError("Could not read saved preferences.");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);
  useEffect(() => {
    if (!settings.haptics) return;
    const feedback = (event: MouseEvent) => {
      const button =
        event.target instanceof Element ? event.target.closest("button") : null;
      if (!button || button.disabled) return;
      if (Capacitor.isNativePlatform())
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      else navigator.vibrate?.(10);
    };
    document.addEventListener("click", feedback);
    return () => document.removeEventListener("click", feedback);
  }, [settings.haptics]);
  function updatePreferences(patch: Partial<Settings>) {
    edited.current = true;
    const next = { ...settings, ...patch };
    setSettings(next);
    queue.current = queue.current
      .then(() => Preferences.set({ key, value: JSON.stringify(next) }))
      .then(() => setSaveError(""))
      .catch(() =>
        setSaveError(
          "Preferences changed, but could not be saved on this device.",
        ),
      );
  }
  return { ...settings, updatePreferences, saveError };
}
