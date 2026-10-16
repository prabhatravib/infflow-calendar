import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'calendar-private-server-boundary',
    generateBundle() {
      for (const id of this.getModuleIds()) {
        const path = id.replace(/\\/g, '/');
        if (/\/calendar-worker\/worker\//.test(path) || /\/hexa-v2\/src\/(?:worker|shared)\//.test(path)) {
          this.error('Private server module entered the calendar public build');
        }
      }
    },
  }],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Ensure CSS is properly extracted and loaded
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    // Ensure CSS is properly processed
    cssCodeSplit: false,
    // Prevent empty chunks
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  // Optimize for production builds
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  // Ensure proper CSS handling
  css: {
    postcss: './postcss.config.cjs',
  },
})
