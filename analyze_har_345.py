"""
Deep analysis of HAR Paso 3-4-5: extract all unique DGR endpoints,
classify them, and test catalog endpoints with existing cookie.
"""
import json, os, re, urllib.parse, time
from collections import defaultdict

HAR_DIR = r"C:\Users\manue\Downloads\Franco"
STEPS = ["Paso-3", "Paso-4", "Paso-5"]
BASE = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea."

# ── 1. Parse all entries from all 3 HARs ──────────────────────────────────────
all_api = []
for step in STEPS:
    har_path = os.path.join(HAR_DIR, step, "digital.dgr.gub.uy.har")
    with open(har_path, "r", encoding="utf-8") as f:
        har = json.load(f)
    for entry in har["log"]["entries"]:
        req = entry["request"]
        resp = entry["response"]
        url = req["url"]
        if not url.startswith(BASE):
            continue
        # Skip static / non-API
        if any(url.endswith(ext) for ext in [".js",".css",".png",".jpg",".gif",".svg",".ico",".woff",".woff2",".ttf",".map"]):
            continue

        method = req["method"]
        status = resp["status"]
        mime = resp.get("content",{}).get("mimeType","")
        post_text = req.get("postData",{}).get("text","") if req.get("postData") else ""
        resp_text = resp.get("content",{}).get("text","") or ""

        # Extract endpoint name from URL
        after_base = url[len(BASE):]
        endpoint_name = after_base.split("?")[0]

        # Extract query params (contains function name for adynformexecute)
        query = after_base.split("?",1)[1] if "?" in after_base else ""

        # For adynformexecute, extract the function name
        func_name = ""
        if endpoint_name == "adynformexecute":
            # function name is before the first comma in query
            func_name = query.split(",")[0] if query else ""

        # Extract cookies from request headers
        cookies_str = ""
        for h in req.get("headers", []):
            if h["name"].lower() == "cookie":
                cookies_str = h["value"]
                break

        # Extract context from POST body
        context = {}
        if post_text:
            try:
                decoded = urllib.parse.unquote(post_text)
                ctx_match = re.search(r'context=(\{[^}]+\})', decoded)
                if ctx_match:
                    context = json.loads(ctx_match.group(1))
            except:
                pass

        all_api.append({
            "step": step,
            "method": method,
            "url": url,
            "endpoint_name": endpoint_name,
            "func_name": func_name,
            "query": query,
            "status": status,
            "mime": mime,
            "post_text": post_text[:1000],
            "context": context,
            "resp_text": resp_text[:2000],
            "resp_size": len(resp_text),
            "cookies": cookies_str[:500],
        })

print(f"Total API entries parsed: {len(all_api)}\n")

# ── 2. Unique endpoints by name (catalog vs workflow vs execute) ───────────────
catalogs = {}     # Direct endpoints that return dropdown/catalog data
workflows = {}    # Form manipulation endpoints
executes = {}     # adynformexecute sub-functions
other = {}

for e in all_api:
    name = e["endpoint_name"]
    fn = e["func_name"]

    if name == "adynformexecute" and fn:
        key = fn
        if key not in executes or e["resp_size"] > executes[key]["resp_size"]:
            executes[key] = e
    elif name.startswith("adgr_") or name.startswith("adgr_6462_"):
        # These are catalog/data endpoints
        short = name.split("?")[0]
        if short not in catalogs or e["resp_size"] > catalogs[short]["resp_size"]:
            catalogs[short] = e
    elif name in ("adynformdsgetgridforminstancehomo", "aguardardfforminststructhttp",
                   "dynformexecutedynformfrontend", "aobtenerdfforminststructhttp"):
        if name not in workflows or e["resp_size"] > workflows[name]["resp_size"]:
            workflows[name] = e
    else:
        if name not in other or e["resp_size"] > other[name]["resp_size"]:
            other[name] = e

# ── 3. Print classified endpoints ──────────────────────────────────────────────

print("=" * 90)
print("  CATALOG / DROPDOWN ENDPOINTS (can be called to populate form selects)")
print("=" * 90)
for name, e in sorted(catalogs.items()):
    resp_preview = e["resp_text"][:200].replace("\n"," ")
    print(f"\n  {name}")
    print(f"    Step: {e['step']} | Status: {e['status']} | Size: {e['resp_size']}")
    print(f"    Query: {e['query'][:120]}")
    print(f"    Context: {json.dumps(e['context'])}")
    print(f"    Response: {resp_preview}")

