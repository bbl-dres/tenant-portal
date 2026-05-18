import urllib.request, urllib.parse, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
           'Accept-Language': 'en-US,en;q=0.9'}

mode = 'web'
args = sys.argv[1:]
if args and args[0] in ('--images','-i'):
    mode = 'img'; args = args[1:]
q = ' '.join(args)
if mode == 'img':
    url = 'https://www.bing.com/images/search?q=' + urllib.parse.quote(q) + '&form=HDRSC2'
else:
    url = 'https://www.bing.com/search?q=' + urllib.parse.quote(q)
req = urllib.request.Request(url, headers=HEADERS)
try:
    d = urllib.request.urlopen(req, timeout=25).read().decode('utf-8', 'ignore')
except Exception as e:
    print('ERR:', e); sys.exit(1)
if mode == 'img':
    # Bing image: m=... mediaurl=
    links = re.findall(r'mediaurl=([^&"]+)', d)
    links = [urllib.parse.unquote(l) for l in links]
else:
    # Bing standard: <li class="b_algo"><h2><a href="...">
    links = re.findall(r'<li class="b_algo"[^>]*>\s*<h2><a[^>]+href="([^"]+)"', d)
    if not links:
        # Try broader
        links = re.findall(r'<h2[^>]*><a[^>]+href="([^"]+)"', d)
    if not links:
        # Cite blocks
        links = re.findall(r'<cite[^>]*>(https?://[^<]+)</cite>', d)
for l in links[:25]:
    print(l)
if not links:
    print('NO LINKS - dumping sample')
    # Find any external https URLs
    urls2 = re.findall(r'href="(https?://[^"]+)"', d)
    seen = set()
    for u in urls2:
        if 'bing.com' in u or 'microsoft.com' in u or 'msn.com' in u: continue
        if u in seen: continue
        seen.add(u)
        print(u)
        if len(seen) >= 25: break
