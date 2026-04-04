import argparse
import json
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qs, urlparse


INTERESTING_TERMS = (
    "dgr_frontend/servlet/",
    "dynform",
    "persona",
    "persona",
    "personafisica",
    "personajuridica",
    "integrante",
    "titular",
    "adquirente",
    "enajenante",
    "compareciente",
    "beneficiario",
    "dscargar",
    "descargar",
    "onsave",
    "onaction",
    "next",
    "previous",
)


def load_har(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_headers(headers: list[dict]) -> dict[str, str]:
    result: dict[str, str] = {}
    for header in headers:
        name = header.get("name", "")
        value = header.get("value", "")
        if name:
            result[name.lower()] = value
    return result


def parse_post_data(entry: dict) -> dict:
    post_data = entry.get("request", {}).get("postData", {})
    text = post_data.get("text", "")
    if not text:
        return {}
    try:
        parsed = parse_qs(text, keep_blank_values=True)
    except Exception:
        return {"_raw": text}
    flattened: dict[str, str] = {}
    for key, values in parsed.items():
        flattened[key] = values[0] if values else ""
    return flattened


def is_interesting(url: str, post_fields: dict[str, str]) -> bool:
    haystack = " ".join([url, json.dumps(post_fields, ensure_ascii=False)]).lower()
    return any(term in haystack for term in INTERESTING_TERMS)


def summarize_entry(entry: dict) -> dict:
    request = entry.get("request", {})
    response = entry.get("response", {})
    url = request.get("url", "")
    method = request.get("method", "")
    parsed_url = urlparse(url)
    path = parsed_url.path
    query = parse_qs(parsed_url.query, keep_blank_values=True)
    post_fields = parse_post_data(entry)
    headers = normalize_headers(request.get("headers", []))

    return {
        "startedDateTime": entry.get("startedDateTime", ""),
        "method": method,
        "url": url,
        "path": path,
        "query": {k: v[0] if v else "" for k, v in query.items()},
        "status": response.get("status"),
        "mimeType": response.get("content", {}).get("mimeType", ""),
        "cookies": headers.get("cookie", ""),
        "dynformkey": headers.get("dynformkey", ""),
        "gxajaxrequest": headers.get("gxajaxrequest", ""),
        "referer": headers.get("referer", ""),
        "origin": headers.get("origin", ""),
        "postFields": post_fields,
    }


def build_report(entries: list[dict]) -> dict:
    summarized = [summarize_entry(entry) for entry in entries]
    interesting = [entry for entry in summarized if is_interesting(entry["url"], entry["postFields"])]
    path_counter = Counter(entry["path"] for entry in interesting)
    endpoint_counter = Counter(entry["url"].split("?", 1)[0] for entry in interesting)

    return {
        "totalEntries": len(summarized),
        "interestingEntries": len(interesting),
        "topPaths": [{"path": path, "count": count} for path, count in path_counter.most_common(20)],
        "topEndpoints": [
            {"endpoint": endpoint, "count": count} for endpoint, count in endpoint_counter.most_common(20)
        ],
        "entries": interesting,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Analiza un HAR exportado desde Chrome y extrae requests relevantes para DGR.")
    parser.add_argument("har_file", help="Ruta al archivo .har exportado desde Chrome DevTools")
    parser.add_argument(
        "--out",
        default="dgr_har_analysis.json",
        help="Ruta del JSON de salida con el analisis",
    )
    args = parser.parse_args()

    har_path = Path(args.har_file)
    out_path = Path(args.out)

    har_data = load_har(har_path)
    entries = har_data.get("log", {}).get("entries", [])
    report = build_report(entries)
    out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"HAR analizado: {har_path}")
    print(f"Entradas totales: {report['totalEntries']}")
    print(f"Entradas relevantes: {report['interestingEntries']}")
    print(f"Salida: {out_path}")


if __name__ == "__main__":
    main()