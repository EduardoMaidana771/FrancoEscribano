"""Extract all adynformexecute function calls and responses from HAR files."""
import json, urllib.parse

hars = [
    (r"C:\Users\manue\Downloads\Franco\Paso-3\digital.dgr.gub.uy.har", "Paso-3"),
    (r"C:\Users\manue\Downloads\Franco\Paso-4\digital.dgr.gub.uy.har", "Paso-4"),
    (r"C:\Users\manue\Downloads\Franco\Paso-5\digital.dgr.gub.uy.har", "Paso-5"),
]

all_funcs = []

for har_path, paso in hars:
    with open(har_path, "r", encoding="utf-8") as f:
        har = json.load(f)
    
    for entry in har["log"]["entries"]:
        url = entry["request"]["url"]
        if "adynformexecute" not in url.lower():
            continue
        
        # Parse request body
        post_data = entry["request"].get("postData", {})
        text = post_data.get("text", "")
        params = {}
        if text:
            for pair in text.split("&"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    params[urllib.parse.unquote(k)] = urllib.parse.unquote(v)
        else:
            for p in post_data.get("params", []):
                params[p["name"]] = p.get("value", "")
        
        func_name = params.get("ExecName", "")
        exec_parms = params.get("ExecParms", "")
        
        # Parse response
        resp_status = entry["response"]["status"]
        resp_body = entry["response"].get("content", {}).get("text", "")
        
        if func_name:
            all_funcs.append({
                "paso": paso,
                "function": func_name,
                "params": exec_parms,
                "status": resp_status,
                "response": resp_body[:500] if resp_body else "",
            })

# Group by function name
from collections import defaultdict
by_func = defaultdict(list)
for f in all_funcs:
    by_func[f["function"]].append(f)

print(f"Found {len(all_funcs)} execute calls across {len(by_func)} unique functions\n")

# Print each function with example params and responses
for func_name in sorted(by_func.keys()):
    calls = by_func[func_name]
    print(f"\n{'='*70}")
    print(f"  {func_name} ({len(calls)} calls)")
    print(f"{'='*70}")
    
    # Show unique param/response combinations
    seen = set()
    for c in calls:
        key = (c["params"], c["response"][:100])
        if key not in seen:
            seen.add(key)
            print(f"  [{c['paso']}] Params: {c['params'][:150]}")
            print(f"  [{c['paso']}] Response ({c['status']}): {c['response'][:200]}")
            print()

# Save full data
output = {
    "summary": {
        "total_calls": len(all_funcs),
        "unique_functions": len(by_func),
        "functions": {k: len(v) for k, v in sorted(by_func.items())},
    },
    "calls_by_function": {
        k: [{"paso": c["paso"], "params": c["params"], "status": c["status"], "response": c["response"]} for c in v]
        for k, v in sorted(by_func.items())
    },
}

with open("dgr_execute_functions_har.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\nSaved to dgr_execute_functions_har.json")
