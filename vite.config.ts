import { defineConfig } from "vite";
import inspect from "vite-plugin-inspect";
import solidPlugin from "vite-plugin-solid";
export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
  plugins: [solidPlugin(), inspect()],
});
