import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const rootEnvDir = fileURLToPath(new URL('..', import.meta.url));

/**
 * During development the API is proxied through the Vite dev server so the browser sees a
 * single origin. That keeps the httpOnly refresh cookie working exactly as it does in
 * production, without relaxing any cookie or CORS setting for local work.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, 'VITE_');
  const configuredPort = Number.parseInt(env.VITE_DEV_PORT ?? '', 10);

  return {
    envDir: rootEnvDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: env.VITE_DEV_HOST ?? '0.0.0.0',
      port: Number.isNaN(configuredPort) ? 5173 : configuredPort,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
