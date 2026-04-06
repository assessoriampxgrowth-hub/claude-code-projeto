"""
Upload de PDFs para Vercel Blob e manutenção do índice JSON
usado pelo portal do cliente.
"""
import json
import os
from datetime import datetime
import requests
import config

BLOB_API = "https://blob.vercel-storage.com"
INDEX_PATH = "reports/index.json"


def _headers(content_type: str = "application/json") -> dict:
    return {
        "Authorization": f"Bearer {config.BLOB_TOKEN}",
        "Content-Type": content_type,
        "x-add-random-suffix": "0",
        "x-access": "public",
    }


def upload_pdf(filepath: str, period_end: str) -> str:
    """
    Faz upload do PDF para Vercel Blob.
    Retorna a URL pública do arquivo.
    """
    blob_path = f"reports/meta-ads-{period_end}.pdf"

    with open(filepath, "rb") as f:
        content = f.read()

    response = requests.put(
        f"{BLOB_API}/{blob_path}",
        data=content,
        headers=_headers("application/pdf"),
        timeout=60,
    )
    response.raise_for_status()
    url = response.json()["url"]
    print(f"[blob] PDF enviado: {url}")
    return url


def _load_index() -> list:
    """Carrega o índice JSON existente ou retorna lista vazia."""
    response = requests.get(
        f"{BLOB_API}/{INDEX_PATH}",
        headers={"Authorization": f"Bearer {config.BLOB_TOKEN}"},
        timeout=10,
    )
    if response.status_code == 404:
        return []
    response.raise_for_status()
    return response.json()


def update_index(pdf_url: str, data: dict) -> str:
    """
    Atualiza o index.json com o novo relatório.
    Retorna a URL pública do index.json.
    """
    index = _load_index()

    period = data["period"]
    totals = data["totals"]

    entry = {
        "id": period["end"],
        "label": f"Semana de {period['start']} a {period['end']}",
        "date": period["end"],
        "pdf_url": pdf_url,
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "spend": round(totals["spend"], 2),
            "impressions": totals["impressions"],
            "clicks": totals["clicks"],
            "ctr": round(totals["ctr"], 2),
            "conversions": totals["conversions"],
        },
    }

    # Atualiza ou insere no topo
    index = [e for e in index if e["id"] != entry["id"]]
    index.insert(0, entry)

    payload = json.dumps(index, ensure_ascii=False, indent=2).encode("utf-8")

    response = requests.put(
        f"{BLOB_API}/{INDEX_PATH}",
        data=payload,
        headers=_headers("application/json"),
        timeout=30,
    )
    response.raise_for_status()
    url = response.json()["url"]
    print(f"[blob] Índice atualizado: {url}")
    return url


def publish(filepath: str, data: dict) -> dict:
    """
    Faz upload do PDF e atualiza o índice.
    Retorna dict com as URLs.
    """
    period_end = data["period"]["end"]
    pdf_url = upload_pdf(filepath, period_end)
    index_url = update_index(pdf_url, data)
    return {"pdf_url": pdf_url, "index_url": index_url}
