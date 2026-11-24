// Lays each copied page out the way the live trustbugsy.com shows it.
//
// The copy pipeline gives us one flat column of markdown per page. The live
// site (Elementor) shows the same words inside a hero with a quote form, a
// trust-logo strip, a two-column body with a sticky quote form, and a run of
// shared full-width sections (process, reviews, services, service areas...).
// This plugin rebuilds that structure from the flat copy with our own markup
// and classes; global.css styles it. No words are added or changed except the
// form labels and button text the live site itself shows.

const PHONE = { label: '(561) 654-8998', tel: '+15616548998' };
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
      out.push(el('div', { className: ['svc-card'] }, [
        el('a', { href, className: ['svc-icon'], tabIndex: -1, ariaHidden: 'true' }, [icon || el('span', { className: ['svc-dot'] })]),
        addClass(n, 'svc-title'),
      ]));
      continue;
    }
    out.push(n);
  }
  return groupRuns(out, (n) => isEl(n, 'div') && classes(n).includes('svc-card'), (run) => el('div', { className: ['svc-grid'] }, run));
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
    if (isJunk(n)) continue;
    if (isEl(n, 'ul')) {
      n.children = (n.children || []).filter((c) => !(isEl(c, 'li') && isJunk(c)));
      if (!kids(n).length) continue;
    }
    if (isImageRow(n)) {
      const pics = isEl(n, 'ul') ? kids(n).flatMap((li) => kids(li)) : kids(n);
      out.push(el('div', { className: ['logo-row', hasImg(n, /Group-32[5-7]|Group-338/) ? 'pkg-row' : hasImg(n, /Group-16[23]/) ? 'rating-row' : 'logos'] }, pics));
      continue;
    }
    if (isIconLine(n)) { out.push(addClass(n, 'icon-line')); continue; }
    const btns = buttonsFrom(n);
    if (btns) { out.push(el('p', { className: ['btn-row'] }, btns)); continue; }
    if (isEl(n, 'p') && EYEBROWS.has(norm(textOf(n)))) {
      addClass(n, 'eyebrow');
      const nx = nodes[i + 1];
      if (isEl(nx, 'p') && textOf(nx).trim().length < 120 && !findAll(nx, (x) => isEl(x, 'a') || isEl(x, 'img')).length) { addClass(nx, 'sec-title'); }
      out.push(n);
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
function quoteForm(title, idp) {
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
    el('button', { type: 'submit', className: ['qf-submit'] }, ['Submit']),
    el('p', { className: ['form-note'], hidden: true }, ['This preview isn’t connected to an inbox yet. Please call ', el('a', { href: `tel:${PHONE.tel}` }, [PHONE.label]), '.']),
  ]);
}
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
    const grid = el('div', { className: ['reviews'] }, cards);
    if (at >= 0) rest.splice(at, 0, grid); else rest.push(grid);
    body = rest;
  }
  if (kind === 'process') body = steps(body);
  if (kind === 'faq') body = faqs(body);
  if (['about', 'services', 'ask', 'why', 'trusted'].includes(kind)) {
    const m = splitMedia(body);
    if (m) body = [el('div', { className: ['split'] }, [el('div', { className: ['split-media'] }, m.media), el('div', { className: ['split-body'] }, m.rest)])];
  }
  return el('section', { className: ['tb-sec', `tb-${kind}`], id: kind === 'faq' ? 'faqs' : undefined }, [wrap(body)]);
}

// ---- the plugin -------------------------------------------------------------
export default function rehypeBugsy() {
  return (tree, file) => {
    const fm = file.data?.astro?.frontmatter || {};
    let nodes = tree.children.filter((n) => !blank(n));

    // One h1, taken from the copy (or the page's recorded h1 if the copy has none).
    const h1i = nodes.findIndex((n) => isEl(n, 'h1'));
    const h1 = h1i >= 0 ? nodes.splice(h1i, 1)[0] : fm.h1 ? el('h1', {}, [fm.h1]) : null;

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
          el('div', { className: ['tb-hero-copy'] }, [h1, ...copy]),
          team ? el('div', { className: ['tb-hero-team'] }, [team]) : null,
          el('div', { className: ['tb-hero-form'] }, [quoteForm(formTitle('Get your ', 'Free', ' Estimate'), 'hero')]),
        ]),
        el('p', { className: ['tb-hero-call'] }, [el('a', { href: `tel:${PHONE.tel}` }, ['Call Us Now ', el('strong', {}, [PHONE.label])])]),
      ]));
    } else {
      const bg = fm.type === 'blog' ? BANNER_BLOG : BANNER_CITY;
      out.push(el('section', { className: ['tb-banner', fm.type === 'blog' ? 'tb-banner-blog' : 'tb-banner-page'], style: `--banner:url('${bg}')` }, [wrap([h1])]));
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
            el('p', { className: ['tb-offer-kicker'] }, ['Limited Time Offer']),
            el('p', { className: ['tb-offer-title'] }, ['New Customers Save $35 on a Science-Backed Pest Plan']),
            quoteForm(null, 'side'),
            el('p', { className: ['tb-offer-note'] }, ['A Bugsy’s team member will reach out within 15 minutes during business hours with your free estimate. Need us now? Call ', el('a', { href: `tel:${PHONE.tel}` }, [PHONE.label]), '.']),
          ])]
        : [el('div', { className: ['tb-quote'] }, [quoteForm(formTitle('Get ', 'a Free', ' Quote'), 'side')])];
      if (asideReviews.length) asideKids.push(el('div', { className: ['reviews', 'reviews-aside'] }, asideReviews));
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
