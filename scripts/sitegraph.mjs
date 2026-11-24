// Builds the Smart Site hub-and-spoke map (src/data/sitegraph.json) from the
// copied pages' frontmatter. It decides, for every URL, what kind of page it is
// (city hub, city x service, neighborhood, service, library entry, post...),
// which office serves it, and which pages it should link down to, up to and
// across to. Nothing here adds claims about the business: the city-to-county
// grouping is geography, and the pest-to-service grouping follows the
// services the live site already sells.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CLONE = path.join(ROOT, 'src/clone');
const OUT = path.join(ROOT, 'src/data/sitegraph.json');

const COUNTY = {
  'palm-beach': {
    name: 'Palm Beach County', hub: '/palm-beach-county-pest-control/', office: 'lake-worth-beach',
    cities: ['boca-raton', 'boynton-beach', 'delray-beach', 'greenacres', 'jupiter', 'lake-worth-beach', 'palm-beach-gardens', 'royal-palm-beach', 'wellington', 'west-palm-beach', 'lantana', 'palm-beach', 'palm-beach-shores', 'riviera-beach'],
  },
  broward: {
    name: 'Broward County', hub: '/broward-county-fl-pest-control/', office: 'pompano-beach',
    cities: ['coconut-creek', 'coral-springs', 'davie', 'deerfield-beach', 'hollywood', 'lighthouse-point', 'margate', 'miramar', 'oakland-park', 'pembroke-pines', 'plantation', 'pompano-beach', 'sunrise', 'fort-lauderdale'],
  },
  'treasure-coast': {
    name: 'Treasure Coast', hub: null, office: 'lake-worth-beach',
    cities: ['port-st-lucie', 'fort-pierce', 'stuart'],
  },
};
const CITY = {};
for (const [ck, c] of Object.entries(COUNTY)) for (const s of c.cities) CITY[s] = ck;
const cityName = (s) => s.split('-').map((w) => (w === 'st' ? 'St.' : w[0].toUpperCase() + w.slice(1))).join(' ');

// City x service slug -> the service page it is a local version of.
const SVC = {
  'ant-control': { name: 'Ant Control', parent: '/ant-control/' },
  'cockroach-control': { name: 'Cockroach Control', parent: '/cockroach-control-extermination/' },
  'spider-control': { name: 'Spider Control', parent: '/spider-control-removal/' },
  'flea-tick-control': { name: 'Flea & Tick Control', parent: '/flea-control-extermination/' },
  'mosquito-control': { name: 'Mosquito Control', parent: '/mosquito-control/' },
  'rodent-control': { name: 'Rodent Control', parent: '/rodent-control/' },
  'termite-control': { name: 'Termite Control', parent: '/termite-control/' },
  'bee-wasp-removal': { name: 'Bee & Wasp Removal', parent: '/wasp-bee-removal/' },
  'attic-sanitation': { name: 'Attic Sanitation', parent: '/attic-sanitation-insulation-removal/' },
  'attic-insulation': { name: 'Attic Insulation', parent: '/insulation-replacement/' },
  'residential-pest-control': { name: 'Residential Pest Control', parent: '/residential-pest-control/' },
  'commercial-pest-control': { name: 'Commercial Pest Control', parent: '/commercial/' },
  'pest-control-exterminator': { name: 'Pest Control & Exterminator', parent: null },
};
// Words in a library entry or post title -> the service that treats that pest.
const TOPIC = [
  [/bed ?bug/i, '/bed-bug-extermination/'],
  [/termite/i, '/termite-control/'],
  [/mosquito|no-see-um/i, '/mosquito-control/'],
  [/cockroach|roach|palmetto/i, '/cockroach-control-extermination/'],
  [/\bants?\b|ant control/i, '/ant-control/'],
  [/spider/i, '/spider-control-removal/'],
  [/flea|tick/i, '/flea-control-extermination/'],
  [/rodent|\brats?\b|mice|mouse/i, '/rodent-control/'],
  [/wasp|hornet|yellow ?jacket|\bbees?\b/i, '/wasp-bee-removal/'],
  [/attic|insulat/i, '/attic-sanitation-insulation-removal/'],
  [/\bbats?\b|wildlife|raccoon|opossum|iguana/i, '/wildlife-trapping-exclusion/'],
  [/commercial|business|restaurant|warehouse/i, '/commercial/'],
];

