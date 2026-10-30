import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          excel: ['xlsx'],
          pdf: ['jspdf', 'jspdf-autotable'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
