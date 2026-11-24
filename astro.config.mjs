import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeBugsy from './src/lib/rehype-bugsy.mjs';

// Canonical host matches the live site today (apex, trailing slash), so every
// URL that already carries search equity keeps the same address at cutover.
// Must match business.url in src/data/business.ts.
// rehypeBugsy lays the copied pages out like the live site (hero, quote form,
// shared sections); see src/lib/rehype-bugsy.mjs.

export default defineConfig({
  site: 'https://trustbugsy.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [sitemap()],
  markdown: { rehypePlugins: [rehypeBugsy] },
});