function readFm(file) {
  const t = fs.readFileSync(file, 'utf8');
  const fm = t.split('\n---\n')[0];
  const get = (k) => { const m = fm.match(new RegExp(`^${k}: "(.*)"$`, 'm')); return m ? m[1].replace(/\\"/g, '"') : undefined; };
  return { path: get('path'), type: get('type'), h1: get('h1') || get('title'), title: get('title') };
}
const all = fs.readdirSync(CLONE).filter((f) => f.endsWith('.md')).map((f) => readFm(path.join(CLONE, f)));
const by = new Map(all.map((p) => [p.path, p]));
const has = (p) => by.has(p);
const slugOf = (p) => p.replace(/^\/|\/$/g, '');
const label = (p) => (by.get(p)?.h1 || p).replace(/\s*[-|–]\s*Bugsy.*$/i, '');

const node = {};
function info(p) {
  return (node[p] ||= { kind: 'other', links: [] });
}

// 1. Classify.
// Most live city hubs are /<city>-fl-pest-control/; a few newer ones drop the "-fl".
const cityHub = (c) => (by.has(`/${c}-fl-pest-control/`) ? `/${c}-fl-pest-control/` : `/${c}-pest-control/`);
// Neighborhood pages whose URL doesn't name their city; the city is the one the page itself names.
const NEIGHBORHOOD_CITY = {
  'del-ida-park': 'delray-beach', 'lake-ida': 'delray-beach', 'pineapple-grove': 'delray-beach', 'tropic-isle': 'delray-beach',
  'mizner-country-club': 'delray-beach', 'royal-palm-yacht-club': 'boca-raton', 'estate-section-palm-beach': 'palm-beach',
  'singer-island-riviera-beach': 'riviera-beach',
};
for (const p of all) {
  const s = slugOf(p.path);
  const n = info(p.path);
  n.type = p.type;
  if (p.type !== 'area') { n.kind = p.type; continue; }
  let m;
  if ((m = s.match(/^(.+?)(-fl)?-pest-control$/)) && CITY[m[1]] && cityHub(m[1]) === p.path) { Object.assign(n, { kind: 'city', city: m[1] }); continue; }
  if (p.path === COUNTY.broward.hub) { Object.assign(n, { kind: 'county', county: 'broward' }); continue; }
  if (p.path === COUNTY['palm-beach'].hub) { Object.assign(n, { kind: 'county', county: 'palm-beach' }); continue; }
  const svcKey = Object.keys(SVC).find((k) => s.endsWith('-' + k));
  const svcCity = svcKey && s.slice(0, -(svcKey.length + 1));
  if (svcKey && CITY[svcCity]) { Object.assign(n, { kind: 'cityservice', city: svcCity, service: svcKey }); continue; }
  if (/palm-beach-county$/.test(s)) { Object.assign(n, { kind: 'countytopic', county: 'palm-beach' }); continue; }
  // Neighborhood: the longest city slug inside the URL ("boca-" pages are Boca Raton).
  const inner = s.replace(/-pest-control$/, '');
  if (NEIGHBORHOOD_CITY[inner]) { Object.assign(n, { kind: 'neighborhood', city: NEIGHBORHOOD_CITY[inner] }); continue; }
  let city = Object.keys(CITY).filter((c) => inner === c || inner.endsWith('-' + c) || inner.startsWith(c + '-') || inner.includes('-' + c + '-')).sort((a, b) => b.length - a.length)[0];
  if (!city && /^boca-/.test(inner)) city = 'boca-raton';
  if (city) { Object.assign(n, { kind: 'neighborhood', city }); continue; }
  n.kind = 'area-other';
}
for (const n of Object.values(node)) {
  if (n.city) { n.county = CITY[n.city]; n.cityName = cityName(n.city); }
  if (n.kind === 'cityservice') n.serviceName = SVC[n.service].name;
  if (n.kind === 'city' || n.kind === 'neighborhood') n.serviceName = 'Pest Control';
  n.office = n.county ? COUNTY[n.county].office : 'lake-worth-beach';
}

// 2. Links. Each group: { title, items: [[label, path]] } — only pages that exist.
const pagesWhere = (f) => Object.entries(node).filter(([p, n]) => f(n, p)).map(([p]) => p).sort();
const group = (title, paths, self) => {
  const items = [...new Set(paths)].filter((p) => p && p !== self && has(p)).map((p) => [label(p), p]);
  return items.length ? { title, items } : null;
};
const topicOf = (p) => { const t = `${p} ${by.get(p)?.h1 || ''}`; const hit = TOPIC.find(([re]) => re.test(t)); return hit ? hit[1] : null; };
const posts = pagesWhere((n) => n.kind === 'blog').filter((p) => !['/blog/', '/blogs/'].includes(p));
const library = pagesWhere((n, p) => n.kind === 'library' && p !== '/pest-library/');
const services = pagesWhere((n) => n.kind === 'service');
const cities = (ck) => COUNTY[ck].cities.map(cityHub).filter(has);
const cityChildren = (c, k) => pagesWhere((n) => n.city === c && n.kind === k);

for (const [p, n] of Object.entries(node)) {
  const L = [];
  if (n.kind === 'city') {
    const cs = cityChildren(n.city, 'cityservice');
    L.push(group(`Pest control services in ${n.cityName}`, cs, p));
    L.push(group(`${n.cityName} neighborhoods we serve`, cityChildren(n.city, 'neighborhood'), p));
    L.push(group(`Other ${COUNTY[n.county].name} cities`, cities(n.county), p));
    if (COUNTY[n.county].hub) L.push(group(`All of ${COUNTY[n.county].name}`, [COUNTY[n.county].hub], p));
  } else if (n.kind === 'county') {
    L.push(group(`${COUNTY[n.county].name} cities we serve`, cities(n.county), p));
    L.push(group('More from this county', pagesWhere((m) => m.kind === 'countytopic' && m.county === n.county), p));
  } else if (n.kind === 'cityservice') {
    const svc = SVC[n.service];
    L.push(group(`More pest control in ${n.cityName}`, [cityHub(n.city), ...cityChildren(n.city, 'cityservice')], p));
    if (svc.parent) L.push(group(`${svc.name} in other cities`, pagesWhere((m) => m.kind === 'cityservice' && m.service === n.service), p));
    if (svc.parent) L.push(group(`About our ${svc.name.toLowerCase()}`, [svc.parent], p));
  } else if (n.kind === 'neighborhood') {
    L.push(group(`Pest control across ${n.cityName}`, [cityHub(n.city), ...cityChildren(n.city, 'cityservice')], p));
    L.push(group(`Other ${n.cityName} neighborhoods`, cityChildren(n.city, 'neighborhood'), p));
  } else if (n.kind === 'countytopic') {
    L.push(group('Palm Beach County', [COUNTY['palm-beach'].hub, ...cities('palm-beach')], p));
  } else if (n.kind === 'service') {
    if (p === '/residential-pest-control/') L.push(group('Residential services', services, p));
    // Specialty pages that sit under a main service (drywood termites under termites...).
    const related = services.filter((q) => q !== p && topicOf(q) === p);
    const up = topicOf(p) !== p && topicOf(p) ? [topicOf(p)] : [];
    L.push(group('Related services', [...up, ...related], p));
    const key = Object.keys(SVC).find((k) => SVC[k].parent === p);
    if (key) L.push(group(`${SVC[key].name} by city`, pagesWhere((m) => m.kind === 'cityservice' && m.service === key), p));
    L.push(group('From the blog', posts.filter((q) => topicOf(q) === p).slice(0, 8), p));
    L.push(group('In the Pest Library', library.filter((q) => topicOf(q) === p).slice(0, 12), p));
  } else if (n.kind === 'library') {
    if (p === '/pest-library/') L.push(group('Every pest in the library', library, p));
    else {
      const svc = topicOf(p);
      if (svc) L.push(group('How we treat it', [svc], p));
      L.push(group('More in the Pest Library', library.filter((q) => q !== p && topicOf(q) === svc).slice(0, 12), p));
      if (!svc) L.push(group('Browse the Pest Library', ['/pest-library/'], p));
    }
  } else if (n.kind === 'blog') {
    if (['/blog/', '/blogs/'].includes(p)) L.push(group('All articles', posts, p));
    else {
      const svc = topicOf(p);
      if (svc) L.push(group('The service behind this article', [svc], p));
      const same = posts.filter((q) => q !== p && topicOf(q) === svc);
      const i = posts.indexOf(p);
      L.push(group('Read next', [...same.slice(0, 4), posts[(i + 1) % posts.length]], p));
    }
  } else if (n.kind === 'home') {
    for (const ck of Object.keys(COUNTY)) L.push(group(`Pest control in ${COUNTY[ck].name}`, [COUNTY[ck].hub, ...cities(ck)], p));
  } else if (n.kind === 'plan' && p === '/packages/') {
    L.push(group('Compare our plans', pagesWhere((m) => m.kind === 'plan'), p));
  } else if (n.kind === 'commercial' && p === '/commercial/') {
    L.push(group('Commercial pest control by property type', [...pagesWhere((m) => m.kind === 'commercial'), '/hoa-condo-pest-control/'], p));
  } else if (n.kind === 'commercial') {
    L.push(group('Other property types we serve', ['/commercial/', ...pagesWhere((m) => m.kind === 'commercial'), '/hoa-condo-pest-control/'], p));
  } else if (p === '/service-area/') {
    for (const ck of Object.keys(COUNTY)) L.push(group(COUNTY[ck].name, [COUNTY[ck].hub, ...cities(ck)], p));
  }
  n.links = L.filter(Boolean);
}

// 3. Parent for breadcrumbs (city hub > county hub; neighborhood/cityservice > city hub).
for (const [p, n] of Object.entries(node)) {
  if (['cityservice', 'neighborhood'].includes(n.kind)) n.parent = cityHub(n.city);
  else if (n.kind === 'city') n.parent = COUNTY[n.county].hub || '/service-area/';
  else if (n.kind === 'county' || n.kind === 'countytopic') n.parent = n.kind === 'countytopic' ? COUNTY['palm-beach'].hub : '/service-area/';
  else if (n.kind === 'library' && p !== '/pest-library/') n.parent = '/pest-library/';
  else if (n.kind === 'blog' && !['/blog/', '/blogs/'].includes(p)) n.parent = '/blog/';
  if (n.parent && !has(n.parent)) delete n.parent;
}

// 4. Report orphans (no inbound link from any group, nav or footer is checked at build).
const inbound = new Map();
for (const [p, n] of Object.entries(node)) for (const g of n.links) for (const [, q] of g.items) inbound.set(q, (inbound.get(q) || 0) + 1);
for (const [p, n] of Object.entries(node)) if (n.parent) inbound.set(p, (inbound.get(p) || 0) + 1);
const orphans = Object.keys(node).filter((p) => p !== '/' && !inbound.get(p));
const kinds = {};
for (const n of Object.values(node)) kinds[n.kind] = (kinds[n.kind] || 0) + 1;
fs.writeFileSync(OUT, JSON.stringify({ counties: Object.fromEntries(Object.entries(COUNTY).map(([k, c]) => [k, { name: c.name, hub: c.hub, office: c.office }])), pages: node }, null, 0));
console.log(`sitegraph: ${Object.keys(node).length} pages`, kinds, `| pages with no hub link in: ${orphans.length}`, orphans.slice(0, 20).join(' '));
