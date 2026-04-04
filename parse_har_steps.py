"""
Parse HAR files from Paso-3, Paso-4, Paso-5 to extract all DGR API endpoints.
"""
import json
import os
from collections import defaultdict

HAR_DIR = r"C:\Users\manue\Downloads\Franco"
STEPS = ["Paso-3", "Paso-4", "Paso-5"]

all_entries = []

for step in STEPS:
    har_path = os.path.join(HAR_DIR, step, "digital.dgr.gub.uy.har")
    if not os.path.exists(har_path):
        print(f"[SKIP] {har_path} not found")
        continue
    with open(har_path, "r", encoding="utf-8") as f:
        har = json.load(f)

    entries = har.get("log", {}).get("entries", [])
    print(f"\n{'='*80}")
    print(f"  {step}: {len(entries)} entries total")
    print(f"{'='*80}")

    for entry in entries:
        req = entry.get("request", {})
        resp = entry.get("response", {})
        url = req.get("url", "")
        method = req.get("method", "")
        status = resp.get("status", 0)
        mime = resp.get("content", {}).get("mimeType", "")

        # Skip static assets
        if any(url.endswith(ext) for ext in [".js", ".css", ".png", ".jpg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".map"]):
            continue
        if "fonts.googleapis" in url or "fonts.gstatic" in url:
            continue

        # Get request body if POST
        post_data = ""
        if req.get("postData"):
            post_data = req["postData"].get("text", "")[:500]

        # Get response body size and snippet
        resp_body = resp.get("content", {}).get("text", "")
        resp_size = len(resp_body) if resp_body else 0

        all_entries.append({
            "step": step,
            "method": method,
            "url": url,
            "status": status,
            "mime": mime,
            "post_data": post_data,
            "resp_size": resp_size,
            "resp_snippet": resp_body[:300] if resp_body else "",
        })

        # Print summary line
        short_url = url.replace("https://digital.dgr.gub.uy", "")
        print(f"  [{method}] {status} {short_url[:120]}")
        if post_data:
            print(f"         POST body: {post_data[:200]}")

# Now identify unique API endpoints (non-HTML, non-asset)
print(f"\n\n{'='*80}")
print("  UNIQUE API ENDPOINTS (non-page, non-asset)")
print(f"{'='*80}")

api_entries = [e for e in all_entries if
    "/api/" in e["url"] or
    "/ADGR" in e["url"] or
    "Service" in e["url"] or
    "service" in e["url"] or
    ".ashx" in e["url"] or
    ".asmx" in e["url"] or
    "json" in e["mime"].lower() or
    e["method"] == "POST"
]

seen = set()
for e in api_entries:
    key = f"{e['method']} {e['url'].split('?')[0]}"
    if key not in seen:
        seen.add(key)
        short = e["url"].replace("https://digital.dgr.gub.uy", "")
        print(f"\n  [{e['step']}] {e['method']} {short[:150]}")
        print(f"    Status: {e['status']} | MIME: {e['mime']} | Resp size: {e['resp_size']}")
        if e["post_data"]:
            print(f"    POST: {e['post_data'][:300]}")
        if e["resp_snippet"]:
            # Show first 200 chars of response
            snip = e["resp_snippet"][:200].replace("\n", " ").replace("\r", "")
            print(f"    Response: {snip}")

# Save full details to JSON for further analysis
output = []
for e in all_entries:
    output.append({
        "step": e["step"],
        "method": e["method"],
        "url": e["url"],
        "status": e["status"],
        "mime": e["mime"],
        "post_data": e["post_data"],
        "resp_size": e["resp_size"],
        "resp_snippet": e["resp_snippet"][:500],
    })

with open(os.path.join(os.path.dirname(__file__), "har_steps_345_parsed.json"), "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\n\nSaved {len(output)} entries to har_steps_345_parsed.json")
