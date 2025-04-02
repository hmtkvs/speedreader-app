import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import compression from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      compression(),
      visualizer({
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      })
    ],
    server: {
      cors: true,
      // Provide better error handling for network requests
      hmr: {
        // Reduce timeout to fail faster for easier debugging
        timeout: 5000,
        // Enable overlay for better error visibility
        overlay: true
      },
      // Add proxy for API requests with API key forwarding
      proxy: {
        '/api': {
          target: 'https://ghboojvhbyniahbrdqtn.supabase.co',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Add the API key to all proxied requests
              if (env.VITE_SUPABASE_ANON_KEY) {
                proxyReq.setHeader('apikey', env.VITE_SUPABASE_ANON_KEY);
                proxyReq.setHeader('Authorization', `Bearer ${env.VITE_SUPABASE_ANON_KEY}`);
              }
            });
            
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err);
            });
          }
        }
      },
      // Increase timeout for slow connections
      timeout: 30000
    },
    build: {
      target: 'es2015',
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'pdf-vendor': ['pdfjs-dist'],
            'motion-vendor': ['framer-motion'],
            'icons-vendor': ['react-icons'],
            'monitoring': ['@sentry/browser', '@sentry/tracing'],
            'analytics': ['ga-4-react']
          }
        },
        maxParallelFileOps: 3
      }
    },
    // Env variable handling for Vite 6
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(env.VITE_SENTRY_DSN),
      'import.meta.env.VITE_STRIPE_PUBLIC_KEY': JSON.stringify(env.VITE_STRIPE_PUBLIC_KEY),
      'import.meta.env.VITE_DEEPINFRA_TOKEN': JSON.stringify(env.VITE_DEEPINFRA_TOKEN)
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@sentry/browser']
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      minify: true,
      treeShaking: true
    }
  };
});