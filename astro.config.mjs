import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Canonical host matches the live site today (apex, trailing slash), so every
// URL that already carries search equity keeps the same address at cutover.
// Must match business.url in src/data/business.ts.
export default defineConfig({
  site: 'https://trustbugsy.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [sitemap()],
});
