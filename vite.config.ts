import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      // Allow serving files from the inputs directory
      allow: [".", "../inputs"],
    },
  },
  publicDir: "public",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and React DOM into separate chunk for better caching
          "vendor-react": ["react", "react-dom"],
          // Syntax highlighting is lazy loaded but split when loaded
          "vendor-syntax": ["react-syntax-highlighter", "prismjs"],
          // JSZip is lazy loaded but split when loaded
          "vendor-zip": ["jszip"],
          // Utilities and other libraries
          "vendor-utils": ["react-markdown", "file-saver", "mime"],
        },
      },
    },
  },
} satisfies UserConfig);
