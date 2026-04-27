import requests
import config


def _headers() -> dict:
    return {
        "Authorization": config.WHATSAPP_API_TOKEN,
        "Content-Type": "application/json",
    }


def send_message(phone: str, message: str) -> None:
    """Envia mensagem de texto via UazAPI."""
    url = f"{config.WHATSAPP_API_URL}/send/text"
    payload = {"phone": phone, "message": message}
    response = requests.post(url, json=payload, headers=_headers(), timeout=30)
    response.raise_for_status()


def send_pdf(phone: str, pdf_path: str, caption: str = "") -> None:
    """Envia PDF como documento via UazAPI."""
    import base64, os

    with open(pdf_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    filename = os.path.basename(pdf_path)
    url = f"{config.WHATSAPP_API_URL}/send/document"

    payload = {
        "phone": phone,
        "document": b64,
        "filename": filename,
        "caption": caption,
    }
    response = requests.post(url, json=payload, headers=_headers(), timeout=60)
    response.raise_for_status()


def broadcast(message: str, pdf_path: str = None, portal_url: str = "",
              recipients: list = None) -> dict:
    """
    Envia mensagem de texto + PDF (opcional).
    recipients: lista de números; usa config.WHATSAPP_RECIPIENTS se não informado.
    """
    results = {}
    phones = recipients if recipients is not None else config.WHATSAPP_RECIPIENTS

    full_message = message
    if portal_url:
        full_message += f"\n\n🔗 *Portal de relatórios:* {portal_url}"

    for phone in phones:
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
