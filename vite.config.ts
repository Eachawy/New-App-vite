import { URL, fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const development = process.env.NODE_ENV !== 'production';

const config = defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('./src/', import.meta.url)),
  publicDir: fileURLToPath(new URL('./target/classes/static/public', import.meta.url)),
  cacheDir: fileURLToPath(new URL('./target/.vite-cache', import.meta.url)),
  build: {
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('./target/classes/static/', import.meta.url)),
    rolldownOptions: {
      input: {
        app: fileURLToPath(new URL('./src/index.html', import.meta.url)),
      },
      output: {
        // Split the vendor code into cacheable chunks instead of one oversized bundle.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/, priority: 40 },
            { name: 'vendor-redux', test: /node_modules[\\/](@reduxjs[\\/]toolkit|react-redux|redux|immer|reselect)[\\/]/, priority: 30 },
            { name: 'vendor-bootstrap', test: /node_modules[\\/](react-bootstrap|@restart|bootstrap)[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      app: fileURLToPath(new URL('./src/app', import.meta.url)),
    },
  },
  define: {
    DEVELOPMENT: JSON.stringify(development),
    // Base URL for API calls. Empty means relative to the page's origin.
    SERVER_API_URL: '""',
    // react-jhipster requires LOG_LEVEL config.
    'process.env.LOG_LEVEL': JSON.stringify(development ? 'info' : 'error'),
  },
  server: {
    host: true,
    port: 9000,
    proxy: Object.fromEntries(['/api', '/services'].map(res => [res, { target: 'http://localhost:8080' }])),
  },
});

export default config;
