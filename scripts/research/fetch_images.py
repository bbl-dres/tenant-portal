import urllib.request, re, sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

OUT = r'c:\Users\DavidRasner\Documents\GitHub\tenant-portal\assets\images\market-screening'
os.makedirs(OUT, exist_ok=True)

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
           'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
           'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'}

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        d = urllib.request.urlopen(req, timeout=25).read()
        return d
    except Exception as e:
        return f'ERR:{e}'.encode()

def download(url, slug):
    ext = url.split('?')[0].split('.')[-1].lower()
    if ext not in ('png','jpg','jpeg','webp','gif','svg'):
        ext = 'png'
    path = os.path.join(OUT, f'{slug}.{ext}')
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        d = urllib.request.urlopen(req, timeout=25).read()
        with open(path,'wb') as f:
            f.write(d)
        return path, len(d)
    except Exception as e:
        return None, str(e)

def find_imgs(html):
    return re.findall(r'(?:src|data-src|href|content)=["\']([^"\']+\.(?:png|jpg|jpeg|webp|gif|svg)(?:\?[^"\']*)?)["\']', html, re.I)

def find_links(html):
    return re.findall(r'href=["\']([^"\']+)["\']', html)

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'list'
    pages = {
        'neovac': 'https://www.neovac.ch/',
        'techem': 'https://www.techem.com/',
        'meine-bima': 'https://meine-bima.bundesimmobilien.de/',
        'armasuisse': 'https://www.ar.admin.ch/de/immo-portal',
        'senaatti': 'https://steerpath.com/case-study-senaatti',
    }
    if target == 'list':
        for slug, url in pages.items():
            print('=====', slug, url)
            d = fetch(url)
            if d.startswith(b'ERR:'):
                print(d.decode())
                continue
            html = d.decode('utf-8','ignore')
            print('LEN', len(html))
            imgs = find_imgs(html)
            seen = set()
            for i in imgs:
                if i in seen: continue
                seen.add(i)
                print(' ', i)
            print()
    elif target == 'page':
        url = sys.argv[2]
        d = fetch(url)
        if d.startswith(b'ERR:'):
            print(d.decode())
        else:
            html = d.decode('utf-8','ignore')
            print('LEN', len(html))
            imgs = find_imgs(html)
            for i in dict.fromkeys(imgs):
                print(i)
    elif target == 'pagetext':
        url = sys.argv[2]
        d = fetch(url)
        if d.startswith(b'ERR:'):
            print(d.decode())
        else:
            html = d.decode('utf-8','ignore')
            # Strip HTML tags
            text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.S|re.I)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.S|re.I)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text)
            print(text[:5000])
            print('---LINKS---')
            links = re.findall(r'href=["\']([^"\']+)["\']', html)
            for l in dict.fromkeys(links):
                if 'login' in l.lower() or 'portal' in l.lower() or 'app' in l.lower() or 'screenshot' in l.lower() or 'demo' in l.lower():
                    print(l)
    elif target == 'dl':
        url = sys.argv[2]; slug = sys.argv[3]
        p, n = download(url, slug)
        print(p, n)
