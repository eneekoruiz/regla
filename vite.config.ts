import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Test traces and review backups are generated output, not application input.
  server: { watch: { ignored: ['**/artifacts/**'] } },
  optimizeDeps: { entries: ['index.html'] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // We already have a manual manifest.json linked in index.html
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,avif,woff,woff2,ttf,otf,json,wasm}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        cleanupOutdatedCaches: true
      }
    })
  ],
})

