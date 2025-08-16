import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'fs';
import path from 'path';

// Read package.json to get version and other data
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const __APP_VERSION__ = JSON.stringify(packageJson.version);
const __BUILD_DATE__ = JSON.stringify(new Date().toISOString().split('T')[0]);

// Helper function to resolve paths
const resolvePath = (dir: string) => path.resolve(__dirname, dir);

export default defineConfig({
  // Base path for Electron app - use relative path for proper routing
  base: './',

  // Global constants injected into the app at build time
  define: {
    __APP_VERSION__,
    __BUILD_DATE__,
    global: 'globalThis'
  },

  // 🔌 List of Vite plugins to use
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 } // 1 year
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 } // 1 year
            }
          },
          {
            urlPattern: /^https:\/\/.*firebaseapp\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 } // 7 days
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Right Wingers POS',
        short_name: 'RW POS',
        description: 'Multi-Store Point of Sale System for Right Wingers Restaurant',
        theme_color: '#dc2626',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ],
        categories: ['business', 'food', 'productivity'],
        shortcuts: [
          { name: 'New Order', short_name: 'New Order', description: 'Start a new customer order', url: '/customer-lookup', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Menu', short_name: 'Menu', description: 'Browse the menu', url: '/menu', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],

  // 🚀 Server configuration for development
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: true
  },

  // 📦 Build configuration for production
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react']
        }
      }
    }
  },

  // 📚 Path aliases and dependency management
  resolve: {
    alias: {
      '@': resolvePath('./src'),
      'shared': resolvePath('../shared')
    },
    dedupe: ['react', 'react-dom']
  },

  // ⚡ Pre-bundle dependencies to improve dev server startup performance
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', 'firebase/auth']
  }
});