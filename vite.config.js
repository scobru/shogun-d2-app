import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        client: resolve(__dirname, 'src/client.html'),
        server: resolve(__dirname, 'src/server.html'),
        bugout: resolve(__dirname, 'src/bugout.min.js'),
        bugout_min: resolve(__dirname, 'src/bugout.min.js'),
        
      },
    },
  }
}); 