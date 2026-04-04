import json

hars = [
    r"C:\Users\manue\Downloads\Franco\Paso-3\digital.dgr.gub.uy.har",
    r"C:\Users\manue\Downloads\Franco\Paso-4\digital.dgr.gub.uy.har",
    r"C:\Users\manue\Downloads\Franco\Paso-5\digital.dgr.gub.uy.har",
]

found = []
for h in hars:
    with open(h, "r", encoding="utf-8") as f:
        har = json.load(f)
    for entry in har["log"]["entries"]:
        url = entry["request"]["url"]
        if "combustible" in url.lower():
            paso = h.split("\\")[-2]
            method = entry["request"]["method"]
            status = entry["response"]["status"]
            body = entry["response"].get("content", {}).get("text", "")
            print(f"HAR: {paso} | {method} | Status: {status}")
            print(f"URL: {url[:150]}")
            print(f"Body ({len(body)} chars): {body[:500]}")
            if body and status == 200:
                try:
                    found.append(json.loads(body))
                except:
                    pass
            print()

# Also look for existing data in workspace
import os
cat_path = os.path.join(os.path.dirname(__file__), "dgr_catalogos_completos.json")
if os.path.exists(cat_path):
    with open(cat_path, "r", encoding="utf-8") as f:
        cat = json.load(f)
    comb = cat.get("combustibles", [])
    print(f"Existing dgr_catalogos_completos.json combustibles: {len(comb)} items")
    if comb:
        print(json.dumps(comb[:10], indent=2, ensure_ascii=False))

# Also search out_* files
for fn in os.listdir(os.path.dirname(__file__)):
    if "combustible" in fn.lower() and fn.startswith("out_"):
        with open(os.path.join(os.path.dirname(__file__), fn), "r", encoding="utf-8") as f:
            content = f.read()
        print(f"\n{fn} ({len(content)} chars):")
        print(content[:1000])

if found:
    print(f"\nFound {len(found)} combustible responses in HARs")
    print(json.dumps(found[0][:10] if isinstance(found[0], list) else found[0], indent=2, ensure_ascii=False))