print(f"\n\n{'='*90}")
print("  EXECUTE SUB-FUNCTIONS (business logic via adynformexecute)")
print("=" * 90)
for name, e in sorted(executes.items()):
    resp_preview = e["resp_text"][:200].replace("\n"," ")
    print(f"\n  {name}")
    print(f"    Step: {e['step']} | Status: {e['status']} | Size: {e['resp_size']}")
    print(f"    Full query: {e['query'][:200]}")
    print(f"    Response: {resp_preview}")

print(f"\n\n{'='*90}")
print("  WORKFLOW / FORM MANIPULATION ENDPOINTS")
print("=" * 90)
for name, e in sorted(workflows.items()):
    print(f"\n  {name}")
    print(f"    Step: {e['step']} | Status: {e['status']} | Size: {e['resp_size']}")

# ── 4. Compare with already-captured endpoints ────────────────────────────────
print(f"\n\n{'='*90}")
print("  COMPARISON: NEW vs ALREADY CAPTURED")
print("=" * 90)

already_captured = {
    "adgr_6462_dscargarmarcasvehiculo",
    "adgr_6462_dscargartiposvehiculo",
    "adgr_6462_dscargarnaturalezajuridica",
    "adgr_6462_dscargarcombustiblesvehiculo",
    "adgr_6462_dscargarmodelosvehiculo",
    "adgr_6462_dscargarunidadcuotaparte",
    "adgr_6462_descargarmarcasvehiculo",
    "adgr_6462_descargartiposvehiculo",
    "adgr_6462_descargarnaturalezajuridica",
    "adgr_6462_descargarcombustiblesvehiculo",
    "adgr_6462_descargarunidadcuotaparte",
}

new_catalogs = set(catalogs.keys()) - already_captured
new_executes = set(executes.keys())

print(f"\n  Already captured: {len(already_captured)} endpoints")
print(f"  New catalog endpoints: {len(new_catalogs)}")
for n in sorted(new_catalogs):
    print(f"    + {n}")
print(f"\n  New execute sub-functions: {len(new_executes)}")
for n in sorted(new_executes):
    print(f"    + {n}")

# ── 5. Extract cookie from HAR for testing ─────────────────────────────────────
# Find the most recent cookie string
cookie_str = ""
for e in all_api:
    if e["cookies"]:
        cookie_str = e["cookies"]
        break

print(f"\n\n{'='*90}")
print("  COOKIE FROM HAR (Paso-3/4/5)")
print("=" * 90)
if cookie_str:
    print(f"  {cookie_str[:300]}...")
else:
    print("  No cookie found in HAR entries")

# Also get old cookie from existing files
old_cookie = ""
dgr_req_path = os.path.join(os.path.dirname(__file__), "dgr_request.cmd")
if os.path.exists(dgr_req_path):
    with open(dgr_req_path, "r") as f:
        content = f.read()
    cookie_match = re.search(r'Cookie:\s*([^\r\n"]+)', content)
    if cookie_match:
        old_cookie = cookie_match.group(1).strip()
        print(f"\n  OLD cookie from dgr_request.cmd:")
        print(f"  {old_cookie[:300]}...")

# ── 6. Save detailed analysis ──────────────────────────────────────────────────
analysis = {
    "catalog_endpoints": {name: {
        "step": e["step"],
        "status": e["status"],
        "query": e["query"],
        "context": e["context"],
        "resp_size": e["resp_size"],
        "response_preview": e["resp_text"][:500],
    } for name, e in catalogs.items()},
    "execute_functions": {name: {
        "step": e["step"],
        "status": e["status"],
        "full_query": e["query"][:500],
        "resp_size": e["resp_size"],
        "response_preview": e["resp_text"][:500],
    } for name, e in executes.items()},
    "workflow_endpoints": {name: {
        "step": e["step"],
        "status": e["status"],
        "resp_size": e["resp_size"],
    } for name, e in workflows.items()},
    "new_catalog_endpoints": sorted(list(new_catalogs)),
    "new_execute_functions": sorted(list(new_executes)),
    "har_cookie": cookie_str,
    "old_cookie": old_cookie,
    "form_instance_id_har": "516601",
    "form_instance_id_old": "515159",
}

out_path = os.path.join(os.path.dirname(__file__), "har_345_analysis.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(analysis, f, indent=2, ensure_ascii=False)

print(f"\n\nSaved analysis to {out_path}")
