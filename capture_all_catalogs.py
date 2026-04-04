"""
Capture ALL new catalog data from DGR:
- All department localities
- Combustibles (retry with different approach)
- Tipos intervinientes (retry with session-level context)
- Also re-extract HAR data for endpoints that need active session
"""
import json, os, time, urllib.parse, requests

BASE_URL = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea."

OLD_COOKIE = (
    "GX_CLIENT_ID=0cd6ff24-9751-486a-9fbe-09b121dc1f43; "
    "GX_SESSION_ID=3%2BwjMmKDMjPcKjnUUW%2FQ8A75Tn9pO%2BKppSrsyDmLQuc%3D; "
    "ROUTEID=.dgrd-prod-app2.dgr.gub.uy; "
    'JSESSIONID="0iVIpFLJfAxg8j6VcCRS88-OoSkXxpmGO2G6zOyd.dgrd-prod-app2.dgr.gub.uy:tramites_frontend2"; '
    "GxTZOffset=America/Montevideo"
)

HEADERS = {
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded",
    "GxAjaxRequest": "2",
    "Origin": "https://digital.dgr.gub.uy",
    "Referer": "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.dynformexecutedynformfrontend?6ad31bfb-b163-4717-9652-50117f874938,50,225178,1737227",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Cookie": OLD_COOKIE,
}

def make_context(elem_id):
    return json.dumps({
        "DFFormInstId": "515159",
        "DFFormId": 66,
        "DFFormVer": 1,
        "DFElemId": elem_id,
        "DFElemVer": 1,
        "Mode": "edit",
    })

def post_endpoint(endpoint, query_suffix="", elem_id=17):
    ts = int(time.time() * 1000)
    url = f"{BASE_URL}{endpoint}?{query_suffix}gx-no-cache={ts}" if query_suffix else f"{BASE_URL}{endpoint}?gx-no-cache={ts}"
    body = f"context={urllib.parse.quote(make_context(elem_id))}"
    resp = requests.post(url, data=body, headers=HEADERS, timeout=15)
    return resp

# ── 1. Get ALL localities for each department ──────────────────────────────────
print("Fetching departments...")
dept_resp = post_endpoint("adgr_dscargardepartamento", elem_id=17)
departments = dept_resp.json()
print(f"  Found {len(departments)} departments")

all_localities = {}
for dept in departments:
    dept_id = dept["Id"]
    dept_name = dept["Value"]
    if not dept_id:
        continue
    time.sleep(0.2)
    try:
        loc_resp = post_endpoint("adgr_dscargarlocalidades", f"{dept_id},,", elem_id=16)
        locs = loc_resp.json()
        all_localities[dept_id] = {
            "department": dept_name,
            "localities": [l for l in locs if l["Id"]],
        }
        print(f"  {dept_name}: {len(locs)-1} localidades")
    except Exception as e:
        print(f"  {dept_name}: ERROR - {e}")
        all_localities[dept_id] = {"department": dept_name, "localities": [], "error": str(e)}

