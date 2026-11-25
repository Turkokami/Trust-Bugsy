// Lays each copied page out the way the live trustbugsy.com shows it.
//
// The copy pipeline gives us one flat column of markdown per page. The live
// site (Elementor) shows the same words inside a hero with a quote form, a
// trust-logo strip, a two-column body with a sticky quote form, and a run of
// shared full-width sections (process, reviews, services, service areas...).
// This plugin rebuilds that structure from the flat copy with our own markup
// and classes; global.css styles it. No words are added or changed except the
// form labels and button text the live site itself shows.

import fs from 'node:fs';

const PHONE = { label: '(561) 654-8998', tel: '+15616548998' };
// The two offices in the live footer (keep in sync with src/data/business.ts).
const OFFICES = {
  'lake-worth-beach': { label: 'Lake Worth Beach', phone: '(561) 654-8998', tel: '+15616548998', addr: '528 N G St, Lake Worth Beach, FL 33460', maps: 'https://www.google.com/maps/search/?api=1&query=528+N+G+St+Lake+Worth+Beach+FL+33460' },
  'pompano-beach': { label: 'Pompano Beach', phone: '(954) 751-1620', tel: '+19547511620', addr: '1401 S Dixie Hwy W, Suite 2W, Pompano Beach, FL 33060', maps: 'https://maps.app.goo.gl/gxZKj8egE6ZLQSXR7' },
};
const LICENSE = 'FDACS License #JF323154';
const REGIONS = 'Palm Beach County, Broward County and the Treasure Coast';
// Smart Site map from scripts/sitegraph.mjs (built before astro build).
let GRAPH = null;
function graphNode(path) {
  if (!GRAPH) {
    try { GRAPH = JSON.parse(fs.readFileSync(new URL('../data/sitegraph.json', import.meta.url), 'utf8')); } catch { GRAPH = { pages: {}, counties: {} }; }
  }
  return GRAPH.pages[path];
}
const BANNER_CITY = 'https://trustbugsy.com/wp-content/uploads/2025/03/IMG_6694-min-scaled.webp';
const BANNER_BLOG = 'https://trustbugsy.com/wp-content/uploads/2025/04/Group-329-min.webp';
const SERVICES = [
  'Ant Control', 'Cockroach Control & Extermination', 'Spider Control & Removal Services',
  'Flea Control & Extermination', 'Bee Removal & Control', 'Bed Bug Extermination',
  'Rat Control & Extermination', 'Mosquito Control', 'Wasp Control & Removal',
  'Insulation Removal', 'Insulation Replacement', 'Attic Sanitation', 'Termite Control', 'Others',
];
const CONSENT = 'By submitting your information, you agree to receive notifications and promotional SMS from Bugsy’s Pest Solutions. You can reply "STOP" at any time to unsubscribe. I agree to the ';

// ---- tiny hast helpers ------------------------------------------------------
const t = (value) => ({ type: 'text', value });
function el(tagName, properties = {}, children = []) {
  return { type: 'element', tagName, properties, children: children.filter(Boolean).map((c) => (typeof c === 'string' ? t(c) : c)) };
}
const isEl = (n, tag) => !!n && n.type === 'element' && (!tag || n.tagName === tag);
const textOf = (n) => (n.type === 'text' ? n.value : n.type === 'raw' ? n.value.replace(/<[^>]+>/g, '') : (n.children || []).map(textOf).join(''));
const norm = (s) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const blank = (n) => n.type === 'text' && !n.value.trim();
const kids = (n) => (n.children || []).filter((c) => !blank(c));
function findAll(n, pred, out = []) { if (pred(n)) out.push(n); (n.children || []).forEach((c) => findAll(c, pred, out)); return out; }
const imgsOf = (n) => findAll(n, (x) => isEl(x, 'img'));
const srcOf = (i) => String(i.properties.src || '');
const hasImg = (n, re) => imgsOf(n).some((i) => re.test(srcOf(i)));
const classes = (n) => [].concat(n.properties?.className || []);
const addClass = (n, ...c) => { n.properties = n.properties || {}; n.properties.className = [...classes(n), ...c]; return n; };
const isRawCta = (n) => (n.type === 'raw' && /estimate-cta/.test(n.value)) || (isEl(n, 'div') && classes(n).includes('estimate-cta'));

const BADGE = /\/Group-279\.webp$/;
const TRUST = /\/Group-170\.webp$/;
const ICON_MAX_TEXT = 90;

