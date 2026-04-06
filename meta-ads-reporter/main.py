#!/usr/bin/env python3
"""
Meta Ads Reporter
Uso:
  python main.py run       → executa o relatório agora (teste)
  python main.py schedule  → inicia o agendador semanal
"""
import sys
import os
import tempfile
import config


def cmd_run():
    config.validate()
    import meta_api, report_generator, pdf_generator, blob_upload, whatsapp

    print("[main] Buscando dados do Meta Ads...")
    data = meta_api.get_insights(days=config.REPORT_DAYS)

    print("[main] Gerando mensagem...")
    message = report_generator.build_whatsapp_message(data)

    print("[main] Gerando PDF...")
    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = pdf_generator.generate(data, output_dir=tmp)

        print("\n" + "=" * 55)
        print("PRÉVIA DA MENSAGEM WHATSAPP:")
        print("=" * 55)
        print(message)
        print("=" * 55 + "\n")
        print(f"PDF gerado em: {pdf_path}")

        answer = input("\nPublicar na nuvem e enviar via WhatsApp? (s/N): ").strip().lower()
        if answer != "s":
            print("[main] Operação cancelada.")
            return

        print("[main] Publicando na nuvem...")
        urls = blob_upload.publish(pdf_path, data)
        print(f"[main] PDF disponível em: {urls['pdf_url']}")

        print("[main] Enviando WhatsApp...")
        results = whatsapp.broadcast(
            message=message,
            pdf_path=pdf_path,
            portal_url=config.CLIENT_PORTAL_URL,
        )

    for phone, status in results.items():
        print(f"  {phone}: {status}")


def cmd_schedule():
    import scheduler
    scheduler.start()


COMMANDS = {"run": cmd_run, "schedule": cmd_schedule}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        sys.exit(1)
    COMMANDS[sys.argv[1]]()
