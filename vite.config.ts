import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import { fileURLToPath } from 'url'
import path from 'path'
import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    mdx(),
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['@mdx-js/react']
  },
  server: {
    fs: {
      // Allow serving files from the inputs directory
      allow: ['.', '../inputs']
    }
  },
  publicDir: 'public'
} satisfies UserConfig)
