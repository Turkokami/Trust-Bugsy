// Post-build checks on the rendered HTML (Keystone: read the built DOM, not the source).
// Run: node scripts/check-site.mjs dist
import fs from 'node:fs';
import path from 'node:path';
const dist = process.argv[2] || 'dist';
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f === 'index.html') files.push(p); } })(dist);
const urlOf = (f) => '/' + path.relative(dist, path.dirname(f)).replace(/\\/g, '/') + (path.dirname(f) === dist ? '' : '/');
const pages = new Map(files.map((f) => [urlOf(f).replace('//', '/'), fs.readFileSync(f, 'utf8')]));
const inbound = new Map();
const bad = { h1: [], schema: [], noAlt: [], crumbs: [], dupId: [] };
for (const [u, h] of pages) {
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1 && !u.startsWith('/404')) bad.h1.push(`${u} (${h1})`);
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const g = JSON.parse(m[1]); const ids = g['@graph'].map((n) => n['@id']).filter(Boolean); if (new Set(ids).size !== ids.length) bad.dupId.push(u); } catch { bad.schema.push(u); }
  }
  if ((h.match(/<img(?![^>]*\balt=)[^>]*>/g) || []).length) bad.noAlt.push(u);
  if (u !== '/' && !u.startsWith('/404') && !/aria-label="Breadcrumb"/.test(h)) bad.crumbs.push(u);
  const main = h.split('<main')[1]?.split('</main>')[0] || '';
  const all = [...h.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  for (const l of new Set(all)) if (l !== u) inbound.set(l, (inbound.get(l) || 0) + 1);
}
const orphan = [...pages.keys()].filter((u) => u !== '/' && !u.startsWith('/404') && !inbound.get(u));
console.log(`pages ${pages.size}`);
for (const [k, v] of Object.entries(bad)) console.log(`${k}: ${v.length}${v.length ? ' e.g. ' + v.slice(0, 5).join(' ') : ''}`);
console.log(`no inbound link at all: ${orphan.length}${orphan.length ? ' e.g. ' + orphan.slice(0, 8).join(' ') : ''}`);
// Inbound from page bodies only (header/footer excluded) — the hub-and-spoke measure.
const bodyIn = new Map();
for (const [u, h] of pages) { const main = h.split('<main')[1]?.split('</main>')[0] || ''; for (const l of new Set([...main.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))) if (l !== u) bodyIn.set(l, (bodyIn.get(l) || 0) + 1); }
const bodyOrphan = [...pages.keys()].filter((u) => u !== '/' && !u.startsWith('/404') && !bodyIn.get(u));
console.log(`no in-content link: ${bodyOrphan.length}${bodyOrphan.length ? ' e.g. ' + bodyOrphan.slice(0, 8).join(' ') : ''}`);
// Click depth from home following any link.
const depth = new Map([['/', 0]]); const q = ['/'];
while (q.length) { const u = q.shift(); const h = pages.get(u) || ''; for (const l of new Set([...h.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))) if (pages.has(l) && !depth.has(l)) { depth.set(l, depth.get(u) + 1); q.push(l); } }
const dd = {}; for (const v of depth.values()) dd[v] = (dd[v] || 0) + 1;
console.log('click depth from home:', dd, `unreached: ${pages.size - depth.size}`);
