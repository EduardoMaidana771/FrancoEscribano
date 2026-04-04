"""Test failed endpoints with new cookie."""
import json, time, urllib.parse, requests

BASE_URL = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea."

NEW_COOKIE = (
    "GX_CLIENT_ID=0cd6ff24-9751-486a-9fbe-09b121dc1f43; "
    "GX_SESSION_ID=3%2BwjMmKDMjPcKjnUUW%2FQ8A75Tn9pO%2BKppSrsyDmLQuc%3D; "
    "GxTZOffset=America/Montevideo; "
    'JSESSIONID="NIf0a1ykkDTyx5Ztv-P_yhaBGtJok4Kw9gBYnYNw.dgrd-prod-app2.dgr.gub.uy:tramites_frontend2"; '
    "ROUTEID=.dgrd-prod-app2.dgr.gub.uy"
)

HEADERS = {
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded",
    "GxAjaxRequest": "2",
    "Origin": "https://digital.dgr.gub.uy",
    "Referer": "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.dynformexecutedynformfrontend",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Cookie": NEW_COOKIE,
}

def make_context(elem_id, form_inst_id="515159"):
    return json.dumps({
        "DFFormInstId": form_inst_id,
        "DFFormId": 66,
        "DFFormVer": 1,
        "DFElemId": elem_id,
        "DFElemVer": 1,
        "Mode": "edit",
    })

def post_endpoint(endpoint, query_suffix="", elem_id=17, form_inst_id="515159"):
    ts = int(time.time() * 1000)
    if query_suffix:
        url = f"{BASE_URL}{endpoint}?{query_suffix}gx-no-cache={ts}"
    else:
        url = f"{BASE_URL}{endpoint}?gx-no-cache={ts}"
    body = f"context={urllib.parse.quote(make_context(elem_id, form_inst_id))}"
    resp = requests.post(url, data=body, headers=HEADERS, timeout=15)
    return resp

results = {}

# ── 1. Previously failed: combustibles ──
print("1. Testing combustibles (previously 405)...")
for endpoint, eid in [
    ("adgr_6462_dscargarcombustiblesvehiculo", 1700),
    ("adgr_6462_descargarcombustiblesvehiculo", 1700),
]:
    try:
        resp = post_endpoint(endpoint, elem_id=eid)
        print(f"   {endpoint}: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Data: {json.dumps(data, ensure_ascii=False)}")
            results[endpoint] = {"status": resp.status_code, "data": data}
        else:
            print(f"   Body: {resp.text[:200]}")
            results[endpoint] = {"status": resp.status_code, "error": resp.text[:200]}
    except Exception as e:
        print(f"   Error: {e}")
        results[endpoint] = {"error": str(e)}

# ── 2. Previously failed: tipos intervinientes ──
print("\n2. Testing tipos intervinientes (previously 500)...")
# Try with COMPRAVENTA ALTA code
for acto_code in ["RA@AUT@A56", "RA%40AUT%40A56", "COMPRAVENTA ALTA"]:
    try:
        resp = post_endpoint(
            "adgr_6462_dscargartiposintervinientesporactopers",
            f"{acto_code},,",
            elem_id=1735,
        )
        print(f"   acto_code={acto_code}: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Data: {json.dumps(data, ensure_ascii=False)}")
            results[f"tipos_intervinientes_{acto_code}"] = {"status": resp.status_code, "data": data}
        else:
            print(f"   Body: {resp.text[:200]}")
    except Exception as e:
        print(f"   Error: {e}")

# Also try alternate spelling
for acto_code in ["RA@AUT@A56"]:
    try:
        resp = post_endpoint(
            "adgr_6462_descargartiposintervinientesporactopers",
            f"{acto_code},,",
            elem_id=1735,
        )
        print(f"   descargar variant acto_code={acto_code}: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Data: {json.dumps(data, ensure_ascii=False)}")
    except Exception as e:
        print(f"   Error: {e}")

# ── 3. Quick sanity check: does new cookie work at all? ──
print("\n3. Sanity check with paises endpoint...")
try:
    resp = post_endpoint("adgr_dscargarpaises", elem_id=629)
    print(f"   paises: {resp.status_code}, items={len(resp.json()) if resp.status_code == 200 else 'N/A'}")
except Exception as e:
    print(f"   Error: {e}")

# ── 4. Try unidad cuota parte (wasn't tested before) ──
print("\n4. Testing unidad cuota parte...")
for endpoint, eid in [
    ("adgr_6462_dscargarunidadcuotaparte", 1315),
    ("adgr_6462_descargarunidadcuotaparte", 1315),
]:
    try:
        resp = post_endpoint(endpoint, elem_id=eid)
        print(f"   {endpoint}: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Data: {json.dumps(data, ensure_ascii=False)}")
            results[endpoint] = {"status": resp.status_code, "data": data}
        else:
            print(f"   Body: {resp.text[:200]}")
            results[endpoint] = {"status": resp.status_code, "error": resp.text[:200]}
    except Exception as e:
        print(f"   Error: {e}")
        results[endpoint] = {"error": str(e)}

# ── 5. Try person lookup by CI (key feature) ──
print("\n5. Testing person lookup by CI (49033949)...")
try:
    ts = int(time.time() * 1000)
    exec_query = f"dgr_personafisicaobtenernombresporci,519990!66!1!229!1!1!1!49033949!CI!end"
    url = f"{BASE_URL}adynformexecute?{urllib.parse.quote(exec_query)},gx-no-cache={ts}"
    body = f"context={urllib.parse.quote(make_context(229))}"
    resp = requests.post(url, data=body, headers=HEADERS, timeout=15)
    print(f"   person lookup: {resp.status_code}")
    if resp.status_code == 200:
        print(f"   Response: {resp.text[:200]}")
        results["person_lookup_49033949"] = {"status": resp.status_code, "data": resp.text}
    else:
        print(f"   Body: {resp.text[:200]}")
except Exception as e:
    print(f"   Error: {e}")

# ── 6. Try CI validation ──
print("\n6. Testing CI validation...")
try:
    ts = int(time.time() * 1000)
    exec_query = f"dgr_documentovalidarcedulaidentidad,519990!66!1!1457!1!1!1!49033949!end"
    url = f"{BASE_URL}adynformexecute?{urllib.parse.quote(exec_query)},gx-no-cache={ts}"
    body = f"context={urllib.parse.quote(make_context(1457))}"
    resp = requests.post(url, data=body, headers=HEADERS, timeout=15)
    print(f"   CI validation: {resp.status_code}")
    if resp.status_code == 200:
        print(f"   Response: {resp.text}")
        results["ci_validation"] = {"status": resp.status_code, "data": resp.text}
    else:
        print(f"   Body: {resp.text[:200]}")
except Exception as e:
    print(f"   Error: {e}")

# Save
with open("dgr_new_cookie_test.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"\nResults saved to dgr_new_cookie_test.json")
