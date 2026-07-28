import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { execSync } from 'child_process'
import pkg from './package.json'

let gitHash = ''
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) {
  gitHash = 'dev'
}

const appVersion = `${pkg.version}-${gitHash}`

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    outDir: 'dist',
    modulePreload: false,
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, 'src/entries/newtab/index.html'),
        popup: resolve(__dirname, 'src/entries/popup/index.html'),
        options: resolve(__dirname, 'src/entries/options/index.html'),
        sidebar: resolve(__dirname, 'src/entries/sidebar/index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        geminiContent: resolve(__dirname, 'src/geminiContent.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}) 