import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
