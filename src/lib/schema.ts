// One connected JSON-LD @graph per page (Keystone: shared root entity IDs).
// Sitewide: Organization, two LocalBusiness/PestControlService nodes (the two
// addresses published on the live site), WebSite, logo ImageObject.
// Per page: WebPage, BreadcrumbList, optional Service and FAQPage.
import { business } from '@/data/business';

const U = business.url;
export const ID = {
  // Keystone: one shared root entity id on every page.
  org: `${U}/#localbusiness`,
  owner: `${U}/about/#zach-bernstein`,
  website: `${U}/#website`,
  logo: `${U}/#logo`,
  loc: (id: string) => `${U}/#location-${id}`,
};

export interface Crumb { name: string; path: string }
export interface Faq { q: string; a: string }

export function buildGraph(opts: {
  path: string; title: string; description: string;
  crumbs: Crumb[]; service?: string; faqs?: Faq[]; image?: string;
  office?: string; city?: string;
  article?: { headline: string; author?: string; published?: string };
}) {
  const url = new URL(opts.path, U).href;
  const [hqLoc, ...branches] = business.locations;
  const office = business.locations.find((l) => l.id === opts.office) ?? hqLoc;
  const areaServed = opts.city
    ? [{ '@type': 'City', name: `${opts.city}, FL` }]
    : business.serviceRegions.map((r) => ({ '@type': 'AdministrativeArea', name: `${r}, FL` }));
  const postal = (l: typeof hqLoc) => ({ '@type': 'PostalAddress', streetAddress: l.street, addressLocality: l.city, addressRegion: l.state, postalCode: l.zip, addressCountry: 'US' });
  const nodes: object[] = [
    {
      // Root entity: the business at its Lake Worth Beach headquarters (first
      // address in the live footer), with the Pompano Beach office as a branch.
      '@type': ['LocalBusiness', 'PestControlService'], '@id': ID.org, name: business.name, url: U + '/',
      email: business.email, telephone: hqLoc.phoneE164, address: postal(hqLoc), hasMap: hqLoc.maps,
      logo: { '@id': ID.logo }, image: business.heroImage, slogan: business.tagline,
      sameAs: [business.social.facebook, business.social.instagram, business.social.google, business.social.youtube],
      founder: { '@id': ID.owner },
      hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'license', name: business.license, recognizedBy: { '@type': 'GovernmentOrganization', name: 'Florida Department of Agriculture and Consumer Services' } },
      department: branches.map((l) => ({ '@id': ID.loc(l.id) })),
      areaServed: business.serviceRegions.map((r) => ({ '@type': 'AdministrativeArea', name: `${r}, FL` })),
    },
    {
      // Named expert (E-E-A-T). Facts from the live About page and post bylines.
      '@type': 'Person', '@id': ID.owner, name: business.owner.fullName, jobTitle: 'Owner',
      worksFor: { '@id': ID.org }, url: `${U}/about/`,
      description: business.owner.bio,
    },
    { '@type': 'ImageObject', '@id': ID.logo, url: business.logo, contentUrl: business.logo, caption: business.name },
    ...branches.map((l) => ({
      '@type': ['LocalBusiness', 'PestControlService'], '@id': ID.loc(l.id),
      name: `${business.name} – ${l.label}`, parentOrganization: { '@id': ID.org },
      url: U + '/', telephone: l.phoneE164, email: business.email, image: business.heroImage,
      logo: { '@id': ID.logo }, hasMap: l.maps, address: postal(l),
      areaServed: { '@type': 'AdministrativeArea', name: `${l.county}, FL` },
    })),
    { '@type': 'WebSite', '@id': ID.website, url: U + '/', name: business.name, publisher: { '@id': ID.org }, inLanguage: 'en-US' },
    {
      '@type': 'WebPage', '@id': `${url}#webpage`, url, name: opts.title, description: opts.description,
      isPartOf: { '@id': ID.website }, about: { '@id': ID.org }, inLanguage: 'en-US',
      breadcrumb: { '@id': `${url}#breadcrumb` },
      primaryImageOfPage: { '@id': `${url}#primaryimage` },
      ...(opts.article ? {} : { mainEntity: { '@id': opts.service ? `${url}#service` : ID.org } }),
    },
    { '@type': 'ImageObject', '@id': `${url}#primaryimage`, url: opts.image ?? business.heroImage, contentUrl: opts.image ?? business.heroImage },
    {
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: opts.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: new URL(c.path, U).href })),
    },
  ];
  if (opts.service) {
    opts.service = opts.service.replace(/\s*\|.*$/, '');
    if (opts.city && !opts.service.includes(opts.city)) opts.service = `${opts.service} in ${opts.city}, FL`;
    nodes.push({
      '@type': 'Service', '@id': `${url}#service`, name: opts.service, serviceType: opts.service, url,
      provider: { '@id': office.id === hqLoc.id ? ID.org : ID.loc(office.id) },
      areaServed,
    });
  }
  if (opts.article) {
    nodes.push({
      '@type': 'BlogPosting', '@id': `${url}#article`, headline: opts.article.headline, url,
      mainEntityOfPage: { '@id': `${url}#webpage` }, publisher: { '@id': ID.org },
      ...(opts.article.author === business.owner.fullName ? { author: { '@id': ID.owner } } : opts.article.author ? { author: { '@type': 'Person', name: opts.article.author } } : { author: { '@id': ID.org } }),
      ...(opts.article.published ? { datePublished: opts.article.published } : {}),
      image: { '@id': `${url}#primaryimage` },
    });
  }
  if (opts.faqs && opts.faqs.length) {
    nodes.push({
      '@type': 'FAQPage', '@id': `${url}#faq`, isPartOf: { '@id': `${url}#webpage` },
      mainEntity: opts.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': nodes };
}