// ---- sliders and the video popup -------------------------------------------
// A plain scroll-snap slider (arrows + autoplay from BaseLayout's script), the
// same job the live Elementor carousels do.
function carousel(slides, { label, per = 3, auto = 5000, cls = '' } = {}) {
  return el('div', { className: ['tb-carousel', cls].filter(Boolean), role: 'region', ariaRoleDescription: 'carousel', ariaLabel: label, dataPer: String(per), dataAutoplay: String(auto) }, [
    // Chevrons are drawn in CSS (.tc-btn::before); the label carries the meaning.
    el('button', { type: 'button', className: ['tc-btn', 'tc-prev'], ariaLabel: 'Previous' }),
    el('div', { className: ['tc-track'], tabIndex: 0 }, slides.map((s, i) => el('div', { className: ['tc-slide'], role: 'group', ariaRoleDescription: 'slide', ariaLabel: `${i + 1} of ${slides.length}` }, [s]))),
    el('button', { type: 'button', className: ['tc-btn', 'tc-next'], ariaLabel: 'Next' }),
  ]);
}
// The live "Play Video" button: an empty link to the Bugsy's YouTube video.
const YT = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/;
function videoOf(n) {
  if (!isEl(n, 'p')) return null;
  const k = kids(n);
  if (k.length !== 1 || !isEl(k[0], 'a') || textOf(k[0]).trim()) return null;
  const m = String(k[0].properties.href || '').match(YT);
  return m ? m[1] : null;
}
// The YouTube player only loads after the click (see BaseLayout); the plain
// link opens the video on YouTube instead.
const videoButton = (id) => el('p', { className: ['video-row'] }, [
  el('button', { type: 'button', className: ['video-btn'], dataVideo: id }, [el('span', { className: ['video-play'], ariaHidden: 'true' }), 'Play Video']),
  el('a', { className: ['video-link'], href: `https://www.youtube.com/watch?v=${id}`, rel: 'noopener' }, ['Watch on YouTube']),
]);
// Portfolio slider: Bugsy's own job photos from the live media library, with
// the alt text the library gives them.
const PORTFOLIO = [
  ['2026/03/6.webp', 'Pest control technician on a ladder treating a commercial building interior'],
  ['2026/03/5.webp', 'Technician treating a garage interior with an extension pole duster'],
  ['2026/03/2-1.webp', 'Technician treating the eaves of a home\'s exterior with an extension pole'],
  ['2026/03/1.webp', 'Technician with a backpack sprayer treating garden shrubs'],
  ['2026/03/4.webp', 'Technician with a backpack sprayer treating a garage corner'],
  ['2026/03/wmremove-transformed.webp', 'Technician on a ladder treating a home\'s gutters and eaves'],
  ['2025/04/Group-333-min.webp', 'Bugsy\'s Pest Solutions van parked in front of a home'],
];
const portfolioSlides = () => PORTFOLIO.map(([f, alt]) => el('figure', {}, [el('img', { src: `https://trustbugsy.com/wp-content/uploads/${f}`, alt, width: 600, height: 450, loading: 'lazy', decoding: 'async' })]));
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// ---- what kind of block is this? -------------------------------------------
const EYEBROWS = new Set([
  'our process', 'our services', 'why choose us', 'bugsy pest portfolio', 'any questions?', 'service areas',
  'from service to solutions', "the bugsy's difference", 'problem with basic pest control',
]);
function markerOf(n) {
  if (isEl(n) && /^(p|h2|h3)$/.test(n.tagName)) {
    const s = norm(textOf(n));
    if (s === 'get a free quote') return 'quote';
    if (s === 'client testimonials') return 'reviews';
    if (s === 'our services') return 'services';
    if (s.startsWith('trusted pest control solutions')) return 'trusted';
    if (s === 'problem with basic pest control') return 'problem';
    if (s === "the bugsy's difference") return 'difference';
    if (s === 'why choose us') return 'why';
    if (s === 'bugsy pest portfolio') return 'portfolio';
    if (s === "bugsy's proven pest control process") return 'process';
    if (s === 'from service to solutions') return 'faq';
    if (s === 'any questions?') return 'ask';
    if (s === 'service areas') return 'areas';
    if (s === 'trusted pest control, guaranteed results') return 'ticker';
  }
  if (hasImg(n, /\/Group-266\.webp$/)) return 'chevron';
  if (hasImg(n, /\/Group-285[^/]*\.webp$/)) return 'about';
  if (hasImg(n, TRUST)) return 'trust';
  return null;
}

