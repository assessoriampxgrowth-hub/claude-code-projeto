import os
from dotenv import load_dotenv

load_dotenv()

# Meta API
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN")
META_AD_ACCOUNT_ID = os.getenv("META_AD_ACCOUNT_ID")

# UazAPI (WhatsApp)
WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL", "https://free.uazapi.com")
WHATSAPP_API_TOKEN = os.getenv("WHATSAPP_API_TOKEN")

# Destinatários (lista de números)
WHATSAPP_RECIPIENTS = [
    n.strip()
    for n in os.getenv("WHATSAPP_RECIPIENTS", "").split(",")
    if n.strip()
]

# Agendamento
SCHEDULE_DAY = os.getenv("SCHEDULE_DAY", "monday")
SCHEDULE_HOUR = int(os.getenv("SCHEDULE_HOUR", 8))
SCHEDULE_MINUTE = int(os.getenv("SCHEDULE_MINUTE", 0))

# Período do relatório
REPORT_DAYS = int(os.getenv("REPORT_DAYS", 7))

# Vercel Blob
BLOB_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN")

# Portal do cliente
CLIENT_PORTAL_URL = os.getenv("CLIENT_PORTAL_URL", "")


def validate():
    missing = []
    for var in [
        "META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID",
        "WHATSAPP_API_TOKEN",
        "BLOB_READ_WRITE_TOKEN",
    ]:
        if not os.getenv(var):
            missing.append(var)
    if not WHATSAPP_RECIPIENTS:
        missing.append("WHATSAPP_RECIPIENTS")
    if missing:
        raise EnvironmentError(f"Variáveis obrigatórias não configuradas: {', '.join(missing)}")
