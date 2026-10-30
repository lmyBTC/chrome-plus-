import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  if (mode === 'bridge') {
    return {
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/geminiOfficialBridge.ts'),
          name: 'GeminiOfficialBridge',
          formats: ['iife'],
          fileName: () => 'geminiOfficialBridge.iife.js'
        }
      }
    };
  }

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        input: {
          sidepanel: resolve(__dirname, 'sidepanel.html')
        }
      }
    }
  };
});