// A paragraph that only holds links with no text and no picture (left over
// from Elementor buttons and video popups), or a lone dash.
function isJunk(n) {
  if (!isEl(n, 'p') && !isEl(n, 'li')) return false;
  const s = textOf(n).trim();
  if (/^[-—–]+$/.test(s)) return true;
  return !s && imgsOf(n).length === 0;
}
// "[icon] Veteran-Owned & Operated" — a small icon followed by a short line.
function isIconLine(n) {
  if (!isEl(n, 'p')) return false;
  const k = kids(n);
  if (!k.length || !isEl(k[0], 'img') || imgsOf(n).length !== 1) return false;
  const rest = textOf(n).trim();
  return rest.length > 0 && rest.length <= ICON_MAX_TEXT;
}
// A paragraph or list made only of pictures (logo rows, badge rows, galleries).
function isImageRow(n) {
  if (!(isEl(n, 'p') || isEl(n, 'ul'))) return false;
  return imgsOf(n).length >= 2 && !textOf(n).trim();
}
const BUTTON_TEXT = new Set([
  "let's get started", 'get your free estimate', 'call us now!', 'see all reviews', 'write a reviews',
  'schedule call today!',
]);
function buttonsFrom(n) {
  // Returns button elements if this paragraph is only button-ish text/links.
  if (!isEl(n, 'p')) return null;
  const out = [];
  for (const c of n.children || []) {
    if (blank(c)) continue;
    if (c.type === 'text') {
      const s = norm(c.value);
      if (s === 'schedule call today!') { out.push(el('a', { href: '/contact/', className: ['btn', 'btn-light'] }, ['Schedule Call Today!'])); continue; }
      return null;
    }
    if (isEl(c, 'a') && BUTTON_TEXT.has(norm(textOf(c))) && !imgsOf(c).length) {
      const s = norm(textOf(c));
      const tone = s === "let's get started" ? 'btn-maroon' : s.startsWith('see all') || s.startsWith('write') ? 'btn-outline' : 'btn-red';
      addClass(c, 'btn', tone);
      out.push(c);
      continue;
    }
    return null;
  }
  return out.length ? out : null;
}

// ---- reviews ----------------------------------------------------------------
const NO_TEXT = /^\(5 stars, no review text shown\)$/i;
function reviewCard(name, body) {
  return el('div', { className: ['review'] }, [
    el('div', { className: ['review-head'] }, [el('span', { className: ['g-mark'], ariaHidden: 'true' }, ['G']), el('strong', {}, [name])]),
    el('div', { className: ['stars'], role: 'img', ariaLabel: '5 out of 5 stars on Google' }, ['★★★★★']),
    // Live shows "This user only left a rating." on cards with no text.
    el('p', {}, [body && !NO_TEXT.test(body) ? body : 'This user only left a rating.']),
  ]);
}
// <p><strong>Name</strong>\nText</p>
function reviewFromP(n) {
  if (!isEl(n, 'p')) return null;
  const k = n.children || [];
  const first = k.find((c) => !blank(c));
  if (!isEl(first, 'strong')) return null;
  const after = k.slice(k.indexOf(first) + 1);
  const rest = after.map(textOf).join('');
  if (rest.trim() && !/^\s*\n/.test(rest) && !/^\s*[—-]\s/.test(rest)) return null;
  return reviewCard(textOf(first).trim(), rest.replace(/^\s*[—-]?\s*/, '').trim());
}
// - **Name** — Text
function reviewsFromUl(n) {
  if (!isEl(n, 'ul')) return null;
  const items = kids(n).filter((c) => isEl(c, 'li'));
  if (!items.length) return null;
  const cards = [];
  for (const li of items) {
    const p = isEl(kids(li)[0], 'p') ? kids(li)[0] : li;
    const c = reviewFromP({ ...p, tagName: 'p' });
    if (!c) return null;
    cards.push(c);
  }
  return cards;
}
function collectReviews(nodes) {
  const cards = [];
  const rest = [];
  for (const n of nodes) {
    const one = reviewFromP(n);
    if (one) { cards.push(one); continue; }
    const many = reviewsFromUl(n);
    if (many) { cards.push(...many); continue; }
    rest.push(n);
  }
  return { cards, rest };
}

