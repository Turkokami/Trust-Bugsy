// Copy lint: scans the built site (dist/) for wording and decoration habits
// we keep out of the copy. Prints a count and up to five examples per check.
// Exits 0 unless run with --strict and something was found.
//
//   npm run lint:copy            report only
//   npm run lint:copy -- --strict exit 1 when any check finds something
//   node scripts/copy-lint.mjs other/dir   scan another build folder
//
// No dependencies: a light regex pass over the HTML, good enough for a report.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const root = args.find((a) => !a.startsWith('--')) || 'dist';
if (!fs.existsSync(root)) { console.error(`copy-lint: ${root}/ not found; build the site first.`); process.exit(strict ? 1 : 0); }

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|css)$/.test(e.name)) files.push(p);
  }
})(root);

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', middot: '·', bull: '•', rarr: '→', raquo: '»', rsaquo: '›' };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, c) => {
  if (c[0] === '#') return String.fromCodePoint(c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10));
  return ENT[c.toLowerCase()] ?? m;
});
const strip = (html) => decode(html.replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const checks = {
  'real / really': [],
  'quiet / quietly': [],
  '1-2 word sentences in paragraphs': [],
  'arrows in link or button text': [],
  'middots / bullets in main content': [],
  'eyebrow / kicker / overline elements': [],
  'border-left accent rules in CSS': [],
};
const hit = (k, file, sample) => checks[k].push({ file: path.relative(root, file), sample: sample.slice(0, 110) });

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const css = file.endsWith('.css') ? raw : [...raw.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  // Thick (2px+) coloured left borders: the "callout with a side bar" look.
  for (const m of css.matchAll(/([^{}]+)\{[^{}]*border-left\s*:\s*(\d+(?:\.\d+)?)px[^;}]*[;}]/gi)) {
    if (parseFloat(m[2]) >= 2) hit('border-left accent rules in CSS', file, `${m[1].trim()} { border-left: ${m[2]}px … }`);
  }
  if (file.endsWith('.css')) continue;

  const body = (raw.match(/<body\b[\s\S]*<\/body>/i) || [raw])[0];
  const main = (body.match(/<main\b[\s\S]*<\/main>/i) || [body])[0];
  const text = strip(body);
  for (const m of text.matchAll(/.{0,40}\breal(ly)?\b.{0,30}/gi)) {
    if (!/\breal[\s-](estate|time)|realtor/i.test(m[0])) hit('real / really', file, m[0]);
  }
  for (const m of text.matchAll(/.{0,40}\bquiet(ly)?\b.{0,30}/gi)) {
    if (!/Quiet Waters/.test(m[0])) hit('quiet / quietly', file, m[0]);
  }
  for (const p of main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    // Split into sentences, but not after abbreviations like "St." or "Fla.".
    const s = strip(p[1]).split(/(?<!\b(?:St|Fla|Stat|Ch|incl|Dr|Mr|Mrs|Ms|vs|No|U\.S|approx)\.)(?<=[.!?])\s+/);
    s.forEach((sent, i) => {
      const w = sent.match(/[A-Za-z0-9'’-]+/g) || [];
      if (i > 0 && w.length >= 1 && w.length <= 2 && /\.$/.test(sent) && !/\d/.test(sent)) {
        hit('1-2 word sentences in paragraphs', file, s.slice(Math.max(0, i - 1), i + 1).join(' '));
      }
    });
  }
  for (const a of body.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = strip(a[2]);
    if (/[→›»➜➔⟶↗⇢]/.test(t)) hit('arrows in link or button text', file, t);
  }
  const mt = strip(main);
  for (const m of mt.matchAll(/.{0,35}\S\s*[·•]\s*\S.{0,35}/g)) hit('middots / bullets in main content', file, m[0]);
  for (const m of body.matchAll(/<(\w+)\b[^>]*class="([^"]*\b(?:eyebrow|kicker|overline)[^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi)) {
    hit('eyebrow / kicker / overline elements', file, `.${m[2]}: ${strip(m[3])}`);
  }
}

let total = 0;
console.log(`copy-lint: ${files.length} files in ${root}/`);
for (const [k, list] of Object.entries(checks)) {
  total += list.length;
  const pages = new Set(list.map((x) => x.file)).size;
  console.log(`\n${k}: ${list.length}${list.length ? ` (on ${pages} file${pages === 1 ? '' : 's'})` : ''}`);
  for (const x of list.slice(0, 5)) console.log(`  - ${x.sample}  [${x.file}]`);
}
process.exit(strict && total ? 1 : 0);
