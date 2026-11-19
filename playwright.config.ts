import { defineConfig } from "@playwright/test";

const live = process.env.POLICYPILOT_BROWSER_LIVE === "1";
const fixture = process.env.POLICYPILOT_BROWSER_CONFIGURED === "1";
const address = live ? process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS : fixture ? "0x" + "1".repeat(40) : "";
if (live && !address) throw new Error("Set the contract address before running live browser tests.");

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3114", channel: process.env.POLICYPILOT_BROWSER ?? "msedge" },
  webServer: {
    command: live ? "npm run start -- --hostname 127.0.0.1 --port 3114" :
      "npm run dev -- --webpack --hostname 127.0.0.1 --port 3114",
    url: "http://127.0.0.1:3114",
    env: { NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS: address ?? "", NEXT_PUBLIC_GENLAYER_NETWORK: "studionet", NEXT_TELEMETRY_DISABLED: "1" },
    timeout: 90000,
    reuseExistingServer: false,
  },
});
