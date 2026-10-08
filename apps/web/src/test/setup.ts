import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

export default defineConfig({
  plugins: [react()],

  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});

afterEach(() => {
  cleanup();
});
