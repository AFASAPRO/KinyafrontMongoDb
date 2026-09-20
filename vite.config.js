import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true, secure: false }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libraries so app code updates don't
        // re-download the whole dependency graph (faster PWA updates)
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-markdown': ['marked', 'highlight.js'],
          'vendor-socket': ['socket.io-client'],
          'vendor-axios': ['axios']
        }
      }
    }
  }
})
