import json
import os
from typing import Optional


def load_clients(active_only: bool = True) -> list[dict]:
    """Carrega todos os clientes do clients.json."""
    path = os.path.join(os.path.dirname(__file__), "clients.json")
    with open(path, encoding="utf-8") as f:
        clients = json.load(f)
    if active_only:
        clients = [c for c in clients if c.get("active", True)]
    return clients


def get_client(client_id: str) -> Optional[dict]:
    """Busca um cliente pelo ID."""
    for c in load_clients(active_only=False):
        if c["id"] == client_id:
            return c
    return None
