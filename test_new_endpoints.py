"""
Test all new DGR catalog endpoints with Franco's old cookie.
Also extract full response data from HAR entries.
"""
import json, os, time, urllib.parse, requests

BASE_URL = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea."

# Old cookie from dgr_request.cmd session
OLD_COOKIE = (
    "GX_CLIENT_ID=0cd6ff24-9751-486a-9fbe-09b121dc1f43; "
    "GX_SESSION_ID=3%2BwjMmKDMjPcKjnUUW%2FQ8A75Tn9pO%2BKppSrsyDmLQuc%3D; "
    "ROUTEID=.dgrd-prod-app2.dgr.gub.uy; "
    'JSESSIONID="0iVIpFLJfAxg8j6VcCRS88-OoSkXxpmGO2G6zOyd.dgrd-prod-app2.dgr.gub.uy:tramites_frontend2"; '
    "GxTZOffset=America/Montevideo"
)

# Old form instance
OLD_FORM_INST_ID = "515159"
# New form instance from HARs
NEW_FORM_INST_ID = "516601"

HEADERS = {
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded",
    "GxAjaxRequest": "2",
    "Origin": "https://digital.dgr.gub.uy",
    "Referer": "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.dynformexecutedynformfrontend?6ad31bfb-b163-4717-9652-50117f874938,50,225178,1737227",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Cookie": OLD_COOKIE,
}

def make_context(form_inst_id, elem_id, elem_ver=1):
    return json.dumps({
        "DFFormInstId": form_inst_id,
        "DFFormId": 66,
        "DFFormVer": 1,
        "DFElemId": elem_id,
        "DFElemVer": elem_ver,
        "Mode": "edit",
    })

# ── Endpoints to test ──────────────────────────────────────────────────────────
# These are ALL the new catalog endpoints found in HAR Paso 3-4-5.
# Format: (endpoint_name, query_suffix, DFElemId, description)
CATALOG_ENDPOINTS = [
    # Dropdown catalogs (no form-specific params needed)
    ("adgr_dscargarpaises", "", 629, "Países"),
    ("adgr_cargarnacionalidades", "", 1459, "Nacionalidades"),
    ("adgr_dscargarestadocivil", "", 57, "Estado civil"),
    ("adgr_dscargardepartamento", "", 17, "Departamentos"),
    ("adgr_dscargarlocalidades", "V,", 16, "Localidades (Montevideo)"),
    ("adgr_dscargarlocalidades", "A,", 16, "Localidades (Canelones)"),
    ("adgr_dscargarlocalidades", "B,", 16, "Localidades (Maldonado)"),
    ("adgr_6462_dscargarnaturalezajuridica", "", 1736, "Naturaleza jurídica"),
    ("adgr_6462_dscargartiposintervinientesporactopers", "RA@AUT@A56,", 1735, "Tipos intervinientes COMPRAVENTA"),
    ("adgr_6462_dscargaractos", "CO", 1728, "Actos (búsqueda CO)"),
    ("adgr_6462_dscargaractos", "", 1728, "Actos (todos)"),
    # Already captured but re-test
    ("adgr_6462_dscargarmarcasvehiculo", "", 1683, "Marcas vehículos"),
    ("adgr_6462_dscargartiposvehiculo", "", 1677, "Tipos vehículos"),
    ("adgr_6462_dscargarcombustiblesvehiculo", "", 1700, "Combustibles"),
]

results = {}

print("=" * 80)
print("  TESTING CATALOG ENDPOINTS WITH OLD COOKIE")
print("=" * 80)

for endpoint, query_suffix, elem_id, desc in CATALOG_ENDPOINTS:
    ts = int(time.time() * 1000)
    if query_suffix:
        url = f"{BASE_URL}{endpoint}?{query_suffix}gx-no-cache={ts}"
    else:
        url = f"{BASE_URL}{endpoint}?gx-no-cache={ts}"

    body = f"context={urllib.parse.quote(make_context(OLD_FORM_INST_ID, elem_id))}"

    key = f"{endpoint}({query_suffix.rstrip(',')})" if query_suffix else endpoint

    try:
        resp = requests.post(url, data=body, headers=HEADERS, timeout=15)
        status = resp.status_code
        text = resp.text
        try:
            data = resp.json()
            count = len(data) if isinstance(data, list) else 1
        except:
            data = text
            count = len(text)

        results[key] = {
            "description": desc,
            "endpoint": endpoint,
            "query_suffix": query_suffix,
            "elem_id": elem_id,
            "status": status,
            "count": count,
            "data": data if isinstance(data, list) and len(json.dumps(data)) < 50000 else text[:1000],
        }

        print(f"\n  [{status}] {desc}: {key}")
        if isinstance(data, list):
            print(f"    Items: {count}")
            if count > 0 and count <= 5:
                for item in data:
                    print(f"      {item}")
            elif count > 5:
                for item in data[:3]:
                    print(f"      {item}")
                print(f"      ... ({count - 3} more)")
        else:
            print(f"    Response: {str(data)[:200]}")

    except Exception as e:
        results[key] = {
            "description": desc,
            "endpoint": endpoint,
            "status": "error",
            "error": str(e),
        }
        print(f"\n  [ERR] {desc}: {key}")
        print(f"    Error: {e}")

    time.sleep(0.3)

# ── Save results ────────────────────────────────────────────────────────────────
out_path = os.path.join(os.path.dirname(__file__), "dgr_new_endpoints_test.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\n\n{'='*80}")
print(f"  Results saved to {out_path}")
print(f"{'='*80}")

# ── Summary ─────────────────────────────────────────────────────────────────────
ok = sum(1 for r in results.values() if r.get("status") == 200 and r.get("count", 0) > 0)
fail = sum(1 for r in results.values() if r.get("status") != 200)
empty = sum(1 for r in results.values() if r.get("status") == 200 and r.get("count", 0) == 0)

print(f"\n  OK: {ok} | Empty: {empty} | Failed: {fail} | Total: {len(results)}")
if fail > 0:
    print("\n  COOKIE EXPIRED? Failed endpoints may need a fresh session cookie.")
