import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Code splitting configuration
        rollupOptions: {
          output: {
            manualChunks: {
              // Split knowledge base into separate chunk
              'knowledge-base': [
                './data/cayman-islands-knowledge.ts',
                './data/island-knowledge.ts',
                './data/enriched-knowledge/knowledge-base.ts',
                './data/serpapi-vip-data.ts'
              ],
              // Split map libraries
              'map-libs': [
                'leaflet',
                'leaflet.markercluster',
                'react-leaflet'
              ],
              // Split React
              'react-vendor': ['react', 'react-dom'],
              // Split animation libs
              'animation': ['framer-motion'],
              // Split charts
              'charts': ['recharts', 'd3']
            }
          }
        },
        // Increase chunk size warning limit (KB is intentionally large)
        chunkSizeWarningLimit: 1000
      }
    };
});
