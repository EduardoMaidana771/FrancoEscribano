import json
import time
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


def call(brand_id: str, brand_name: str):
    url = f"{BASE}/com.tramitesenlinea.adgr_6462_dscargarmodelosvehiculo?7,,gx-no-cache={int(time.time()*1000)}"
    context = {"DFFormInstId": "515159", "DFFormId": 66, "DFFormVer": 1, "DFElemId": 1686, "DFElemVer": 1, "Mode": "edit"}
    values = [
        {"Id": "1671_1", "Name": "Antecedente", "Value": "Notiene"},
        {"Id": "978_1", "Name": "Departamento", "Value": "MALDONADO"},
        {"Id": "1683_1", "Name": "Marca*", "Value": brand_id},
        {"Id": "1212_1", "Name": "MarcaDescripción", "Value": brand_name},
        {"Id": "1684_1", "Name": "MarcaDesconcatenadoMetadata", "Value": ""},
        {"Id": "1686_1", "Name": "Modelo*", "Value": ""},
    ]
    payload = {
        "context": json.dumps(context, ensure_ascii=False, separators=(",", ":")),
        "152_1": "[]",
        "471_1": json.dumps([{"Id": 1, "Value": "", "Values": values}], ensure_ascii=False, separators=(",", ":")),
    }
    req = Request(
        url,
        data=urlencode(payload).encode(),
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
    data = json.loads(raw)
    return [(str(x.get("Id", "")), str(x.get("Value", ""))) for x in data]


if __name__ == "__main__":
    a = call("5", "ARO")
    b = call("12", "BMW")
    print("ARO", len(a), a[:5])
    print("BMW", len(b), b[:5])
    print("equal", a == b)
