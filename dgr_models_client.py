#!/usr/bin/env python3
"""Cliente local para consultar modelos por marca en DGR.

Uso rapido:
1) Copiar .env.example a .env y completar valores desde DevTools.
2) Ejecutar: python dgr_models_client.py --brand-id 5
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote_plus, unquote_plus
from urllib.request import Request, urlopen


def load_dotenv(path: str = ".env") -> None:
    env_path = Path(path)
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]

        os.environ.setdefault(key, value)


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Falta variable de entorno requerida: {name}")
    return value


def parse_471_payload(raw_value: str) -> Any:
    text = raw_value.strip()

    # Puede venir URL-encoded (copiado de payload) o JSON crudo.
    decoded = unquote_plus(text)
    try:
        return json.loads(decoded)
    except json.JSONDecodeError:
        return json.loads(text)


def update_brand(payload_471: Any, brand_id: str, brand_label: str | None) -> None:
    if not isinstance(payload_471, list) or not payload_471:
        raise ValueError("471_1 invalido: se esperaba una lista con al menos un elemento")

    root = payload_471[0]
    values = root.get("Values")
    if not isinstance(values, list):
        raise ValueError("471_1 invalido: no existe arreglo 'Values'")

    found_brand_id = False
    found_brand_label = False

    for item in values:
        if not isinstance(item, dict):
            continue

        item_id = str(item.get("Id", ""))
        if item_id == "1683_1":
            item["Value"] = str(brand_id)
            found_brand_id = True

        if item_id == "1212_1" and brand_label is not None:
            item["Value"] = brand_label
            found_brand_label = True

        if item_id == "1686_1":
            # Limpia modelo previo para evitar arrastre visual/logico.
            item["Value"] = ""

    if not found_brand_id:
        raise ValueError("No se encontro campo Id=1683_1 (Marca*) dentro de 471_1")

    if brand_label is not None and not found_brand_label:
        print(
            "Aviso: no se encontro campo Id=1212_1 (MarcaDescripcion). Se continua igual.",
            file=sys.stderr,
        )


def build_request(
    endpoint: str,
    referer: str,
    dynformkey: str,
    cookie: str,
    context_json: str,
    payload_471: Any,
    payload_152: str,
) -> Request:
    now_ms = int(time.time() * 1000)
    sep = "&" if "?" in endpoint else "?"
    url = f"{endpoint}{sep}7,,gx-no-cache={now_ms}"

    data_map = {
        "context": context_json,
        "152_1": payload_152,
        "471_1": json.dumps(payload_471, ensure_ascii=False, separators=(",", ":")),
    }

    encoded_data = urlencode(data_map, quote_via=quote_plus).encode("utf-8")

    headers = {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://digital.dgr.gub.uy",
        "Referer": referer,
        "DynFormKey": dynformkey,
        "GxAjaxRequest": "2",
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0",
    }

    return Request(url=url, data=encoded_data, headers=headers, method="POST")


def parse_models(response_text: str) -> list[dict[str, Any]]:
    parsed = json.loads(response_text)
    if not isinstance(parsed, list):
        raise ValueError("Respuesta inesperada: se esperaba una lista JSON")
    return parsed


def main() -> int:
    parser = argparse.ArgumentParser(description="Consulta modelos de vehiculo por marca en DGR")
    parser.add_argument("--brand-id", required=True, help="Id de marca (ejemplo: 5)")
    parser.add_argument("--brand-label", default=None, help="Descripcion de marca (opcional)")
    parser.add_argument(
        "--save-updated-471",
        default=None,
        help="Ruta opcional para guardar el 471_1 actualizado como JSON",
    )
    parser.add_argument("--timeout", type=int, default=30, help="Timeout en segundos")
    args = parser.parse_args()

    load_dotenv()

    try:
        endpoint = os.getenv(
            "DGR_ENDPOINT",
            "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.adgr_6462_dscargarmodelosvehiculo",
        )
        referer = require_env("DGR_REFERER")
        dynformkey = require_env("DGR_DYNFORMKEY")
        cookie = require_env("DGR_COOKIE")
        context_json = require_env("DGR_CONTEXT")
        payload_152 = os.getenv("DGR_152_1", "[]")
        raw_471 = require_env("DGR_471_1")

        payload_471 = parse_471_payload(raw_471)
        update_brand(payload_471, args.brand_id, args.brand_label)

        if args.save_updated_471:
            Path(args.save_updated_471).write_text(
                json.dumps(payload_471, ensure_ascii=False, indent=2), encoding="utf-8"
            )

        req = build_request(
            endpoint=endpoint,
            referer=referer,
            dynformkey=dynformkey,
            cookie=cookie,
            context_json=context_json,
            payload_471=payload_471,
            payload_152=payload_152,
        )

        with urlopen(req, timeout=args.timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")

        models = parse_models(body)

        print(f"OK: {len(models)} modelos")
        for m in models:
            model_id = str(m.get("Id", ""))
            model_value = str(m.get("Value", ""))
            print(f"- {model_id}: {model_value}")

        return 0

    except HTTPError as ex:
        detail = ex.read().decode("utf-8", errors="replace") if ex.fp else ""
        print(f"HTTP {ex.code}: {ex.reason}", file=sys.stderr)
        if detail:
            print(detail, file=sys.stderr)
        return 2
    except URLError as ex:
        print(f"Error de red: {ex}", file=sys.stderr)
        return 3
    except Exception as ex:  # noqa: BLE001
        print(f"Error: {ex}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
