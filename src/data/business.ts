// ---------------------------------------------------------------------------
// BUSINESS FACTS — every value here is copied from the live trustbugsy.com
// (footer, header and homepage, read 23 Nov 2026). Nothing is invented.
// Anything the owner still has to confirm is listed in OWNER-QUESTIONS.md and
// is NOT rendered (no hours, no licence number, no founding year, no rating
// count) until it is supplied — Keystone "client-attested standard".
// ---------------------------------------------------------------------------
export const business = {
  name: "Bugsy's Pest Solutions",
  shortName: "Bugsy's",
  url: 'https://trustbugsy.com',
  tagline: 'Protecting Homes, Ensuring Peace of Mind',
  email: 'contact@trustbugsy.com',
  // Shown on the live misting and sewer pages ("FDACS License #JF323154").
  license: 'FDACS License #JF323154',
  // Live About page: "My journey into pest control began in July 2017, following
  // my service in the United States Marine Corps." Full name from post bylines.
  owner: {
    name: 'Zach', fullName: 'Zach Bernstein', role: 'Owner and founder (veteran)',
    bio: 'Owner of Bugsy’s Pest Solutions. U.S. Marine Corps veteran who began his pest control career in July 2017.',
  },
  locations: [
    {
      id: 'lake-worth-beach',
      label: 'Lake Worth Beach',
      phone: '(561) 654-8998',
      phoneE164: '+15616548998',
      street: '528 N G St',
      city: 'Lake Worth Beach',
      state: 'FL',
      zip: '33460',
      maps: 'https://www.google.com/maps/search/?api=1&query=528+N+G+St+Lake+Worth+Beach+FL+33460',
      county: 'Palm Beach County',
    },
    {
      id: 'pompano-beach',
      label: 'Pompano Beach',
      phone: '(954) 751-1620',
      phoneE164: '+19547511620',
      street: '1401 S Dixie Hwy W, Suite 2W',
      city: 'Pompano Beach',
      state: 'FL',
      zip: '33060',
      maps: 'https://maps.app.goo.gl/gxZKj8egE6ZLQSXR7',
      county: 'Broward County',
    },
  ],
  serviceRegions: ['Palm Beach County', 'Broward County', 'Treasure Coast'],
  social: {
    facebook: 'https://www.facebook.com/BugsysPestSolutionsofFlorida/',
    instagram: 'https://www.instagram.com/bugsyspestsolutions/',
    google: 'https://g.co/kgs/uMxR7UA',
    youtube: 'https://youtu.be/W0DOiFogFC0',
    writeReview: 'https://g.co/kgs/rtLS9oD',
  },
  logo: 'https://trustbugsy.com/wp-content/uploads/2026/05/Group-336.webp',
  // The full BUGSY'S wordmark block the live header and footer show.
  headerLogo: 'https://trustbugsy.com/wp-content/uploads/2025/03/Group-344.webp',
  // United States Marine Corps emblem shown at the top right of the live header.
  marineEmblem: 'https://trustbugsy.com/wp-content/uploads/2025/03/Rectangle-8.webp',
  heroImage: 'https://trustbugsy.com/wp-content/uploads/2025/03/IMG_6694-min-scaled.webp',
} as const;

export const hq = business.locations[0];
export const sameAs = [business.social.facebook, business.social.instagram, business.social.google];
