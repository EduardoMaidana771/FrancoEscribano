import json
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet"
REFERER = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.dynformexecutedynformfrontend?6ad31bfb-b163-4717-9652-50117f874938,50,225178,1737227"
COOKIE = (
    'GX_CLIENT_ID=0cd6ff24-9751-486a-9fbe-09b121dc1f43; '
    'GX_SESSION_ID=3%2BwjMmKDMjPcKjnUUW%2FQ8A75Tn9pO%2BKppSrsyDmLQuc%3D; '
    'ROUTEID=.dgrd-prod-app2.dgr.gub.uy; '
    'JSESSIONID="0iVIpFLJfAxg8j6VcCRS88-OoSkXxpmGO2G6zOyd.dgrd-prod-app2.dgr.gub.uy:tramites_frontend2"; '
    'GxTZOffset=America/Montevideo'
)

BODY = {
    "context": json.dumps({"DFFormInstId": "515159", "DFFormId": 66, "DFFormVer": 1, "DFElemId": 1686, "DFElemVer": 1, "Mode": "edit"}, separators=(",", ":")),
    "152_1": "[]",
    "471_1": "[]",
}

candidates = [
    "com.tramitesenlinea.adgr_6462_dscargarunidadcuotaparte",
    "com.tramitesenlinea.adgr_6462_dscargarunidadescuotaparte",
    "com.tramitesenlinea.adgr_6462_descargarunidadcuotaparte",
    "com.tramitesenlinea.adgr_6462_descargarunidadescuotaparte",
    "com.tramitesenlinea.adgr_6462_dscargarcuotaparte",
    "com.tramitesenlinea.adgr_6462_descargarcuotaparte",
    "com.tramitesenlinea.adgr_6462_dscargarcuotasparte",
    "com.tramitesenlinea.adgr_6462_dscargarcuotapartes",
    "com.tramitesenlinea.adgr_6462_obtenerunidadcuotaparte",
    "com.tramitesenlinea.adgr_6462_obtenercuotaparte",
    "com.tramitesenlinea.adgr_6462_cargarunidadcuotaparte",
    "com.tramitesenlinea.adgr_6462_cargarcuotaparte",
    "com.tramitesenlinea.adgr_6462_dscargarpadron",
    "com.tramitesenlinea.adgr_6462_descargarpadron",
    "com.tramitesenlinea.adgr_6462_obtenerpadron",
]


def req(endpoint: str, method: str):
    url = f"{BASE}/{endpoint}?7,,gx-no-cache={int(time.time()*1000)}"
    r = Request(
        url,
        data=(urlencode(BODY).encode() if method == "POST" else None),
        method=method,
        headers={
            "Accept": "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": "https://digital.dgr.gub.uy",
            "Referer": REFERER,
            "DynFormKey": "897_1",
            "GxAjaxRequest": "2",
            "Cookie": COOKIE,
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urlopen(r, timeout=20) as x:
        return x.read().decode("utf-8", errors="replace")


results = []
for ep in candidates:
    for method in ("POST", "GET"):
        try:
            raw = req(ep, method)
            ok_json = False
            count = -1
            try:
                j = json.loads(raw)
                if isinstance(j, list):
                    ok_json = True
                    count = len(j)
            except Exception:
                pass
            results.append({"endpoint": ep, "method": method, "ok_json": ok_json, "count": count, "sample": raw[:120]})
        except HTTPError as ex:
            txt = ex.read().decode("utf-8", errors="replace") if ex.fp else ""
            results.append({"endpoint": ep, "method": method, "http": ex.code, "sample": txt[:120]})
        except Exception as ex:
            results.append({"endpoint": ep, "method": method, "error": str(ex)})

print(json.dumps(results, ensure_ascii=False, indent=2))
