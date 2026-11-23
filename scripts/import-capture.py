"""Turn captured live-site markdown into src/clone/*.md with frontmatter.
usage: python3 -I import_capture.py CAPTURE_DIR OUT_DIR
"""
import json, os, re, sys

cap, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
media = {}
def norm(a): return re.sub(r'[’‘`]', "'", a).strip().lower()
mp = os.path.join(cap, '_media.json')
if os.path.exists(mp):
    raw = json.load(open(mp))
    if isinstance(raw, str):
        raw = json.loads(raw)
    for m in raw:
        a = (m.get('alt_text') or '').strip()
        if a:
            media.setdefault(a, m['source_url'])
            media.setdefault(norm(a), m['source_url'])

PLAN = {'/packages/', '/gold-package/', '/gold-plus/', '/platinum-package/', '/diamond-package/'}
LEGAL = {'/privacy-policy/', '/image-license/'}
CORE = {'/about/', '/contact/', '/reviews/', '/service-area/'}
COMM = re.compile(r'^/(commercial|hoa-condo|property-management|restaurants|healthcare|office-buildings|hotels|schools|retail|multi-family|government)')

def classify(path):
    if path == '/': return 'home'
    if path in PLAN: return 'plan'
    if path in LEGAL: return 'legal'
    if path in CORE: return 'core'
    if path.startswith('/blogs/') or path.startswith('/blog/'): return 'blog'
    if path.startswith('/pest-library/'): return 'library'
    if path.startswith('/service-area/') or path.endswith('-fl-pest-control/') or re.match(r'^/(stuart|fort-pierce)-pest-control/$', path) or 'county' in path: return 'area'
    if COMM.match(path): return 'commercial'
    return 'service'

def q(s):
    return json.dumps(s, ensure_ascii=False)

def plain(md):
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', md)
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
    return re.sub(r'[*_`#>]', '', t).strip()

def trim(s, n=158):
    s = re.sub(r'\s+', ' ', s).strip()
    if len(s) <= n: return s
    end = re.search(r'^.{60,185}?[a-z](?<!St)(?<!Ft)(?<!Mt)(?<!Dr)(?<!Mr)(?<!Co)\.(?=\s|$)', s)   # finish the first sentence if it nearly fits
    if end and not re.search(r'\b(St|Ft|Mt|Dr|Mr|Mrs|Inc|Co)\.$', end.group(0)): return end.group(0)
    cut = s[:n]
    dots = [i for i in range(len(cut) - 1) if cut[i:i+2] == '. ' and not re.search(r'\b(St|Ft|Mt|Dr|Mr|Mrs|Inc|Co)$', cut[:i])]
    dot = dots[-1] if dots else -1
    return (cut[:dot+1] if dot > 80 else cut[:cut.rfind(' ')].rstrip(',;:') + '…')

FORM_CTA = ('<div class="estimate-cta"><p><strong>Get your free estimate.</strong> Call '
            '<a href="tel:+15616548998">(561) 654-8998</a> (Palm Beach) or '
            '<a href="tel:+19547511620">(954) 751-1620</a> (Pompano Beach), or '
            '<a href="/contact/">send us a request</a>.</p></div>')
FORM_CONTACT = '<form class="estimate-form" data-preview-form action="#" method="post"><div class="row"><label>First Name<input name="first_name" autocomplete="given-name" required></label><label>Last Name<input name="last_name" autocomplete="family-name"></label></div><div class="row"><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Phone Number<input type="tel" name="phone" autocomplete="tel" required></label></div><div class="row"><label>Address<input name="address" autocomplete="street-address"></label><label>Zip Code<input name="zip" autocomplete="postal-code" inputmode="numeric"></label></div><div class="row"><label>Are you a New Customer?<select name="new_customer"><option>Yes</option><option>No</option></select></label><label>Choose the Service<select name="service"><option>Ant Control</option><option>Cockroach Control &amp; Extermination</option><option>Spider Control &amp; Removal Services</option><option>Flea Control &amp; Extermination</option><option>Bee Removal &amp; Control</option><option>Bed Bug Extermination</option><option>Rat Control &amp; Extermination</option><option>Mosquito Control</option><option>Wasp Control &amp; Removal</option><option>Insulation Removal</option><option>Insulation Replacement</option><option>Attic Sanitation</option><option>Termite Control</option><option>Others</option></select></label></div><label>Message<textarea name="message" rows="4" placeholder="What&#39;s Bugging you?"></textarea></label><label class="consent"><input type="checkbox" name="consent" required> By submitting your information, you agree to receive notifications and promotional SMS from Bugsy’s Pest Solutions. You can reply "STOP" at any time to unsubscribe. I agree to the <a href="/privacy-policy/">Privacy Policy</a> and Terms &amp; Conditions</label><button class="btn btn-cta" type="submit">Submit</button><p class="form-note" hidden>This preview isn’t connected to an inbox yet. Please call <a href="tel:+15616548998">(561) 654-8998</a>.</p></form>'
# Live redirects (seen in the browser 23 Nov 2026): old path -> page that answers.
REDIR = {'/rat-rodent-control/': '/rodent-control/', '/commercial-pest-control/': '/commercial/'}
done_paths = set()
missing = set()
known = set()
for fn in os.listdir(cap):
    if fn.endswith('.md') and not fn.startswith('_'):
        mm = re.search(r'^url:\s*(\S+)', open(os.path.join(cap, fn), encoding='utf-8').read(), re.M)
        if mm:
            pth = re.sub(r'^https?://[^/]+', '', mm.group(1)) or '/'
            pth = pth if pth.endswith('/') else pth + '/'
            known.add(REDIR.get(pth, pth))
