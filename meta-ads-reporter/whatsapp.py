import requests
import config


def _headers() -> dict:
    return {
        "apikey": config.EVOLUTION_API_KEY,
        "Content-Type": "application/json",
    }


def send_message(phone: str, message: str) -> None:
    """Envia mensagem de texto via Evolution API."""
    url = f"{config.EVOLUTION_API_URL}/message/sendText/{config.EVOLUTION_INSTANCE}"
    payload = {"number": phone, "text": message}
    response = requests.post(url, json=payload, headers=_headers(), timeout=30)
    response.raise_for_status()


def send_pdf(phone: str, pdf_path: str, caption: str = "") -> None:
    """
    Envia PDF como documento via Evolution API.
    O arquivo é codificado em base64 e enviado como mídia.
    """
    import base64, os

    with open(pdf_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    filename = os.path.basename(pdf_path)
    url = f"{config.EVOLUTION_API_URL}/message/sendMedia/{config.EVOLUTION_INSTANCE}"

    payload = {
        "number": phone,
        "mediatype": "document",
        "mimetype": "application/pdf",
        "media": b64,
        "fileName": filename,
        "caption": caption,
    }
    response = requests.post(url, json=payload, headers=_headers(), timeout=60)
    response.raise_for_status()


def broadcast(message: str, pdf_path: str = None, portal_url: str = "") -> dict:
    """
    Envia mensagem de texto + PDF (opcional) para todos os destinatários.
    Retorna dict com status de cada número.
    """
    results = {}

    # Adiciona link do portal à mensagem se disponível
    full_message = message
    if portal_url:
        full_message += f"\n\n🔗 *Portal de relatórios:* {portal_url}"

    for phone in config.WHATSAPP_RECIPIENTS:
        try:
            send_message(phone, full_message)
            if pdf_path:
                send_pdf(phone, pdf_path, caption="📎 Relatório completo em PDF")
            results[phone] = "ok"
            print(f"[whatsapp] ✓ Enviado para {phone}")
        except requests.HTTPError as e:
            results[phone] = f"erro HTTP {e.response.status_code}"
            print(f"[whatsapp] ✗ Falha para {phone}: {e}")
        except Exception as e:
            results[phone] = f"erro: {e}"
            print(f"[whatsapp] ✗ Falha para {phone}: {e}")

    return results
