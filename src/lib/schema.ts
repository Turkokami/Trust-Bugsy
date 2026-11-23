// One connected JSON-LD @graph per page (Keystone: shared root entity IDs).
// Sitewide: Organization, two LocalBusiness/PestControlService nodes (the two
// addresses published on the live site), WebSite, logo ImageObject.
// Per page: WebPage, BreadcrumbList, optional Service and FAQPage.
import { business } from '@/data/business';

const U = business.url;
export const ID = {
  org: `${U}/#organization`,
  website: `${U}/#website`,
  logo: `${U}/#logo`,
  loc: (id: string) => `${U}/#location-${id}`,
};

export interface Crumb { name: string; path: string }
export interface Faq { q: string; a: string }

export function buildGraph(opts: {
  path: string; title: string; description: string;
  crumbs: Crumb[]; service?: string; faqs?: Faq[]; image?: string;
}) {
  const url = new URL(opts.path, U).href;
  const nodes: object[] = [
    {
      '@type': 'Organization', '@id': ID.org, name: business.name, url: U + '/',
      email: business.email, telephone: business.locations[0].phoneE164,
      logo: { '@id': ID.logo }, image: { '@id': ID.logo },
      sameAs: [business.social.facebook, business.social.instagram, business.social.google],
      hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'license', name: business.license, recognizedBy: { '@type': 'GovernmentOrganization', name: 'Florida Department of Agriculture and Consumer Services' } },
      department: business.locations.map((l) => ({ '@id': ID.loc(l.id) })),
    },
    { '@type': 'ImageObject', '@id': ID.logo, url: business.logo, contentUrl: business.logo, caption: business.name },
    ...business.locations.map((l) => ({
      '@type': ['LocalBusiness', 'PestControlService'], '@id': ID.loc(l.id),
      name: `${business.name} – ${l.label}`, parentOrganization: { '@id': ID.org },
      url: U + '/', telephone: l.phoneE164, email: business.email, image: business.heroImage,
      logo: { '@id': ID.logo }, hasMap: l.maps,
      address: { '@type': 'PostalAddress', streetAddress: l.street, addressLocality: l.city, addressRegion: l.state, postalCode: l.zip, addressCountry: 'US' },
      areaServed: business.serviceRegions.map((r) => ({ '@type': 'AdministrativeArea', name: `${r}, FL` })),
    })),
    { '@type': 'WebSite', '@id': ID.website, url: U + '/', name: business.name, publisher: { '@id': ID.org }, inLanguage: 'en-US' },
    {
      '@type': 'WebPage', '@id': `${url}#webpage`, url, name: opts.title, description: opts.description,
      isPartOf: { '@id': ID.website }, about: { '@id': ID.org }, inLanguage: 'en-US',
      breadcrumb: { '@id': `${url}#breadcrumb` },
      ...(opts.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: opts.image } } : {}),
    },
    {
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: opts.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: new URL(c.path, U).href })),
    },
  ];
  if (opts.service) {
    nodes.push({
      '@type': 'Service', '@id': `${url}#service`, name: opts.service, serviceType: opts.service, url,
      provider: { '@id': ID.org },
      areaServed: business.serviceRegions.map((r) => ({ '@type': 'AdministrativeArea', name: `${r}, FL` })),
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