// ---- service cards: "### [Ant Control](/ant-control/)" + icon link ----------
function linkOnly(n) {
  // <p><a href=x><img?></a></p> -> a
  if (!isEl(n, 'p')) return null;
  const k = kids(n);
  return k.length === 1 && isEl(k[0], 'a') && !textOf(k[0]).trim() ? k[0] : null;
}
function serviceCards(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const hk = isEl(n, 'h3') ? kids(n) : [];
    if (hk.length === 1 && isEl(hk[0], 'a')) {
      const href = hk[0].properties.href;
      let icon = null;
      const prev = out.length ? linkOnly(out[out.length - 1]) : null;
      const next = linkOnly(nodes[i + 1]);
      if (prev && prev.properties.href === href) { icon = imgsOf(prev)[0] || null; out.pop(); }
      else if (next && next.properties.href === href) { icon = imgsOf(next)[0] || null; i++; }
      if (icon) icon.properties.loading = 'lazy';
      out.push(el('div', { className: ['svc-item'] }, [
        el('a', { href, className: ['svc-icon'], tabIndex: -1, ariaHidden: 'true' }, [icon || el('span', { className: ['svc-dot'] })]),
        addClass(n, 'svc-title'),
      ]));
      continue;
    }
    out.push(n);
  }
  return groupRuns(out, (n) => isEl(n, 'div') && classes(n).includes('svc-item'), (run) => el('div', { className: ['svc-grid'] }, run));
}

function groupRuns(nodes, pred, wrap) {
  const out = [];
  let run = [];
  const flush = () => { if (run.length) out.push(wrap(run)); run = []; };
  for (const n of nodes) { if (pred(n)) run.push(n); else { flush(); out.push(n); } }
  flush();
  return out;
}

// ---- shared clean-up for any run of blocks ----------------------------------
function polish(nodes, { hero = false } = {}) {
  let out = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const vid = videoOf(n);
    if (vid) { out.push(videoButton(vid)); continue; }
    if (isJunk(n)) continue;
    if (isEl(n, 'ul')) {
      n.children = (n.children || []).filter((c) => !(isEl(c, 'li') && isJunk(c)));
      if (!kids(n).length) continue;
    }
    if (isImageRow(n)) {
      const pics = isEl(n, 'ul') ? kids(n).flatMap((li) => kids(li)) : kids(n);
      if (hasImg(n, /Group-32[5-7]|Group-338/)) { out.push(carousel(pics, { label: 'Our plans', per: 3, cls: 'pkg-carousel' })); continue; }
      out.push(el('div', { className: ['logo-row', hasImg(n, /Group-16[23]/) ? 'rating-row' : 'logos'] }, pics));
      continue;
    }
    if (isIconLine(n)) { out.push(addClass(n, 'icon-line')); continue; }
    const btns = buttonsFrom(n);
    if (btns) { out.push(el('p', { className: ['btn-row'] }, btns)); continue; }
    if (isEl(n, 'p') && EYEBROWS.has(norm(textOf(n)))) {
      // The small label above a section title is dropped (the section is still
      // found by markerOf before this runs). "Any Questions?" has no title
      // under it, so it becomes the band's own heading.
      if (norm(textOf(n)) === 'any questions?') { out.push(el('h2', { className: ['ask-title'] }, n.children)); continue; }
      const nx = nodes[i + 1];
      if (isEl(nx, 'p') && textOf(nx).trim().length < 120 && !findAll(nx, (x) => isEl(x, 'a') || isEl(x, 'img')).length) { addClass(nx, 'sec-title'); }
      continue;
    }
    if (isEl(n, 'p') && kids(n).length === 1 && isEl(kids(n)[0], 'img')) {
      const src = srcOf(kids(n)[0]);
      if (/Mask-group-8/.test(src)) addClass(n, 'team-photo');
      else addClass(n, 'photo');
      out.push(n);
      continue;
    }
    out.push(n);
  }
  out = groupRuns(out, (n) => isEl(n, 'p') && classes(n).includes('icon-line'), (run) => el('div', { className: ['icon-lines'] }, run));
  // Merge neighbouring button rows ("Schedule Call Today!" / "Let's Get Started").
  out = groupRuns(out, (n) => isEl(n, 'p') && classes(n).includes('btn-row'), (run) => el('p', { className: ['btn-row'] }, run.flatMap((r) => r.children)));
  out = serviceCards(out);
  return out;
}

