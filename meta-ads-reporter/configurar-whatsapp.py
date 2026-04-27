"""
Script para verificar o status da instância UazAPI (free.uazapi.com).
Não é necessário instalar nada localmente — a instância roda na nuvem.
Execute para confirmar que o número está conectado antes de enviar relatórios.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("WHATSAPP_API_URL", "https://free.uazapi.com")
API_TOKEN = os.getenv("WHATSAPP_API_TOKEN", "")

HEADERS = {
    "Authorization": API_TOKEN,
    "Content-Type": "application/json",
}


def verificar_status():
    print("Verificando status da instância UazAPI...")
    try:
        response = requests.get(
            f"{API_URL}/instance/status",
            headers=HEADERS,
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            state = data.get("state") or data.get("status", "")
            connected = str(state).lower() in ("open", "connected")
            if connected:
                print(f"✓ WhatsApp conectado! Estado: {state}")
                return True
            else:
                print(f"✗ WhatsApp não conectado. Estado: {state}")
                print("  Acesse https://free.uazapi.com e conecte o número no painel.")
                return False
        else:
            print(f"✗ Erro ao consultar status: HTTP {response.status_code}")
            print(f"  Resposta: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"✗ Falha de conexão: {e}")
        return False


def enviar_teste(numero: str):
    print(f"\nEnviando mensagem de teste para {numero}...")
    try:
        response = requests.post(
            f"{API_URL}/send/text",
            json={"phone": numero, "message": "✅ Teste de conexão MPX Growth — WhatsApp configurado com sucesso!"},
            headers=HEADERS,
            timeout=15,
        )
        if response.ok:
            print("✓ Mensagem enviada com sucesso!")
            return True
        else:
            print(f"✗ Erro ao enviar: HTTP {response.status_code} — {response.text[:200]}")
            return False
    except Exception as e:
        print(f"✗ Falha ao enviar: {e}")
        return False


if __name__ == "__main__":
    print("=" * 50)
    print("  VERIFICAÇÃO WHATSAPP — UAZAPI")
    print("=" * 50)

    if not API_TOKEN:
        print("ERRO: WHATSAPP_API_TOKEN não configurado no .env")
        print("Adicione: WHATSAPP_API_TOKEN=seu-token-aqui")
        exit(1)

    ok = verificar_status()

    if ok:
        numero = input("\nDeseja enviar mensagem de teste? Digite o número (ex: 5564999999999) ou Enter para pular: ").strip()
        if numero:
            enviar_teste(numero)

    print("\nPróximo passo: preencha o .env com suas credenciais do Meta API.")
    print("Depois teste com: python main.py run")
