import { defineConfig } from 'vite';

// For GitHub Pages: Set to your repo name (e.g., '/my-presentation/')
// For custom domain: Set to './' or '/'
const BASE_PATH = process.env.GITHUB_PAGES === 'true'
  ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] || ''}/`
  : './';

export default defineConfig({
  base: BASE_PATH,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    open: true,
  },
});
