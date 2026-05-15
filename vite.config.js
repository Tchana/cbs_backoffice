import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('framer-motion')) return 'motion-vendor';
          if (id.includes('@supabase')) return 'supabase-vendor';
          if (id.includes('recharts') || id.includes('d3')) return 'charts-vendor';
          return 'vendor';
        },
      },
    },
  },
  server: {
    host: true, // Expose to all network interfaces
    port: 5173, // Default Vite port
    allowedHosts: [
      'cbs-backoffice.onrender.com',
      'localhost',
      '127.0.0.1',
      'cbs-backoffice-itty.onrender.com'
    ],
  },

})
