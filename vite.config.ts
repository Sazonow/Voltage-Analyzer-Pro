import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  define: {
    // Prevent Vite from replacing process.env with static values, 
    // allowing the window.process polyfill in index.html to work.
    'process.env': 'process.env'
  }
});