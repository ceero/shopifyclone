import { defineConfig } from 'vite';

// The published React Three Fiber reconciler is a production build. Both renderers
// must use the same React dispatcher, including when running the local dev server.
const reactMode = { 'process.env.NODE_ENV': JSON.stringify('production') };

export default defineConfig({
  define: reactMode,
  esbuild: { jsx: 'automatic', jsxDev: false },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react-router'],
    esbuildOptions: { define: reactMode },
  },
  build: { outDir: 'dist/client' },
  server: { host: '127.0.0.1', port: 4173, allowedHosts: ['terminal.local'] },
});
