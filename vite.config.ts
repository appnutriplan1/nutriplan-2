import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { adminDevApi } from './dev-admin-api.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  server: {
    host: true,
    proxy: {
      '/rest/v1/': {
        // TODO (FASE 5): Reemplazar con URL de Supabase de NutriPlan 2
        target: 'https://SUPABASE_URL_NUTRIPLAN_2.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react-pageflip'],
  },
  plugins: [
    adminDevApi(env),
    react(),
    tailwindcss(),
    VitePWA({
      // El aviso visible permite borrar la caché anterior antes de activar la
      // versión nueva, tanto en la PWA móvil como en navegadores de escritorio.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'brand/*.svg'],
      manifest: {
        id: '/',
        name: 'NutriPlan',
        short_name: 'NutriPlan',
        description: 'Tu plan nutricional, siempre contigo.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F3ECE1',
        theme_color: '#1E3547',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        importScripts: ['/push-handler.js'],
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Permite abrir rutas de React sin conexión cuando el app shell ya se
        // haya visitado. No se cachean respuestas privadas ni PDFs de Drive.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  }
})
