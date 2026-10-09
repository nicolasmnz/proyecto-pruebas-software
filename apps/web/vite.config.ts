import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Un único .env en la raíz del monorepo (ver .env.example)
  envDir: "../..",

  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
