import json
from pathlib import Path

src = Path("dgr_catalogos_completos.json")
data = json.loads(src.read_text(encoding="utf-8"))

models_by_brand = data.get("models_by_brand", {})
model_sets = {
    tuple((m.get("Id", ""), m.get("Value", "")) for m in (v.get("models") or []))
    for v in models_by_brand.values()
}

warnings = []
if len(model_sets) <= 1 and models_by_brand:
    warnings.append(
        "La API de modelos respondió el mismo set para todas las marcas en esta sesión; "
        "para obtener variación real por marca hay que capturar la request exacta que dispara el cambio de marca en vivo."
    )

result = {
    "meta": data.get("meta", {}),
    "marcas": data.get("catalogs", {}).get("marcas", []),
    "tipos": data.get("catalogs", {}).get("tipos", []),
    "tipos_combustible": data.get("catalogs", {}).get("combustibles", []),
    "naturaleza_juridica": data.get("catalogs", {}).get("naturaleza_juridica", []),
    "cuota_parte_padron": data.get("catalogs", {}).get("cuota_parte", []),
    "modelos_por_marca": models_by_brand,
    "sources": {
        "marcas": data.get("catalogs", {}).get("marcas__source"),
        "tipos": data.get("catalogs", {}).get("tipos__source"),
        "tipos_combustible": data.get("catalogs", {}).get("combustibles__source"),
        "naturaleza_juridica": data.get("catalogs", {}).get("naturaleza_juridica__source"),
    },
    "warnings": warnings,
    "errors": data.get("errors", []),
}

Path("dgr_datos_completos.json").write_text(
    json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
)

summary = {
    "marcas": len(result["marcas"]),
    "tipos": len(result["tipos"]),
    "tipos_combustible": len(result["tipos_combustible"]),
    "naturaleza_juridica": len(result["naturaleza_juridica"]),
    "cuota_parte_padron": len(result["cuota_parte_padron"]),
    "modelos_por_marca_registros": len(result["modelos_por_marca"]),
    "model_sets_unicos": len(model_sets),
    "output": "dgr_datos_completos.json",
}

Path("dgr_datos_resumen_final.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
)

print(json.dumps(summary, ensure_ascii=False, indent=2))
