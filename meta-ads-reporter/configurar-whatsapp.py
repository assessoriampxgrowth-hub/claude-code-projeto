"""
Script para criar a instância do WhatsApp no Evolution API
e exibir o QR Code para conexão.
Execute APÓS a Evolution API estar rodando (iniciar-evolution.bat).
"""
import time
import requests
import webbrowser

EVOLUTION_URL = "http://localhost:8080"
API_KEY = "metaads-evolution-key-2024"
INSTANCE_NAME = "meu-whatsapp"

HEADERS = {
    "apikey": API_KEY,
    "Content-Type": "application/json",
}


def criar_instancia():
    print(f"Criando instância '{INSTANCE_NAME}'...")
    response = requests.post(
        f"{EVOLUTION_URL}/instance/create",
        json={
            "instanceName": INSTANCE_NAME,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS",
        },
        headers=HEADERS,
        timeout=15,
    )
    if response.status_code in (200, 201):
        print("Instância criada com sucesso!")
        return True
    if response.status_code == 409:
        print("Instância já existe, continuando...")
        return True
    print(f"Erro ao criar instância: {response.status_code} — {response.text}")
    return False


def obter_qrcode():
    print("Obtendo QR Code...")
    for tentativa in range(10):
        response = requests.get(
            f"{EVOLUTION_URL}/instance/connect/{INSTANCE_NAME}",
            headers=HEADERS,
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            qr_base64 = data.get("base64") or data.get("qrcode", {}).get("base64", "")
            if qr_base64:
                # Salva e abre o QR Code no navegador
                html = f"""<!DOCTYPE html>
<html><head><title>QR Code WhatsApp</title></head>
<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Arial;background:#f0f2f5">
<h2 style="color:#1877F2">Escaneie com o WhatsApp</h2>
<img src="{qr_base64}" style="width:300px;height:300px;border:8px solid white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15)"/>
<p style="color:#65676B;margin-top:16px">Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
</body></html>"""
                with open("qrcode.html", "w") as f:
                    f.write(html)
                webbrowser.open("qrcode.html")
                print("QR Code aberto no navegador! Escaneie com o WhatsApp.")
                return True
        print(f"Aguardando QR Code... tentativa {tentativa + 1}/10")
        time.sleep(3)
    print("Não foi possível obter o QR Code. Tente novamente.")
    return False


def verificar_conexao():
    print("Aguardando conexão do WhatsApp (escaneie o QR Code)...")
    for i in range(30):
        response = requests.get(
            f"{EVOLUTION_URL}/instance/fetchInstances",
            headers=HEADERS,
            timeout=10,
        )
        if response.status_code == 200:
            instances = response.json()
            for inst in instances:
                if inst.get("instance", {}).get("instanceName") == INSTANCE_NAME:
                    state = inst.get("instance", {}).get("state", "")
                    if state == "open":
                        print("\n✓ WhatsApp conectado com sucesso!")
                        return True
                    print(f"  Estado atual: {state} ({i+1}/30)...")
        time.sleep(5)
    print("Tempo esgotado. Verifique se escaneou o QR Code corretamente.")
    return False


if __name__ == "__main__":
    print("=" * 50)
    print("  CONFIGURAÇÃO WHATSAPP — EVOLUTION API")
    print("=" * 50)

    try:
        requests.get(f"{EVOLUTION_URL}/", timeout=5)
    except Exception:
        print("ERRO: Evolution API não está rodando.")
        print("Execute primeiro: iniciar-evolution.bat")
        exit(1)

    if criar_instancia() and obter_qrcode():
        verificar_conexao()

    print("\nPróximo passo: preencha o .env com suas credenciais do Meta API.")
    print("Depois teste com: python main.py run")
