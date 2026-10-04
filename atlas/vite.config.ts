import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  envDir:
    mode === "test" || process.env.ATLAS_IGNORE_ENV_FILES === "1"
      ? false
      : undefined,
  server: {
    port: 8080,
    open: process.env.ATLAS_IGNORE_ENV_FILES !== "1",
  },
}));
