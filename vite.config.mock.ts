// Local testing only: swaps the real Supabase data layer for an in-browser fake.
// Run with: npx vite --config vite.config.mock.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@/lib/api", replacement: fileURLToPath(new URL("./test/mock-api.ts", import.meta.url)) },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  build: { outDir: "dist-mock" },
});
