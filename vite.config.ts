
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Mapeia o process.env.API_KEY para a variável de ambiente do Vercel
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
