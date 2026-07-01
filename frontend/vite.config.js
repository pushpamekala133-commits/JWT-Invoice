const { defineConfig } = require('vite');

module.exports = defineConfig({
  base: process.env.VITE_BASE_PATH || '/JWT-Invoice',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
