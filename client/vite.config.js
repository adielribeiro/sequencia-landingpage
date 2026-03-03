import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração do Vite para o cliente React
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  }
});