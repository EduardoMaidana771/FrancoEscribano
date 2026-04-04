"""Extract exact request details for failing endpoints from HAR files."""
import json, urllib.parse

hars = [
    (r"C:\Users\manue\Downloads\Franco\Paso-3\digital.dgr.gub.uy.har", "Paso-3"),
    (r"C:\Users\manue\Downloads\Franco\Paso-4\digital.dgr.gub.uy.har", "Paso-4"),
    (r"C:\Users\manue\Downloads\Franco\Paso-5\digital.dgr.gub.uy.har", "Paso-5"),
]

targets = ["combustible", "tiposintervinientes", "unidadcuota", "adynformexecute", "personafisica", "documentovalidar"]

for har_path, paso in hars:
    with open(har_path, "r", encoding="utf-8") as f:
        har = json.load(f)
    
    for entry in har["log"]["entries"]:
        url = entry["request"]["url"]
        url_lower = url.lower()
        
        matched = any(t in url_lower for t in targets)
        if not matched:
            continue
        
        req = entry["request"]
        resp = entry["response"]
        
        # Extract endpoint name
        path = url.split("?")[0].split(".")[-1] if "." in url.split("?")[0] else url.split("?")[0].split("/")[-1]
        
        print(f"\n{'='*80}")
        print(f"[{paso}] {path}")
        print(f"{'='*80}")
        print(f"Method: {req['method']}")
        print(f"URL: {url[:200]}")
        print(f"Status: {resp['status']}")
        
        # Headers
        print("\nKey Headers:")
        for h in req.get("headers", []):
            if h["name"].lower() in ["dynformkey", "gxajaxrequest", "content-type", "cookie"]:
                val = h["value"]
                if h["name"].lower() == "cookie":
                    val = val[:80] + "..."
                print(f"  {h['name']}: {val}")
        
        # Query string
        qs = url.split("?")[1] if "?" in url else ""
        print(f"\nQuery string: {urllib.parse.unquote(qs)[:300]}")
        
        # Post body
        post_data = req.get("postData", {})
        if post_data:
            text = post_data.get("text", "")
            if text:
                decoded = urllib.parse.unquote(text)
                print(f"\nPost body (decoded, first 500):\n  {decoded[:500]}")
            params = post_data.get("params", [])
            if params:
                print(f"\nPost params:")
                for p in params:
                    val = urllib.parse.unquote(p.get("value", ""))
                    print(f"  {p['name']}: {val[:200]}")
        
        # Response
        resp_body = resp.get("content", {}).get("text", "")
        if resp_body:
            print(f"\nResponse ({len(resp_body)} chars): {resp_body[:300]}")
        print()
