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

const LABEL: Record<string, string> = {
  service: 'Residential', commercial: 'Commercial', plan: 'Our Plans', area: 'Service Area',
  library: 'Pest Library', blog: 'Blog',
};
const HUB: Record<string, string> = {
  service: '/residential-pest-control/', commercial: '/commercial/', plan: '/packages/',
  area: '/service-area/', library: '/pest-library/', blog: '/blogs/',
};
export function crumbsFor(fm: ClonePage) {
  const c = [{ name: 'Home', path: '/' }];
  const parent = fm.parent ? byPath.get(fm.parent)?.frontmatter : undefined;
  const hub = HUB[fm.type];
  if (parent) c.push({ name: parent.h1 || parent.title, path: parent.path });
  else if (hub && hub !== fm.path) c.push({ name: byPath.get(hub)?.frontmatter.h1 ?? LABEL[fm.type], path: hub });
  if (fm.path !== '/') c.push({ name: fm.h1 || fm.title, path: fm.path });
  return c;
}
