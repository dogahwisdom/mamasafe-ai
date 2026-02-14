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
        'process.env.TRIAGE_ENGINE_API_KEY': JSON.stringify(env.TRIAGE_ENGINE_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        'import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN': JSON.stringify(env.VITE_WHATSAPP_ACCESS_TOKEN || ''),
        'import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID': JSON.stringify(env.VITE_WHATSAPP_PHONE_NUMBER_ID || ''),
        'import.meta.env.VITE_AFRICAS_TALKING_API_KEY': JSON.stringify(env.VITE_AFRICAS_TALKING_API_KEY || ''),
        'import.meta.env.VITE_AFRICAS_TALKING_USERNAME': JSON.stringify(env.VITE_AFRICAS_TALKING_USERNAME || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
