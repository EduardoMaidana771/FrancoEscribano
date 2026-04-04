#!/usr/bin/env python3
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
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
DYNFORMKEY = "897_1"
CONTEXT = {
    "DFFormInstId": "515159",
    "DFFormId": 66,
    "DFFormVer": 1,
    "DFElemId": 1686,
    "DFElemVer": 1,
    "Mode": "edit",
}


@dataclass
class EndpointResult:
    endpoint: str
    method: str
    count: int
    items: list[dict[str, Any]]
    error: str | None = None


def headers() -> dict[str, str]:
    return {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://digital.dgr.gub.uy",
        "Referer": REFERER,
        "DynFormKey": DYNFORMKEY,
        "GxAjaxRequest": "2",
        "Cookie": COOKIE,
        "User-Agent": "Mozilla/5.0",
    }


def parse_json_list(raw: str) -> list[dict[str, Any]]:
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError("Respuesta no es una lista JSON")
    out: list[dict[str, Any]] = []
    for item in data:
        if isinstance(item, dict):
            out.append({"Id": str(item.get("Id", "")), "Value": str(item.get("Value", ""))})
    return out


def request_catalog(endpoint: str, body: dict[str, str] | None) -> EndpointResult:
    ts = int(time.time() * 1000)
    url = f"{BASE}/{endpoint}?7,,gx-no-cache={ts}"

    def do_req(method: str, send_body: bool) -> EndpointResult:
        req = Request(
            url=url,
            data=(urlencode(body).encode("utf-8") if send_body and body is not None else None),
            headers=headers(),
            method=method,
        )
        with urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        items = parse_json_list(raw)
        return EndpointResult(endpoint=endpoint, method=method, count=len(items), items=items)

    try:
        return do_req("POST", True)
    except HTTPError as ex:
        if ex.code != 405:
            detail = ex.read().decode("utf-8", errors="replace") if ex.fp else ""
            return EndpointResult(endpoint=endpoint, method="POST", count=0, items=[], error=f"HTTP {ex.code} {detail[:300]}")

    try:
        return do_req("GET", False)
    except Exception as ex:  # noqa: BLE001
        return EndpointResult(endpoint=endpoint, method="GET", count=0, items=[], error=str(ex))


def build_models_body(brand_id: str) -> dict[str, str]:
    payload_471 = [
        {
            "Id": 1,
            "Value": "",
            "Values": [
                {"Id": "1683_1", "Name": "Marca*", "Value": str(brand_id)},
                {"Id": "1686_1", "Name": "Modelo*", "Value": ""},
            ],
        }
    ]
    return {
        "context": json.dumps(CONTEXT, ensure_ascii=False, separators=(",", ":")),
        "152_1": "[]",
        "471_1": json.dumps(payload_471, ensure_ascii=False, separators=(",", ":")),
    }


def main() -> int:
    common_body = {
        "context": json.dumps(CONTEXT, ensure_ascii=False, separators=(",", ":")),
        "152_1": "[]",
        "471_1": "[]",
    }

    endpoints_to_try = {
        "marcas": [
            "com.tramitesenlinea.adgr_6462_dscargarmarcasvehiculo",
        ],
        "tipos": [
            "com.tramitesenlinea.adgr_6462_dscargartiposvehiculo",
        ],
        "naturaleza_juridica": [
            "com.tramitesenlinea.adgr_6462_dscargarnaturalezajuridica",
        ],
        "combustibles": [
            "com.tramitesenlinea.adgr_6462_dscargarcombustiblesvehiculo",
            "com.tramitesenlinea.adgr_6462_dscargarcombustiblevehiculo",
            "com.tramitesenlinea.adgr_6462_descargarcombustiblesvehiculo",
            "com.tramitesenlinea.adgr_6462_descargarcombustiblevehiculo",
        ],
        "cuota_parte": [
            "com.tramitesenlinea.adgr_6462_dscargarunidadcuotaparte",
            "com.tramitesenlinea.adgr_6462_dscargarunidadescuotaparte",
            "com.tramitesenlinea.adgr_6462_descargarunidadcuotaparte",
            "com.tramitesenlinea.adgr_6462_descargarunidadescuotaparte",
        ],
    }

    catalog: dict[str, Any] = {
        "meta": {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "base": BASE,
            "referer": REFERER,
        },
        "catalogs": {},
        "models_by_brand": {},
        "errors": [],
    }

    for key, endpoint_candidates in endpoints_to_try.items():
        selected: EndpointResult | None = None
        attempts: list[dict[str, Any]] = []

        for ep in endpoint_candidates:
            result = request_catalog(ep, common_body)
            attempts.append(
                {
                    "endpoint": result.endpoint,
                    "method": result.method,
                    "count": result.count,
                    "error": result.error,
                }
            )
            if result.error is None and result.count > 0:
                selected = result
                break

        if selected is None:
            catalog["catalogs"][key] = []
            catalog["errors"].append({"catalog": key, "attempts": attempts})
        else:
            catalog["catalogs"][key] = selected.items
            catalog["catalogs"][f"{key}__source"] = {
                "endpoint": selected.endpoint,
                "method": selected.method,
                "count": selected.count,
            }

    brands = catalog["catalogs"].get("marcas", [])
    for brand in brands:
        brand_id = str(brand.get("Id", ""))
        brand_name = str(brand.get("Value", ""))
        if not brand_id:
            continue

        body = build_models_body(brand_id)
        result = request_catalog("com.tramitesenlinea.adgr_6462_dscargarmodelosvehiculo", body)

        if result.error is None:
            catalog["models_by_brand"][brand_id] = {
                "brand": brand_name,
                "count": result.count,
                "models": result.items,
            }
        else:
            catalog["models_by_brand"][brand_id] = {
                "brand": brand_name,
                "count": 0,
                "models": [],
                "error": result.error,
            }

    out_path = Path("dgr_catalogos_completos.json")
    out_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

    summary = {
        "marcas": len(catalog["catalogs"].get("marcas", [])),
        "tipos": len(catalog["catalogs"].get("tipos", [])),
        "naturaleza_juridica": len(catalog["catalogs"].get("naturaleza_juridica", [])),
        "combustibles": len(catalog["catalogs"].get("combustibles", [])),
        "cuota_parte": len(catalog["catalogs"].get("cuota_parte", [])),
        "brands_with_models": sum(1 for v in catalog["models_by_brand"].values() if v.get("count", 0) > 0),
        "output": str(out_path),
    }
    Path("dgr_catalogos_resumen.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
