import urllib.request, urllib.parse, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'}

def search(q, n=20):
    # Try Bing
    url = 'https://www.bing.com/search?q=' + urllib.parse.quote(q)
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        d = urllib.request.urlopen(req, timeout=25).read().decode('utf-8','ignore')
    except Exception as e:
        d = ''
    results = re.findall(r'<h2><a[^>]+href="(https?://[^"]+)"', d)
    if results:
        return results[:n]
    # Fallback: DDG
    url = 'https://duckduckgo.com/html/?q=' + urllib.parse.quote(q)
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        d = urllib.request.urlopen(req, timeout=25).read().decode('utf-8','ignore')
    except Exception as e:
        return [f'ERR:{e}']
    results = re.findall(r'uddg=([^&"]+)', d)
    results = [urllib.parse.unquote(r) for r in results]
    return results[:n]

if __name__ == '__main__':
    q = ' '.join(sys.argv[1:])
    for r in search(q):
        print(r)