offsite = set()
for fn in sorted(os.listdir(cap)):
    if not fn.endswith('.md') or fn.startswith('_'): continue
    src = open(os.path.join(cap, fn), encoding='utf-8').read()
    m = re.match(r'^---\n(.*?)\n---\n?(.*)$', src, re.S)
    if not m:
        print('skip (no frontmatter):', fn); continue
    meta = dict(re.findall(r'^(\w+):\s*(.*)$', m.group(1), re.M))
    body = m.group(2)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)            # capture notes
    body = re.sub(r'<!--.*$', '', body, flags=re.S)               # unterminated note at end
    body = re.sub(r'^(Image carousel|Package badge carousel)[^\n]*:\s*$', '', body, flags=re.M)
    body = re.sub(r'^\[(Embedded map iframe|Play Video button)\]\s*$', '', body, flags=re.M)
    body = re.sub(r'^\(All Google reviews[^\n]*\)\s*$', '', body, flags=re.M)
    body = re.sub(r'^\[FORM: ?([^,\]]+)[^\n]*$', lambda f: FORM_CONTACT if 'contact' in f.group(1).lower() else FORM_CTA, body, flags=re.M)
    body = re.sub(r'\]\(tel:\)', '](tel:+15616548998)', body)
    body = re.sub(r'\n{3,}', '\n\n', body).strip() + '\n'
    url = meta.get('url', '').strip()
    path = re.sub(r'^https?://[^/]+', '', url) or '/'
    if not path.endswith('/'): path += '/'
    path = REDIR.get(path, path)
    if path in done_paths:
        print('skip duplicate of', path, '(', fn, ')'); continue
    done_paths.add(path)
    title = meta.get('title', '').strip()
    title = re.sub(r'\s*[-|–]\s*Bugsy.*$', '', title) if len(title) > 60 else title
    h1m = re.search(r'^# (.+)$', body, re.M)
    h1 = h1m.group(1).strip() if h1m else title
    typ = classify(path)
    if typ == 'home' and h1m:
        body = body.replace(h1m.group(0), '', 1)
    # images: alt -> live src
    def img(mm):
        alt = mm.group(1).strip()
        if mm.group(2).startswith('http'): return mm.group(0)
        if mm.group(2).startswith('/wp-content/'): return f'![{alt}](https://trustbugsy.com{mm.group(2)})'
        u = media.get(alt) or media.get(norm(alt))
        if not u:
            missing.add(alt); return ''
        return f'![{alt}]({u})'
    body = re.sub(r'!\[([^\]]*)\]\(([^)]*)\)', img, body)
    # internal links -> relative
    def link(pth):
        pth = pth or '/'
        if pth.startswith('/wp-content/'):
            return '](https://trustbugsy.com' + pth + ')'
        base = pth.split('#')[0].split('?')[0]
        if not base.endswith('/'): base += '/'
        if base in REDIR:
            pth = base = REDIR[base]
        if base in known:
            return '](' + pth + ')'
        offsite.add(base)
        return '](https://trustbugsy.com' + pth + ')'
    body = re.sub(r'\]\(https?://(?:www\.)?trustbugsy\.com(/[^)\s]*)?\)', lambda mm: link(mm.group(1)), body)
    body = re.sub(r'\]\((/[^)\s]*)\)', lambda mm: link(mm.group(1)), body)
    # FAQs
    faqs = []
    for fm in re.finditer(r'^### Q: (.+?)\n(.*?)(?=^#{1,3} |\Z)', body, re.S | re.M):
        a = plain(re.split(r'\n\s*\n', fm.group(2).strip())[0])
        if a and 'ANSWER NOT CAPTURED' not in a:
            faqs.append({'q': fm.group(1).strip(), 'a': re.sub(r'\s+', ' ', a)})
    body = re.sub(r'^### Q: ', '### ', body, flags=re.M)
    # description: first real paragraph
    desc = ''
    for para in re.split(r'\n\s*\n', body):
        p = para.strip()
        if not p or p.startswith(('#', '!', '-', '[', '|', '>', '<', '*')): continue
        t = plain(p)
        if len(t) > 60: desc = trim(t); break
    desc = desc or trim(h1)
    firstimg = re.search(r'!\[[^\]]*\]\((https?://[^)]+)\)', body)
    fmlines = ['---', f'path: {q(path)}', f'title: {q(title)}', f'description: {q(desc)}', f'type: {q(typ)}', f'h1: {q(h1)}']
    if typ in ('service', 'commercial'): fmlines.append(f'service: {q(h1)}')
    if firstimg: fmlines.append(f'image: {q(firstimg.group(1))}')
    if faqs: fmlines.append('faqs: ' + json.dumps(faqs, ensure_ascii=False))
    fmlines.append('---')
    slug = 'home' if path == '/' else path.strip('/').replace('/', '__')
    open(os.path.join(out, slug + '.md'), 'w', encoding='utf-8').write('\n'.join(fmlines) + '\n\n' + body)
    print(f'{typ:10} {path}  faqs={len(faqs)}')
print('links left pointing at the live site (page not copied yet):', len(offsite))
if missing:
    print('images with no src match:', len(missing))
    for a in sorted(missing)[:30]: print('  -', a)
