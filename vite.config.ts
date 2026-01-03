
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (Vercel injeta no process.env)
  // Fix: Cast process to any to access cwd() which might be missing from some type definitions in the build environment
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Injeta a chave de API para ser acessível via process.env.API_KEY no navegador
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'recharts', '@google/genai']
          }
        }
      }
    },
    server: {
      port: 3000
    }
  };
});