# ── 2. Try combustibles with GET ──────────────────────────────────────────────
print("\nTrying combustibles with GET method...")
ts = int(time.time() * 1000)
try:
    resp = requests.get(
        f"{BASE_URL}adgr_6462_dscargarcombustiblesvehiculo?gx-no-cache={ts}",
        headers={**HEADERS, "Content-Type": ""},
        timeout=15,
    )
    print(f"  GET status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"  Data: {resp.text[:500]}")
        combustibles = resp.json() if resp.status_code == 200 else []
    else:
        print(f"  Response: {resp.text[:200]}")
        combustibles = []
except Exception as e:
    print(f"  Error: {e}")
    combustibles = []

# Try descargarcombustiblesvehiculo (different spelling)
print("\nTrying descargarcombustiblesvehiculo (alternate spelling)...")
try:
    resp = post_endpoint("adgr_6462_descargarcombustiblesvehiculo", elem_id=1700)
    print(f"  POST status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"  Data: {resp.text[:500]}")
        if not combustibles:
            combustibles = resp.json()
    else:
        print(f"  Response: {resp.text[:200]}")
except Exception as e:
    print(f"  Error: {e}")

# Try with DynFormKey header (from original request)
if not combustibles:
    print("\nTrying combustibles with DynFormKey header...")
    headers2 = {**HEADERS, "DynFormKey": "897_1"}
    ts = int(time.time() * 1000)
    body = f"context={urllib.parse.quote(make_context(1700))}"
    try:
        resp = requests.post(
            f"{BASE_URL}adgr_6462_dscargarcombustiblesvehiculo?gx-no-cache={ts}",
            data=body,
            headers=headers2,
            timeout=15,
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 200:
            combustibles = resp.json()
            print(f"  Data: {resp.text[:500]}")
        else:
            print(f"  Response: {resp.text[:200]}")
    except Exception as e:
        print(f"  Error: {e}")

# If still no combustibles, use the data we already have from dgr_catalogos_completos.json
if not combustibles:
    print("\nUsing combustibles from existing dgr_catalogos_completos.json...")
    cat_path = os.path.join(os.path.dirname(__file__), "dgr_catalogos_completos.json")
    if os.path.exists(cat_path):
        with open(cat_path, "r", encoding="utf-8") as f:
            cat = json.load(f)
        if "combustibles" in cat:
            combustibles = cat["combustibles"]
            print(f"  Loaded {len(combustibles)} from existing file")

# ── 3. Compile ALL catalog data ────────────────────────────────────────────────
print("\nLoading other test results...")
test_path = os.path.join(os.path.dirname(__file__), "dgr_new_endpoints_test.json")
with open(test_path, "r", encoding="utf-8") as f:
    test_results = json.load(f)

# Build comprehensive catalog
all_catalogs = {
    "metadata": {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "HAR Paso 3-4-5 + live API test",
        "cookie_status": "old cookie still works for catalog endpoints",
    },
    "paises": test_results.get("adgr_dscargarpaises", {}).get("data", []),
    "nacionalidades": test_results.get("adgr_cargarnacionalidades", {}).get("data", []),
    "estado_civil": test_results.get("adgr_dscargarestadocivil", {}).get("data", []),
    "departamentos": [d for d in departments if d["Id"]],
    "localidades_por_departamento": all_localities,
    "naturaleza_juridica": test_results.get("adgr_6462_dscargarnaturalezajuridica", {}).get("data", []),
    "actos": test_results.get("adgr_6462_dscargaractos", {}).get("data", []),
    "marcas_vehiculos": test_results.get("adgr_6462_dscargarmarcasvehiculo", {}).get("data", []),
    "tipos_vehiculos": test_results.get("adgr_6462_dscargartiposvehiculo", {}).get("data", []),
    "combustibles": combustibles,
    "tipos_intervinientes": [
        {"Id": "02", "Value": "ENAJENANTE"},
        {"Id": "11", "Value": "ADQUIRENTE"},
    ],  # From HAR data since live test failed
}

# Print summary
print(f"\n{'='*80}")
print("  COMPLETE DGR CATALOG SUMMARY")
print(f"{'='*80}")
for key, val in all_catalogs.items():
    if key == "metadata":
        continue
    if isinstance(val, list):
        print(f"  {key}: {len(val)} items")
    elif isinstance(val, dict):
        total = sum(len(v.get("localities", [])) for v in val.values())
        print(f"  {key}: {len(val)} departments, {total} total localities")

# Save
out_path = os.path.join(os.path.dirname(__file__), "dgr_all_catalogs.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(all_catalogs, f, indent=2, ensure_ascii=False)
print(f"\nSaved to {out_path}")

# ── 4. Also save full endpoint documentation ───────────────────────────────────
endpoint_docs = {
    "base_url": "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.",
    "form": {
        "DFFormId": 66,
        "DFFormVer": 1,
        "description": "Minuta de Automotores (formulario 66)",
    },
    "catalog_endpoints": {
        "adgr_dscargarpaises": {"elem_id": 629, "method": "POST", "params": "none", "returns": "list of countries with ISO codes"},
        "adgr_cargarnacionalidades": {"elem_id": 1459, "method": "POST", "params": "none", "returns": "list of nationalities with ISO codes"},
        "adgr_dscargarestadocivil": {"elem_id": 57, "method": "POST", "params": "none", "returns": "civil status options"},
        "adgr_dscargardepartamento": {"elem_id": 17, "method": "POST", "params": "none", "returns": "departments with 1-letter codes"},
        "adgr_dscargarlocalidades": {"elem_id": 16, "method": "POST", "params": "dept_code (1 letter)", "returns": "localities for department"},
        "adgr_6462_dscargarnaturalezajuridica": {"elem_id": 1736, "method": "POST", "params": "none", "returns": "naturaleza juridica tipos"},
        "adgr_6462_dscargartiposintervinientesporactopers": {"elem_id": 1735, "method": "POST", "params": "acto_code", "returns": "party types for an act"},
        "adgr_6462_dscargaractos": {"elem_id": 1728, "method": "POST", "params": "search_prefix (optional)", "returns": "list of act types"},
        "adgr_6462_dscargarmarcasvehiculo": {"elem_id": 1683, "method": "POST", "params": "none", "returns": "vehicle brands"},
        "adgr_6462_dscargartiposvehiculo": {"elem_id": 1677, "method": "POST", "params": "none", "returns": "vehicle types"},
        "adgr_6462_dscargarcombustiblesvehiculo": {"elem_id": 1700, "method": "POST", "params": "none", "returns": "fuel types", "note": "405 with POST on old session, works in active session"},
        "adgr_6462_dscargarmodelosvehiculo": {"elem_id": 1686, "method": "POST", "params": "brand_id", "returns": "vehicle models for brand"},
    },
    "execute_functions": {
        "dgr_gettramiteinstidsession": {"description": "Get tramite instance ID from session", "params": "none", "returns": "tramite_id (number)"},
        "dgr_dsobtenerdepartamentodesede": {"description": "Get department of sede", "params": "sede_code", "returns": "dept code letter"},
        "dgr_obtenerdepartamentodsc": {"description": "Get department name from code", "params": "dept_code", "returns": "department name"},
        "dgr_obtenersedenombre": {"description": "Get sede name from code", "params": "sede_code", "returns": "sede name"},
        "dgr_6462_tieneantecedentesmismopaso": {"description": "Check if padron has antecedents in same step", "params": "padron_grid_ref", "returns": "true/false"},
        "dgr_6462_padronesconcatenardatosodt": {"description": "Concatenate padron data for display", "params": "paso_label", "returns": "DEPTO / PADRON string"},
        "dgr_6462_obteneractocodigo": {"description": "Get act code from name", "params": "act_name", "returns": "act code (e.g. RA@AUT@A56)"},
        "dgr_6462_actoconintervinientes": {"description": "Check if act requires parties", "params": "act_code", "returns": "true/false"},
        "dgr_6462_controlcorrespondenestipulaciones": {"description": "Check if stipulations apply", "params": "grid_ref, act_code", "returns": "true/false"},
        "dgr_6462_controlcorrespondecartel": {"description": "Check if cartel notice applies", "params": "grid_ref, act_code", "returns": "empty or data"},
        "dgr_6462_validaractoconinteviniente": {"description": "Validate act with parties", "params": "paso_label", "returns": "true/false"},
        "dgr_validaringresoactos": {"description": "Validate act entry", "params": "count, act_name", "returns": "0 or error code"},
        "dgr_compara2elementos": {"description": "Compare 2 text elements", "params": "value, operator, value2", "returns": "true/false"},
        "dgr_compara2elementosnum": {"description": "Compare 2 numeric elements", "params": "value, operator, value2", "returns": "true/false"},
        "dgr_documentovalidarcedulaidentidad": {"description": "Validate Uruguayan CI number", "params": "ci_number", "returns": "true/false"},
        "dgr_documentovalidarrut": {"description": "Validate RUT number", "params": "rut_number", "returns": "true/false"},
        "dgr_personafisicaobtenernombresporci": {"description": "Get person names from CI", "params": "ci_number, doc_type", "returns": "NOMBRE1@NOMBRE2@APELLIDO1@APELLIDO2@NACIMIENTO@..."},
        "dgr_obtenerpaisnombre": {"description": "Get country name from code", "params": "country_code", "returns": "country name"},
        "dgr_obtenerestadocivildescripcion": {"description": "Get civil status description", "params": "status_code", "returns": "status text"},
        "dgr_obtenernaturalezajuridicadesc": {"description": "Get naturaleza juridica description", "params": "nat_code", "returns": "description"},
        "dgr_obtenerintervinientedescripcionaut": {"description": "Get party type description (auto)", "params": "type_code", "returns": "description"},
        "dgr_obtenerintervinientedescripcioninm": {"description": "Get party type description (inmueble)", "params": "type_code", "returns": "description"},
        "dgr_obteneractoenpersdsc": {"description": "Get 'en ACT_NAME' text for person", "params": "act_code", "returns": "'en COMPRAVENTA ALTA'"},
        "dgr_obtenermonedadsc": {"description": "Get currency name from code", "params": "currency_code", "returns": "currency name"},
        "dgr_obteneractodsc": {"description": "Get act name from code", "params": "act_code", "returns": "act name"},
        "dgr_textovalidarcaracteresextranios": {"description": "Validate text for special characters", "params": "text", "returns": "true/false"},
        "dgr_descomponerdatoconcatenadoconcoma": {"description": "Decompose comma-separated data", "params": "data, position", "returns": "extracted value"},
        "dgr_minutacargarpersonasprecargaconcatenados": {"description": "Build person concatenated string", "params": "person fields...", "returns": "PF@CI | CI | ... formatted string"},
        "dgr_minutacargarpersonasprecargaconcatenadosdsc": {"description": "Build person display string", "params": "doc_type, ci, nombre, apellido", "returns": "CI | NOMBRE APELLIDO"},
        "dgr_calcularsumresmul": {"description": "Calculate sum/subtract/multiply", "params": "operation, values...", "returns": "result number"},
        "dgr_dynformcount": {"description": "Count elements in dynamic form grid", "params": "grid_ref, mode", "returns": "count number"},
        "aasignardocumentodesdegam": {"description": "Assign document from GAM system", "params": "none", "returns": "document_id number"},
    },
    "workflow_endpoints": {
        "aobtenerdfforminststructhttp": {"description": "Get full form instance structure (huge JSON)", "method": "GET"},
        "aguardardfforminststructhttp": {"description": "Save form instance structure", "method": "POST"},
        "adynformdsgetgridforminstancehomo": {"description": "Get grid data for form section", "method": "POST"},
        "dynformexecutedynformfrontend": {"description": "Execute page navigation/submit (main form handler)", "method": "POST"},
        "adgr_minutacargarpersonasmismopaso": {"description": "Load persons added in current step", "method": "POST", "params": "action(J/F), grid_ref"},
        "adgr_minutacargarpersonaspasoprevioconcatenados": {"description": "Load persons from previous steps", "method": "POST"},
        "adgr_6462_cargapadronespasoprevioconcatenados": {"description": "Load padrons from previous steps", "method": "POST"},
        "adgr_6462_cargaactospasoprevioconcatenados": {"description": "Load acts from previous steps", "method": "POST"},
        "adgr_6462_precargargrillaintervinientes": {"description": "Preload parties grid for review step", "method": "POST"},
        "adgr_6462_cargaractosmismopaso": {"description": "Load acts for current step", "method": "POST"},
    },
}

docs_path = os.path.join(os.path.dirname(__file__), "dgr_endpoints_docs.json")
with open(docs_path, "w", encoding="utf-8") as f:
    json.dump(endpoint_docs, f, indent=2, ensure_ascii=False)
print(f"Saved endpoint docs to {docs_path}")
