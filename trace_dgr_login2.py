"""Trace the DGR login chain step by step."""
import requests
from urllib.parse import urljoin

session = requests.Session()

url = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.bandejaciudadano"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

print("=== DGR Login Redirect Chain ===\n")

for i in range(15):
    try:
        resp = session.get(url, allow_redirects=False, timeout=15, headers={"User-Agent": UA})
    except Exception as e:
        print(f"Step {i+1}: ERROR connecting to {url[:100]}: {e}")
        break
    
    print(f"Step {i+1}: HTTP {resp.status_code}")
    print(f"  URL: {url}")
    
    # Cookies received
    cookie_list = [(c.name, c.value[:60]) for c in resp.cookies]
    if cookie_list:
        print(f"  New cookies: {cookie_list}")
    
    if resp.status_code in (301, 302, 303, 307, 308):
        location = resp.headers.get("Location", "")
        if not location.startswith("http"):
            location = urljoin(url, location)
        print(f"  -> Redirect: {location[:250]}")
        url = location
        print()
    else:
        # Final page
        body = resp.text
        print(f"  Content-Type: {resp.headers.get('Content-Type', '')}")
        print(f"  Body length: {len(body)} chars")
        
        # Look for auth-related things
        import re
        
        # Find forms
        forms = re.findall(r'<form[^>]*action=["\']([^"\']*)["\'][^>]*>', body, re.I)
        if forms:
            print(f"  Forms: {forms}")
        
        # Find links to auth
        auth_links = re.findall(r'href=["\']([^"\']*(?:auth|login|sso|agesic|gub)[^"\']*)["\']', body, re.I)
        if auth_links:
            print(f"  Auth links: {auth_links[:5]}")
        
        # Find iframes
        iframes = re.findall(r'<iframe[^>]*src=["\']([^"\']*)["\'][^>]*>', body, re.I)
        if iframes:
            print(f"  Iframes: {iframes}")
        
        # Find meta redirects
        meta_redirect = re.findall(r'<meta[^>]*url=([^"\'>\s]+)', body, re.I)
        if meta_redirect:
            print(f"  Meta redirect: {meta_redirect}")
        
        # Find JS redirects
        js_redirect = re.findall(r'(?:window\.location|location\.href)\s*=\s*["\']([^"\']+)["\']', body)
        if js_redirect:
            print(f"  JS redirect: {js_redirect}")
        
        # Title
        title = re.findall(r'<title[^>]*>(.*?)</title>', body, re.I | re.S)
        if title:
            print(f"  Title: {title[0].strip()[:100]}")
        
        # Show first 800 chars
        print(f"\n  Body preview:\n{body[:800]}")
        break

# Show all session cookies
print(f"\n\n=== All session cookies ===")
for c in session.cookies:
    print(f"  {c.name} = {c.value[:80]}... (domain={c.domain})")
