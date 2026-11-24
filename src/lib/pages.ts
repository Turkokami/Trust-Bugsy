// Every page copied from the live site lives in src/clone/*.md, one file per
// URL, with the live path in its frontmatter. This loads them all once.
import type { Faq } from '@/lib/schema';

export interface ClonePage {
  path: string;
  title: string;
  description: string;
  type: 'home' | 'core' | 'service' | 'commercial' | 'plan' | 'area' | 'library' | 'blog' | 'legal';
  h1: string;
  showH1?: boolean;
  author?: string;
  published?: string;
  service?: string;
  image?: string;
  parent?: string;
  faqs?: Faq[];
}
type Mod = { frontmatter: ClonePage; Content: any };
const mods = import.meta.glob<Mod>('/src/clone/*.md', { eager: true });
export const pages = Object.values(mods);
export const byPath = new Map(pages.map((m) => [m.frontmatter.path, m]));

import graph from '@/data/sitegraph.json';

export interface LinkGroup { title: string; items: [string, string][] }
export interface GraphNode {
  kind: string; type: string; serviceName?: string; city?: string; cityName?: string; county?: string; service?: string;
  office: string; parent?: string; links: LinkGroup[];
}
export const sitegraph = graph as unknown as { counties: Record<string, { name: string; hub: string | null; office: string }>; pages: Record<string, GraphNode> };
export const nodeFor = (path: string): GraphNode | undefined => sitegraph.pages[path];

const LABEL: Record<string, string> = {
  service: 'Residential', commercial: 'Commercial', plan: 'Our Plans', area: 'Service Area',
  library: 'Pest Library', blog: 'Blog',
};
const HUB: Record<string, string> = {
  service: '/residential-pest-control/', commercial: '/commercial/', plan: '/packages/',
  area: '/service-area/', library: '/pest-library/', blog: '/blog/',
};
const HUB_NAME: Record<string, string> = { '/service-area/': 'Service Area', '/blog/': 'Blog', '/pest-library/': 'Pest Library', '/packages/': 'Our Plans', '/commercial/': 'Commercial', '/residential-pest-control/': 'Residential' };
const crumbName = (fm: ClonePage, last: boolean) => {
  const n = nodeFor(fm.path);
  if (!last && HUB_NAME[fm.path]) return HUB_NAME[fm.path];
  if (!last && n?.kind === 'city' && n.cityName) return n.cityName;
  if (!last && n?.kind === 'county' && n.county) return sitegraph.counties[n.county]?.name ?? short(fm);
  return short(fm);
};
const short = (fm: ClonePage) => (fm.h1 || fm.title).replace(/\s*[|–—-]\s*Bugsy.*$/i, '').replace(/\s+[—–]\s.*$/, '');
// Home > hub chain > page. Area pages follow the Smart Site geo tiers
// (service area > county > city > neighborhood or city service).
export function crumbsFor(fm: ClonePage) {
  const chain: string[] = [];
  let p = nodeFor(fm.path)?.parent;
  while (p && chain.length < 4 && !chain.includes(p)) { chain.unshift(p); p = nodeFor(p)?.parent; }
  if (!chain.length) {
    const hub = HUB[fm.type];
    if (fm.parent && byPath.has(fm.parent)) chain.push(fm.parent);
    else if (hub && hub !== fm.path) chain.push(hub);
  }
  if (fm.type === 'area' && chain[0] !== '/service-area/' && fm.path !== '/service-area/') chain.unshift('/service-area/');
  const c = [{ name: 'Home', path: '/' }];
  for (const q of chain) {
    const m = byPath.get(q)?.frontmatter;
    c.push({ name: m ? crumbName(m, false) : LABEL[fm.type] ?? q, path: q });
  }
  if (fm.path !== '/') c.push({ name: crumbName(fm, true), path: fm.path });
  return c;
}
