import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser",
  testMatch: "**/*.browser.ts",
  use: {
    baseURL: "http://127.0.0.1:8080",
    browserName: "chromium",
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader"],
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --strictPort",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  reporter: "list",
});
