// ---------------------------------------------------------------------------
// SEGMENTED SITEMAPS — Keystone v3.2 item 19.
//
// @astrojs/sitemap emits one flat file. Keystone wants one per page type, for
// a specific diagnostic reason: Search Console reports indexation per
// submitted sitemap, so per-tier files turn "is the geo tier being indexed?"
// into a number you can read off a screen instead of a judgement call. On a
// 256-page site this is the whole benefit — crawl budget is explicitly a
// non-issue below ~1M URLs, so this is not a crawl optimisation.
//
// Runs after `astro build`, rewriting what the integration produced.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://trustbugsy.com';

// First match wins, so order matters. Same URL shapes as the live WordPress site.
const CITY = /-fl-pest-control\/$|^\/(stuart|fort-pierce)-pest-control\/$/;
const TIERS = [
  ['service-area', (p) => p.startsWith('/service-area/') || CITY.test(p) || /county.*pest-control\/$/.test(p)],
  ['plans', (p) => /^\/(packages|gold-package|gold-plus|platinum-package|diamond-package)\/$/.test(p)],
  ['pest-library', (p) => p.startsWith('/pest-library/') || p.startsWith('/pest/')],
  ['commercial', (p) => p.startsWith('/commercial') || /^\/(hoa-condo-pest-control|property-management|restaurants-food-service|healthcare-facilities|office-buildings|hotels-hospitality|schools-childcare|retail-stores-shopping-centers|multi-family-properties-hoas|government-buildings)\/$/.test(p)],
  ['blog', (p) => p.startsWith('/blogs/') || p.startsWith('/blog/')],
  ['services', (p) => p !== '/' && !/^\/(about|contact|reviews|privacy-policy)\/$/.test(p)],
  ['core', () => true],
];

const existing = readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f));
const urls = existing.flatMap((f) =>
  [...readFileSync(join(DIST, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
);
if (!urls.length) {
  console.error('split-sitemap: no URLs found — did the build run?');
  process.exit(1);
}

const buckets = new Map(TIERS.map(([n]) => [n, []]));
for (const u of urls) {
  const path = new URL(u).pathname;
  buckets.get(TIERS.find(([, test]) => test(path))[0]).push(u);
}

const esc = (s) => s.replace(/&/g, '&amp;');
const written = [];
for (const [name, list] of buckets) {
  if (!list.length) continue;
  const body = list.sort().map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n');
  writeFileSync(
    join(DIST, `sitemap-${name}.xml`),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  );
  written.push([name, list.length]);
}

// The index replaces the integration's, and the flat files it wrote are removed
// so the same URL is never advertised by two sitemaps.
const idx = written
  .map(([n]) => `  <sitemap><loc>${SITE}/sitemap-${n}.xml</loc></sitemap>`)
  .join('\n');
writeFileSync(
  join(DIST, 'sitemap-index.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${idx}\n</sitemapindex>\n`,
);
for (const f of existing) unlinkSync(join(DIST, f));

const total = written.reduce((a, [, n]) => a + n, 0);
console.log(`sitemaps: ${total} URLs across ${written.length} tiers`);
for (const [n, c] of written) console.log(`  ${String(c).padStart(4)}  sitemap-${n}.xml`);
