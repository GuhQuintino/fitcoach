import path from 'path';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const buildId = `${process.env.VERCEL_GIT_COMMIT_SHA || 'local'}-${Date.now()}`;
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), {
      name: 'fitcoach-release-version',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: buildId }) });
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8').replaceAll('__FITCOACH_BUILD_ID__', buildId) });
      }
    }],
    assetsInclude: ['**/*.mp4', '**/*.MP4'],
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-recharts': ['recharts'],
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    test: {
      include: ['**/*.test.ts', '**/*.test.tsx'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/testsprite_tests/**'],
    }
  };
});
