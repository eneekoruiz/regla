import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Test traces and review backups are generated output, not application input.
  server: {
    host: true,
    watch: { ignored: ['**/artifacts/**'] },
    proxy: {
      '/api': {
        target: process.env.LOCAL_API === 'true' ? 'http://localhost:3001' : 'https://ayudandonos.vercel.app',
        changeOrigin: true,
        secure: false
      }
    }
  },
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
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/assets\//, /\.[a-zA-Z0-9]+$/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-vendor';
          if (id.includes('node_modules/framer-motion/')) return 'framer-motion';
          if (id.includes('node_modules/html2canvas/')) return 'html2canvas';
          if (id.includes('node_modules/lucide-react/')) return 'lucide';
        }
      }
    }
  }
})