// ---- quote form (preview only: the shared script stops it sending) ----------
function quoteForm(title, idp, office = OFFICES['lake-worth-beach']) {
  const f = (name, ph, type = 'text', extra = {}) => el('input', { name, type, placeholder: ph, ariaLabel: ph, ...extra });
  return el('form', { className: ['quote-form'], dataPreviewForm: '', action: '#', method: 'post' }, [
    title,
    f('name', 'Name', 'text', { autoComplete: 'name', required: true }),
    el('div', { className: ['qf-row'] }, [f('email', 'Email', 'email', { autoComplete: 'email' }), f('phone', 'Phone', 'tel', { autoComplete: 'tel', required: true })]),
    el('div', { className: ['qf-row'] }, [f('address', 'Address', 'text', { autoComplete: 'street-address' }), f('zip', 'Zip Code', 'text', { autoComplete: 'postal-code', inputMode: 'numeric' })]),
    el('select', { name: 'service', ariaLabel: 'Choose The Service' }, [el('option', { value: '' }, ['Choose The Service']), ...SERVICES.map((s) => el('option', {}, [s]))]),
    el('select', { name: 'existing_customer', ariaLabel: 'Existing Customer' }, [el('option', { value: '' }, ['Are you an Existing Customer?']), el('option', {}, ['Yes']), el('option', {}, ['No'])]),
    el('textarea', { name: 'message', rows: 3, placeholder: 'Message', ariaLabel: 'Message' }),
    el('label', { className: ['qf-consent'], htmlFor: `consent-${idp}` }, [
      el('input', { type: 'checkbox', name: 'consent', id: `consent-${idp}`, required: true }),
      el('span', {}, [CONSENT, el('a', { href: '/privacy-policy/' }, ['Privacy Policy']), ' and Terms & Conditions.']),
    ]),
    honeypot(),
    el('button', { type: 'submit', className: ['qf-submit'] }, ['Submit']),
    el('p', { className: ['form-note'], hidden: true }, ['This preview isn’t connected to an inbox yet. Please call ', el('a', { href: `tel:${office.tel}` }, [office.phone]), '.']),
  ]);
}
// Spam trap: people never see or fill it; the preview script clears it on
// submit, and a future handler should silently drop any request that has it.
const honeypot = () => el('div', { className: ['hp'], ariaHidden: 'true' }, [
  el('label', {}, ['Leave this field empty', el('input', { type: 'text', name: 'secondary_ref', tabIndex: -1, autoComplete: 'off', 'data-1p-ignore': '', 'data-lpignore': 'true', 'data-form-type': 'other' })]),
]);
const formTitle = (a, b, c) => el('p', { className: ['qf-title'] }, [a, el('span', {}, [b]), c]);

// ---- sections ---------------------------------------------------------------
function splitMedia(nodes) {
  const i = nodes.findIndex((n) => isEl(n, 'p') && classes(n).includes('photo'));
  if (i < 0) return null;
  const media = [nodes[i]];
  const rest = nodes.filter((_, j) => j !== i);
  const b = rest.findIndex((n) => isEl(n, 'p') && classes(n).includes('btn-row'));
  if (b >= 0 && Math.abs(b - i) <= 1) media.push(rest.splice(b, 1)[0]);
  return { media, rest };
}
function steps(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (isEl(n, 'h3') && isEl(nodes[i + 1], 'p')) { out.push(el('div', { className: ['step'] }, [n, nodes[i + 1]])); i++; continue; }
    out.push(n);
  }
  return groupRuns(out, (n) => isEl(n, 'div') && classes(n).includes('step'), (run) => el('div', { className: ['steps'] }, run));
}
function faqs(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (isEl(n, 'h3')) {
      const body = [];
      while (nodes[i + 1] && !isEl(nodes[i + 1], 'h3') && isEl(nodes[i + 1], 'p') && !classes(nodes[i + 1]).length) body.push(nodes[++i]);
      out.push(el('details', { className: ['faq-item'] }, [el('summary', {}, [n]), ...body]));
      continue;
    }
    out.push(n);
  }
  return out;
}
const wrap = (kids) => el('div', { className: ['wrap'] }, kids);
function section(kind, nodes) {
  if (kind === 'ticker') {
    const s = textOf(nodes[0]).trim();
    return el('div', { className: ['tb-ticker'] }, [el('p', {}, [s]), ...[1, 2, 3].map(() => el('span', { ariaHidden: 'true' }, [s]))]);
  }
  if (kind === 'chevron') return el('div', { className: ['tb-chevron'] }, nodes);
  if (kind === 'trust') return el('section', { className: ['tb-trust'] }, [wrap(polish(nodes))]);
  let body = polish(nodes);
  if (kind === 'reviews') {
    const { cards, rest } = collectReviews(body);
    const at = rest.findIndex((n) => isEl(n, 'p') && classes(n).includes('btn-row'));
    const grid = cards.length > 3 ? carousel(cards, { label: 'Client testimonials', per: 3, cls: 'reviews-carousel' }) : el('div', { className: ['reviews'] }, cards);
    if (at >= 0) rest.splice(at, 0, grid); else rest.push(grid);
    body = rest;
  }
  if (kind === 'portfolio') {
    body = body.filter((n) => !(isEl(n, 'p') && classes(n).includes('photo')) && !(isEl(n, 'div') && classes(n).includes('logo-row')));
    body.push(carousel(portfolioSlides(), { label: 'Bugsy Pest Portfolio', per: 3, cls: 'portfolio-carousel' }));
  }
  if (kind === 'process') body = steps(body);
  if (kind === 'faq') body = faqs(body);
  if (['about', 'services', 'ask', 'why', 'trusted'].includes(kind)) {
    const m = splitMedia(body);
    if (m) body = [el('div', { className: ['split'] }, [el('div', { className: ['split-media'] }, m.media), el('div', { className: ['split-body'] }, m.rest)])];
  }
  return el('section', { className: ['tb-sec', `tb-${kind}`], id: kind === 'faq' ? 'faqs' : undefined }, [wrap(body)]);
}

