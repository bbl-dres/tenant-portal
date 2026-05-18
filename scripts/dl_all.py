import urllib.request, os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

OUT = r'c:\Users\DavidRasner\Documents\GitHub\tenant-portal\assets\images\market-screening'
os.makedirs(OUT, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
    'Referer': '',
}

# vendor slug -> (image url, referer)
DOWNLOADS = {
    # NeoVac myEnergy app screenshot (iPhone) from iTunes
    'neovac': (
        'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource114/v4/a9/39/77/a939778a-2771-42c6-7a79-fa864a952fb7/779735ed-7458-4944-9785-4495ae4b7014_Screens_DE_iPhone_1242x2208_1.png/1242x2208bb.png',
        'https://apps.apple.com/'
    ),
    # Techem customer portal start screen (from portal.techem.de)
    'techem': (
        'https://portal.techem.de/export/sites/kp_de/.content/visual/techem_portal_startseite.jpg_582709108.jpg',
        'https://portal.techem.de/cms/de/tenant/'
    ),
    # BImA - Immobilienportal preview image from BImA homepage
    'meine-bima': (
        'https://cdn0.scrvt.com/1f9e599af5d26bd9a064fd3c6c6d6d3b/b713a5af104e6d49/e4f668ec930f/v/e18545636fc3/Immobilienportal_start.png',
        'https://www.bundesimmobilien.de/'
    ),
    # armasuisse - Rollenmodell graphic for the Immo-Portal (published explainer)
    'armasuisse': (
        'https://prod-aradminch-hcms-sdweb.imgix.net/dam/de/sd-web/v0Np-3XVDNjB/Rollenmodell.jpg?auto=format',
        'https://www.ar.admin.ch/de/immo-portal'
    ),
    # Senaatti - Steerpath Smart Office app screenshot (Wayback)
    'senaatti': (
        'https://web.archive.org/web/20230607225623im_/https://images.squarespace-cdn.com/content/v1/551bf4e4e4b08245f4c0b346/1559039313162-EXFSZ03VNELAHBCS5TQO/smart-office-solution-app.png',
        'https://web.archive.org/web/20230607225623/https://www.steerpath.com/case-study-senaatti'
    ),
}

for slug, (url, referer) in DOWNLOADS.items():
    print('=====', slug)
    print('URL:', url)
    ext = url.split('?')[0].split('.')[-1].lower()
    if ext not in ('png','jpg','jpeg','webp','gif','svg'):
        ext = 'png'
    path = os.path.join(OUT, f'{slug}.{ext}')
    h = dict(HEADERS); h['Referer'] = referer
    req = urllib.request.Request(url, headers=h)
    try:
        d = urllib.request.urlopen(req, timeout=30).read()
        with open(path, 'wb') as f:
            f.write(d)
        sz = len(d)
        print(f'SAVED: {path} ({sz} bytes, {sz/1024:.1f} KB)')
    except Exception as e:
        print(f'ERR: {e}')
