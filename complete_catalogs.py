"""Complete the dgr_all_catalogs.json with combustibles from existing data 
and tipos_intervinientes from HAR files."""
import json, os

ROOT = os.path.dirname(__file__)

# Load current all_catalogs
with open(os.path.join(ROOT, "dgr_all_catalogs.json"), "r", encoding="utf-8") as f:
    catalogs = json.load(f)

# 1. Add combustibles from existing data
combustibles = [
    {"Id": "E", "Value": "ELECTRICO"},
    {"Id": "G", "Value": "GAS OIL"},
    {"Id": "H", "Value": "HÍBRIDO"},
    {"Id": "N", "Value": "NAFTA"},
]
catalogs["combustibles"] = combustibles
print(f"Added {len(combustibles)} combustibles from previous session")

# 2. Search HAR files for tipos_intervinientes response
hars = [
    r"C:\Users\manue\Downloads\Franco\Paso-3\digital.dgr.gub.uy.har",
    r"C:\Users\manue\Downloads\Franco\Paso-4\digital.dgr.gub.uy.har",
    r"C:\Users\manue\Downloads\Franco\Paso-5\digital.dgr.gub.uy.har",
]

tipos_intv = []
for h in hars:
    with open(h, "r", encoding="utf-8") as f:
        har = json.load(f)
    for entry in har["log"]["entries"]:
        url = entry["request"]["url"]
        if "tiposintervinientes" in url.lower():
            paso = h.split("\\")[-2]
            status = entry["response"]["status"]
            body = entry["response"].get("content", {}).get("text", "")
            print(f"\nHAR {paso}: tiposintervinientes status={status}, body_len={len(body)}")
            if body and status == 200:
                try:
                    data = json.loads(body)
                    print(f"  Data: {json.dumps(data, ensure_ascii=False)}")
                    if isinstance(data, list) and data:
                        tipos_intv = data
                except:
                    print(f"  Body (raw): {body[:300]}")

if tipos_intv:
    catalogs["tipos_intervinientes"] = tipos_intv
    print(f"\nUpdated tipos_intervinientes from HAR: {len(tipos_intv)} items")
else:
    print("\nNo tipos_intervinientes found in HARs, keeping hardcoded values")

# 3. Also check for unidad_cuota_parte
for h in hars:
    with open(h, "r", encoding="utf-8") as f:
        har = json.load(f)
    for entry in har["log"]["entries"]:
        url = entry["request"]["url"]
        if "unidadcuotaparte" in url.lower() or "cuota" in url.lower():
            paso = h.split("\\")[-2]
            status = entry["response"]["status"]
            body = entry["response"].get("content", {}).get("text", "")
            print(f"\nHAR {paso}: cuota url={url.split('?')[0].split('.')[-1]} status={status}")
            if body and status == 200:
                try:
                    data = json.loads(body)
                    print(f"  Data: {json.dumps(data[:5] if isinstance(data, list) else data, ensure_ascii=False)}")
                except:
                    pass

# 4. Extract ALL unique execute function responses from HARs for documentation
print("\n\n=== ALL Execute Function Responses in HARs ===")
execute_responses = {}
for h in hars:
    with open(h, "r", encoding="utf-8") as f:
        har = json.load(f)
    paso = h.split("\\")[-2]
    for entry in har["log"]["entries"]:
        url = entry["request"]["url"]
        if "adynformexecute" in url.lower():
            body = entry["response"].get("content", {}).get("text", "")
            # Find function name from request body
            req_body = ""
            for p in entry["request"].get("postData", {}).get("params", []):
                if p.get("name") == "ExecName":
                    func_name = p.get("value", "")
                    break
            else:
                text = entry["request"].get("postData", {}).get("text", "")
                if "ExecName=" in text:
                    func_name = text.split("ExecName=")[1].split("&")[0]
                else:
                    func_name = "unknown"
            
            status = entry["response"]["status"]
            if func_name not in execute_responses and body and status == 200:
                execute_responses[func_name] = {
                    "paso": paso,
                    "response_preview": body[:200],
                    "status": status,
                }

for fn, info in sorted(execute_responses.items()):
    print(f"  {fn}: {info['response_preview'][:100]}...")

# Save updated catalogs
with open(os.path.join(ROOT, "dgr_all_catalogs.json"), "w", encoding="utf-8") as f:
    json.dump(catalogs, f, indent=2, ensure_ascii=False)
print(f"\nUpdated dgr_all_catalogs.json")

# Print final summary
print(f"\n{'='*70}")
print("FINAL CATALOG SUMMARY")
print(f"{'='*70}")
for key, val in catalogs.items():
    if key == "metadata":
        continue
    if isinstance(val, list):
        print(f"  {key}: {len(val)} items")
    elif isinstance(val, dict):
        if key == "localidades_por_departamento":
            total = sum(len(v.get("localities", [])) for v in val.values())
            print(f"  {key}: {len(val)} departments, {total} total localities")
        else:
            print(f"  {key}: {len(val)} keys")
