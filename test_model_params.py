import json
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.adgr_6462_dscargarmodelosvehiculo"
REFERER = "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.dynformexecutedynformfrontend?6ad31bfb-b163-4717-9652-50117f874938,50,225178,1737227"
COOKIE = (
    'GX_CLIENT_ID=0cd6ff24-9751-486a-9fbe-09b121dc1f43; '
    'GX_SESSION_ID=3%2BwjMmKDMjPcKjnUUW%2FQ8A75Tn9pO%2BKppSrsyDmLQuc%3D; '
    'ROUTEID=.dgrd-prod-app2.dgr.gub.uy; '
    'JSESSIONID="0iVIpFLJfAxg8j6VcCRS88-OoSkXxpmGO2G6zOyd.dgrd-prod-app2.dgr.gub.uy:tramites_frontend2"; '
    'GxTZOffset=America/Montevideo'
)

body = {
    "context": json.dumps({"DFFormInstId": "515159", "DFFormId": 66, "DFFormVer": 1, "DFElemId": 1686, "DFElemVer": 1, "Mode": "edit"}, separators=(",", ":")),
    "152_1": "[]",
    "471_1": "[]",
}

params = [
    ("marca", "5"),
    ("marca", "12"),
    ("idMarca", "5"),
    ("idMarca", "12"),
    ("Marca", "5"),
    ("value", "5"),
    ("value", "12"),
]


def call(k, v):
    ts = int(time.time() * 1000)
    url = f"{BASE}?7,,gx-no-cache={ts}&{k}={v}"
    req = Request(
        url,
        data=urlencode(body).encode(),
        method="POST",
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
    raw = urlopen(req, timeout=30).read().decode("utf-8", errors="replace")
    arr = json.loads(raw)
    first = arr[0]["Value"] if arr else ""
    return len(arr), first


for k, v in params:
    try:
        n, f = call(k, v)
        print(k, v, n, f)
    except Exception as e:
        print(k, v, "ERR", e)