// ---- Smart Site blocks ------------------------------------------------------
// "At a glance" facts table (snippet shape: table). Every value is a published
// business fact or this page's own service and place.
function glance(fm, node, office) {
  const svc = String(fm.service || node.serviceName || '').replace(/\s*\|.*$/, '');
  const where = node.cityName ? `${node.cityName}, FL (${GRAPH.counties[node.county]?.name || ''})`.replace(' ()', '') : REGIONS;
  const row = (k, v) => el('tr', {}, [el('th', { scope: 'row' }, [k]), el('td', {}, [v])]);
  return el('table', { className: ['tb-glance'] }, [
    el('caption', {}, ['At a glance']),
    el('tbody', {}, [
      svc ? row('Service', svc) : null,
      row('Area served', where),
      row('Nearest office', el('a', { href: office.maps, rel: 'noopener' }, [`${office.label}: ${office.addr}`])),
      row('Call', el('a', { href: `tel:${office.tel}` }, [office.phone])),
      row('License', LICENSE),
      row('Estimate', el('a', { href: '/contact/' }, ['Free estimate'])),
    ]),
  ]);
}
// Named-expert box (E-E-A-T): facts from the live About page.
function ownerBox() {
  return el('aside', { className: ['tb-owner'], ariaLabel: 'About the owner' }, [
    el('p', {}, [
      'Bugsy’s Pest Solutions is owned by ', el('strong', {}, ['Zach Bernstein']),
      ', a U.S. Marine Corps veteran who began his pest control career in July 2017. Veteran-owned and family-operated, with offices in Lake Worth Beach and Pompano Beach. ',
      el('a', { href: '/about/' }, ['Read the Bugsy’s story']), '.',
    ]),
  ]);
}
function officeCard(office) {
  return el('div', { className: ['tb-office'] }, [
    el('p', { className: ['tb-office-name'] }, [`Your nearest office: Bugsy’s ${office.label}`]),
    el('p', {}, [el('a', { href: office.maps, rel: 'noopener' }, [office.addr])]),
    el('p', {}, [el('a', { className: ['btn', 'btn-red'], href: `tel:${office.tel}` }, [`Call ${office.phone}`])]),
  ]);
}
// Blog extras: "On this page" contents from the post's h2s, and the author box
// (facts from the live About page).
function toc(content) {
  const seen = new Set();
  const heads = content.filter((n) => isEl(n, 'h2') && textOf(n).trim());
  for (const h of heads) {
    let id = h.properties.id || slug(textOf(h)) || 'section';
    while (seen.has(id)) id += '-2';
    seen.add(id);
    h.properties.id = id;
  }
  if (heads.length < 3) return null;
  return el('nav', { className: ['tb-toc'], ariaLabel: 'On this page' }, [
    el('p', { className: ['tb-toc-title'] }, ['On this page']),
    el('ol', {}, heads.map((h) => el('li', {}, [el('a', { href: `#${h.properties.id}` }, [textOf(h).trim()])]))),
  ]);
}
function authorBox(name) {
  return el('aside', { className: ['tb-author'], ariaLabel: 'About the author' }, [
    el('img', { src: 'https://trustbugsy.com/wp-content/uploads/2025/04/Group-285-2.webp', alt: 'Zach Bernstein, owner of Bugsy’s Pest Solutions', width: 96, height: 96, loading: 'lazy', decoding: 'async' }),
    el('div', {}, [
      el('p', { className: ['tb-author-name'] }, [`Written by ${name}`]),
      el('p', {}, ['Owner of Bugsy’s Pest Solutions and a U.S. Marine Corps veteran who began his pest control career in July 2017. ', el('a', { href: '/about/' }, ['More about Zach and the team']), '.']),
    ]),
  ]);
}
// "Ant Control • Boca Raton, FL": a small label the copy puts just above the
// page's first heading. It becomes a plain line under the h1 ("Pest Control in
// Aberdeen, Boynton Beach"), or is dropped when the h1 already says it.
const KICKER = /^[^•]{2,70} • [^•]{2,70}$/;
const isKicker = (n) => isEl(n, 'p') && kids(n).length === 1 && kids(n)[0].type === 'text' && KICKER.test(textOf(n).trim());
function takeKicker(nodes) {
  const i = nodes.findIndex((n, j) => j < 5 && isKicker(n) && (isEl(nodes[j + 1], 'h1') || isEl(nodes[j + 1], 'h2')));
  if (i < 0) return null;
  const [a, b] = textOf(nodes.splice(i, 1)[0]).trim().split(' • ');
  return `${a} in ${b}`;
}
const words = (s) => norm(s).replace(/[^a-z0-9’' ]+/g, ' ').split(' ').filter((w) => w && !['in', 'fl', 'the', 'and'].includes(w));
const GLANCE_KINDS = new Set(['service', 'commercial', 'cityservice', 'city', 'neighborhood', 'county']);
const OWNER_KINDS = new Set(['service', 'commercial', 'cityservice', 'city', 'neighborhood', 'county', 'countytopic', 'library']);

// ---- the plugin -------------------------------------------------------------
export default function rehypeBugsy() {
  return (tree, file) => {
    const fm = file.data?.astro?.frontmatter || {};
    const node = graphNode(fm.path) || { kind: fm.type, links: [] };
    const office = OFFICES[node.office] || OFFICES['lake-worth-beach'];
    let nodes = tree.children.filter((n) => !blank(n));

    const kicker = takeKicker(nodes);
    // One h1, taken from the copy (or the page's recorded h1 if the copy has none).
    const h1i = nodes.findIndex((n) => isEl(n, 'h1'));
    const h1 = h1i >= 0 ? nodes.splice(h1i, 1)[0] : fm.h1 ? el('h1', {}, [fm.h1]) : null;
    const h1Words = new Set(words(h1 ? textOf(h1) : ''));
    const sub = kicker && !words(kicker).every((w) => h1Words.has(w)) ? el('p', { className: ['tb-sub'] }, [kicker]) : null;

    const out = [];
    const badgeIdx = nodes.findIndex((n, i) => i < 8 && hasImg(n, BADGE));
    let trustNode = null;
    if (badgeIdx >= 0) {
      // Template pages (home, services, about...): the live hero.
      let end = nodes.findIndex((n) => hasImg(n, TRUST));
      if (end < 0) end = nodes.findIndex((n, i) => i > badgeIdx && (isRawCta(n) || markerOf(n)));
      if (end < 0) end = Math.min(nodes.length, badgeIdx + 10);
      const heroNodes = nodes.slice(0, end).filter((n) => !isRawCta(n) && !/^get your free estimate$/.test(norm(textOf(n))) && !hasImg(n, /\/Group-166\.webp$/));
      if (hasImg(nodes[end] || { children: [] }, TRUST)) trustNode = nodes[end++];
      nodes = nodes.slice(end);
      const copy = polish(heroNodes, { hero: true });
      const teamAt = copy.findIndex((n) => classes(n).includes('team-photo'));
      const team = teamAt >= 0 ? copy.splice(teamAt, 1)[0] : null;
      out.push(el('section', { className: ['tb-hero'] }, [
        el('div', { className: ['wrap', 'tb-hero-grid'] }, [
          el('div', { className: ['tb-hero-copy'] }, [h1, sub, ...copy]),
          team ? el('div', { className: ['tb-hero-team'] }, [team]) : null,
          el('div', { className: ['tb-hero-form'] }, [quoteForm(formTitle('Get your ', 'Free', ' Estimate'), 'hero', office)]),
        ]),
        el('p', { className: ['tb-hero-call'] }, [el('a', { href: `tel:${office.tel}` }, ['Call Us Now ', el('strong', {}, [office.phone])])]),
      ]));
    } else {
      const bg = fm.type === 'blog' ? BANNER_BLOG : BANNER_CITY;
      out.push(el('section', { className: ['tb-banner', fm.type === 'blog' ? 'tb-banner-blog' : 'tb-banner-page'], style: `--banner:url('${bg}')` }, [wrap([h1, sub].filter(Boolean))]));
    }
    if (trustNode) out.push(section('trust', [trustNode]));

    // Body copy runs until the first shared section.
    let cut = nodes.findIndex((n) => markerOf(n));
    if (cut < 0) cut = nodes.length;
    const content = polish(nodes.slice(0, cut));
    let rest = nodes.slice(cut);

    // "Get A Free Quote" + its call box become the sidebar form; reviews that
    // follow it sit under the form, as on the live city pages.
    let asideReviews = [];
    if (rest.length && markerOf(rest[0]) === 'quote') {
      rest = rest.slice(1);
      while (rest.length && isRawCta(rest[0])) rest = rest.slice(1);
      let k = 0;
      while (k < rest.length && (reviewFromP(rest[k]) || reviewsFromUl(rest[k]))) k++;
      if (k && content.length) { asideReviews = collectReviews(rest.slice(0, k)).cards; rest = rest.slice(k); }
    }

    if (content.length) {
      const blog = fm.type === 'blog' && !['/blog/', '/blogs/'].includes(fm.path);
      const asideKids = blog
        ? [el('div', { className: ['tb-offer'] }, [
            el('p', { className: ['tb-offer-title'] }, ['Limited time offer: New Customers Save $35 on a Science-Backed Pest Plan']),
            quoteForm(null, 'side', office),
            el('p', { className: ['tb-offer-note'] }, ['A Bugsy’s team member will reach out within 15 minutes during business hours with your free estimate. Need us now? Call ', el('a', { href: `tel:${office.tel}` }, [office.phone]), '.']),
          ])]
        : [el('div', { className: ['tb-quote'] }, [quoteForm(formTitle('Get ', 'a Free', ' Quote'), 'side', office)])];
      if (!blog && GLANCE_KINDS.has(node.kind)) asideKids.push(officeCard(office));
      if (GLANCE_KINDS.has(node.kind)) {
        const firstP = content.findIndex((n) => isEl(n, 'p') && textOf(n).trim().length > 60);
        content.splice(firstP >= 0 ? firstP + 1 : 0, 0, glance(fm, node, office));
      }
      if (OWNER_KINDS.has(node.kind)) content.push(ownerBox());
      if (blog) {
        const nav = toc(content);
        if (nav) { const at = content.findIndex((n) => isEl(n, 'h2')); content.splice(at >= 0 ? at : 0, 0, nav); }
        if (/zach/i.test(fm.author || '')) content.push(authorBox(fm.author));
      }
      if (asideReviews.length) asideKids.push(carousel(asideReviews, { label: 'Client testimonials', per: 1, auto: 6000, cls: 'reviews-aside' }));
      out.push(el('div', { className: ['tb-main'] }, [
        el('div', { className: ['wrap', 'tb-layout'] }, [
          el('article', { className: ['tb-content', 'prose'] }, content),
          el('aside', { className: ['tb-aside'] }, [el('div', { className: ['tb-aside-inner'] }, asideKids)]),
        ]),
      ]));
    }

    // The shared sections, each its own full-width band.
    let cur = null;
    const flush = () => { if (cur && cur.nodes.length) out.push(section(cur.kind, cur.nodes)); cur = null; };
    for (const n of rest) {
      const m = markerOf(n);
      if (m === 'quote') { flush(); cur = { kind: 'misc', nodes: [] }; continue; }
      if (isRawCta(n)) continue;
      if (m && (!cur || m !== cur.kind || ['ticker', 'chevron', 'trust'].includes(m))) { flush(); cur = { kind: m, nodes: [n] }; if (['ticker', 'chevron', 'trust'].includes(m)) flush(); continue; }
      if (!cur) cur = { kind: 'misc', nodes: [] };
      cur.nodes.push(n);
    }
    flush();
    // A city page that ended on the quote marker may leave stray reviews in a
    // misc band: show them as a review grid.
    out.forEach((sec, i) => imgsOf(sec).forEach((img) => {
      img.properties.decoding = 'async';
      if (i === 0) { if (/Mask-group-8/.test(srcOf(img))) img.properties.fetchPriority = 'high'; }
      else img.properties.loading = 'lazy';
    }));
    tree.children = out.map((n) => {
      if (isEl(n, 'section') && classes(n).includes('tb-misc')) {
        const inner = n.children[0];
        const { cards, rest: r } = collectReviews(inner.children);
        if (cards.length) inner.children = [...r, el('div', { className: ['reviews'] }, cards)];
      }
      return n;
    });
  };
}
