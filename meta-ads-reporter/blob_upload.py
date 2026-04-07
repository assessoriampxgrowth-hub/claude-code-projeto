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


def upload_pdf(filepath: str, period_end: str, client_id: str = "geral") -> str:
    """
    Faz upload do PDF para Vercel Blob.
    Retorna a URL pública do arquivo.
    """
    blob_path = f"reports/{client_id}/meta-ads-{period_end}.pdf"

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


def _load_index(client_id: str = "geral") -> list:
    """Carrega o índice JSON do cliente ou retorna lista vazia."""
    index_path = f"reports/{client_id}/index.json"
    response = requests.get(
        f"{BLOB_API}/{index_path}",
        headers={"Authorization": f"Bearer {config.BLOB_TOKEN}"},
        timeout=10,
    )
    if response.status_code == 404:
        return []
    response.raise_for_status()
    return response.json()


def update_index(pdf_url: str, data: dict, client: dict) -> str:
    """
    Atualiza o index.json do cliente com o novo relatório.
    Retorna a URL pública do index.json.
    """
    client_id = client["id"]
    index = _load_index(client_id)

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

    index = [e for e in index if e["id"] != entry["id"]]
    index.insert(0, entry)

    payload = json.dumps(index, ensure_ascii=False, indent=2).encode("utf-8")
    index_path = f"reports/{client_id}/index.json"

    response = requests.put(
        f"{BLOB_API}/{index_path}",
        data=payload,
        headers=_headers("application/json"),
        timeout=30,
    )
    response.raise_for_status()
    url = response.json()["url"]
    print(f"[blob] Índice atualizado ({client_id}): {url}")
    return url


def update_clients_registry(clients_summary: list) -> str:
    """
    Mantém um registry global com a lista de clientes ativos no portal.
    Usado pelo portal para listar os clientes disponíveis.
    """
    payload = json.dumps(clients_summary, ensure_ascii=False, indent=2).encode("utf-8")
    response = requests.put(
        f"{BLOB_API}/reports/clients.json",
        data=payload,
        headers=_headers("application/json"),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["url"]


def publish(filepath: str, data: dict, client: dict) -> dict:
    """
    Faz upload do PDF e atualiza o índice do cliente.
    Retorna dict com as URLs.
    """
    period_end = data["period"]["end"]
    client_id = client["id"]
    pdf_url = upload_pdf(filepath, period_end, client_id)
    index_url = update_index(pdf_url, data, client)
    return {"pdf_url": pdf_url, "index_url": index_url}
