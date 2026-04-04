"""Test with exact HAR format - DFFormInstId 516601 and DynFormKey header."""
import json, time, urllib.parse, requests

BASE_URL = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea."

NEW_COOKIE = (
    "GX_CLIENT_ID=0cd6ff24-9751-486a-9fbe-09b121dc1f43; "
    "GX_SESSION_ID=3%2BwjMmKDMjPcKjnUUW%2FQ8A75Tn9pO%2BKppSrsyDmLQuc%3D; "
    "GxTZOffset=America/Montevideo; "
    'JSESSIONID="NIf0a1ykkDTyx5Ztv-P_yhaBGtJok4Kw9gBYnYNw.dgrd-prod-app2.dgr.gub.uy:tramites_frontend2"; '
    "ROUTEID=.dgrd-prod-app2.dgr.gub.uy"
)

# Try multiple form instance IDs
FORM_INST_IDS = ["516601", "515159"]

# DynFormKey values seen in HAR for different steps
DYNFORM_KEYS = {
    "Paso-3-actos": "1420_1",
    "Paso-3-intervinientes": "1450_1",
    "Paso-4": "1450_1",
    "Paso-5": "898_1",
}

def make_headers(dynform_key=None):
    h = {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "GxAjaxRequest": "2",
        "Origin": "https://digital.dgr.gub.uy",
        "Referer": "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.dynformexecutedynformfrontend",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": NEW_COOKIE,
    }
    if dynform_key:
        h["DynFormKey"] = dynform_key
    return h

def make_context(elem_id, form_inst_id):
    return json.dumps({
        "DFFormInstId": form_inst_id,
        "DFFormId": 66,
        "DFFormVer": 1,
        "DFElemId": elem_id,
        "DFElemVer": 1,
        "Mode": "edit",
    })

print("=" * 80)
print("TEST 1: Tipos intervinientes (exact HAR format)")
print("=" * 80)

for fid in FORM_INST_IDS:
    for dk in ["1450_1", "1420_1", "897_1", None]:
        ts = int(time.time() * 1000)
        url = f"{BASE_URL}adgr_6462_dscargartiposintervinientesporactopers?RA@AUT@A56,,gx-no-cache={ts}"
        body = f"context={urllib.parse.quote(make_context(1735, fid))}"
        headers = make_headers(dk)
        try:
            resp = requests.post(url, data=body, headers=headers, timeout=15)
            status = resp.status_code
            preview = resp.text[:100] if resp.text else ""
            success = "OK" if status == 200 and not preview.startswith("<!DOCTYPE") else "FAIL"
            print(f"  FormInst={fid} DynFormKey={dk}: {status} [{success}] {preview[:80]}")
        except Exception as e:
            print(f"  FormInst={fid} DynFormKey={dk}: ERROR - {e}")

print("\n" + "=" * 80)
print("TEST 2: Combustibles (exact HAR format - look for correct call)")
print("=" * 80)

# From out_ file, the original curl had query "7,," and DynFormKey: 897_1
for fid in FORM_INST_IDS:
    for dk in ["897_1", "1420_1", None]:
        for query_prefix in ["7,,", ""]:
            ts = int(time.time() * 1000)
            if query_prefix:
                url = f"{BASE_URL}adgr_6462_dscargarcombustiblesvehiculo?{query_prefix}gx-no-cache={ts}"
            else:
                url = f"{BASE_URL}adgr_6462_dscargarcombustiblesvehiculo?gx-no-cache={ts}"
            body = f"context={urllib.parse.quote(make_context(1700, fid))}"
            headers = make_headers(dk)
            try:
                resp = requests.post(url, data=body, headers=headers, timeout=15)
                status = resp.status_code
                preview = resp.text[:100] if resp.text else ""
                success = "OK" if status == 200 and not preview.startswith("<!DOCTYPE") else "FAIL"
                print(f"  FormInst={fid} DynFormKey={dk} prefix='{query_prefix}': {status} [{success}] {preview[:80]}")
            except Exception as e:
                print(f"  FormInst={fid} DynFormKey={dk} prefix='{query_prefix}': ERROR - {e}")

print("\n" + "=" * 80)
print("TEST 3: Execute - person lookup by CI (exact HAR format)")
print("=" * 80)

# HAR: dgr_personafisicaobtenernombresporci,519990!66!1!229!1!1!1!49033949!CI!end
# DynFormKey: 1450_1, DFElemId in context: various
for fid in FORM_INST_IDS:
    for dk in ["1450_1", "1420_1"]:
        ts = int(time.time() * 1000)
        exec_q = "dgr_personafisicaobtenernombresporci,519990!66!1!229!1!1!1!49033949!CI!end"
        url = f"{BASE_URL}adynformexecute?{urllib.parse.quote(exec_q)},gx-no-cache={ts}"
        body = f"context={urllib.parse.quote(make_context(229, fid))}"
        headers = make_headers(dk)
        try:
            resp = requests.post(url, data=body, headers=headers, timeout=15)
            status = resp.status_code
            preview = resp.text[:150] if resp.text else ""
            success = "OK" if status == 200 and not preview.startswith("<!DOCTYPE") else "FAIL"
            print(f"  FormInst={fid} DynFormKey={dk}: {status} [{success}] {preview[:100]}")
        except Exception as e:
            print(f"  FormInst={fid} DynFormKey={dk}: ERROR - {e}")

print("\n" + "=" * 80)
print("TEST 4: Simple catalog with DynFormKey (sanity check)")
print("=" * 80)

for fid in FORM_INST_IDS:
    ts = int(time.time() * 1000)
    url = f"{BASE_URL}adgr_dscargarestadocivil?gx-no-cache={ts}"
    body = f"context={urllib.parse.quote(make_context(57, fid))}"
    headers = make_headers("1420_1")
    try:
        resp = requests.post(url, data=body, headers=headers, timeout=15)
        data = resp.json() if resp.status_code == 200 else None
        print(f"  FormInst={fid}: {resp.status_code} items={len(data) if data else 'N/A'}")
    except Exception as e:
        print(f"  FormInst={fid}: ERROR - {e}")
