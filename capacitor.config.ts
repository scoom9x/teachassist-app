import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  loggingBehavior: "none",
  appId: "ca.local.teachassist",
  appName: "Teach Assist",
  webDir: "dist",
  plugins: { CapacitorCookies: { enabled: true } },
};
export default config;
