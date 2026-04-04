"""Trace the DGR login redirect chain to understand the auth flow."""
import requests

# Don't follow redirects automatically
session = requests.Session()
session.max_redirects = 0

url = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.bandejaciudadano"

print("=== Tracing redirect chain ===\n")

for i in range(10):
    try:
        resp = session.get(url, allow_redirects=False, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        })
        print(f"Step {i+1}: {resp.status_code}")
        print(f"  URL: {url}")
        
        # Show interesting headers
        for h in ["Location", "Set-Cookie", "WWW-Authenticate"]:
            if h in resp.headers:
                val = resp.headers[h]
                print(f"  {h}: {val[:300]}")
        
        # Show all Set-Cookie headers
        cookies = resp.headers.get("Set-Cookie", "")
        if cookies:
            print(f"  Cookies set: {cookies[:200]}")
        
        # Check for redirect
        if resp.status_code in (301, 302, 303, 307, 308):
            url = resp.headers.get("Location", "")
            if not url.startswith("http"):
                # Relative URL
                from urllib.parse import urljoin
                url = urljoin(resp.url, url)
            print(f"  -> Following redirect to: {url[:200]}")
            print()
        else:
            # Show response body snippet
            text = resp.text[:1000]
            print(f"  Body ({len(resp.text)} chars): {text[:500]}")
            break
    except requests.exceptions.TooManyRedirects:
        print(f"  Too many redirects at: {url}")
        break
    except Exception as e:
        print(f"  Error: {e}")
        break

# Also check what happens with the old cookie
print("\n\n=== Testing with cookie (checking if session alive) ===\n")
NEW_COOKIE = (
    "GX_CLIENT_ID=0cd6ff24-9751-486a-9fbe-09b121dc1f43; "
    "GX_SESSION_ID=3%2BwjMmKDMjPcKjnUUW%2FQ8A75Tn9pO%2BKppSrsyDmLQuc%3D; "
    "GxTZOffset=America/Montevideo; "
    'JSESSIONID="NIf0a1ykkDTyx5Ztv-P_yhaBGtJok4Kw9gBYnYNw.dgrd-prod-app2.dgr.gub.uy:tramites_frontend2"; '
    "ROUTEID=.dgrd-prod-app2.dgr.gub.uy"
)

resp = requests.get(
    "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.bandejaciudadano",
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": NEW_COOKIE,
    },
    allow_redirects=False,
    timeout=15,
)
print(f"Status: {resp.status_code}")
if resp.status_code in (301, 302, 303, 307, 308):
    print(f"Redirect to: {resp.headers.get('Location', '')[:300]}")
    print("-> Cookie EXPIRED (redirects to login)")
else:
    print(f"Body preview: {resp.text[:300]}")
    if "bandeja" in resp.text.lower() or "ciudadano" in resp.text.lower():
        print("-> Cookie VALID (shows dashboard)")
    else:
        print("-> Unknown state")
