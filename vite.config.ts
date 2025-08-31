import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/claude-chat-viewer/' : '/',
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      // Allow serving files from the inputs directory
      allow: ['.', '../inputs']
    }
  },
  publicDir: 'public'
} satisfies UserConfig)
