#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
Meta Ads Reporter — Multi-Cliente
Uso:
  python main.py run                    → roda para TODOS os clientes
  python main.py run --client cliente-01 → roda para um cliente específico
  python main.py schedule               → inicia o agendador semanal
  python main.py list                   → lista clientes cadastrados
"""
import sys
import tempfile
import argparse
import config


def cmd_run(client_id: str = None):
    config.validate()
    import meta_api, report_generator, pdf_generator, blob_upload, whatsapp, client_manager

    if client_id:
        client = client_manager.get_client(client_id)
        if not client:
            print(f"Cliente '{client_id}' não encontrado no clients.json.")
            sys.exit(1)
        clients = [client]
    else:
        clients = client_manager.load_clients()

    print(f"[main] Processando {len(clients)} cliente(s)...\n")
    clients_summary = []

    for client in clients:
        name = client["name"]
        print(f"{'='*55}")
        print(f"  Cliente: {name}")
        print(f"{'='*55}")

        print(f"[main] Buscando dados do Meta Ads...")
        data = meta_api.get_insights(
            days=config.REPORT_DAYS,
            ad_account_id=client["ad_account_id"],
        )

        message = report_generator.build_whatsapp_message(data, client_name=name)
        print("\nPRÉVIA DA MENSAGEM:")
        print(message)

        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = pdf_generator.generate(data, output_dir=tmp, client_name=name)

            answer = input(f"\nPublicar e enviar para {name}? (s/N): ").strip().lower()
            if answer != "s":
                print("Pulado.\n")
                continue

            print("[main] Publicando na nuvem...")
            urls = blob_upload.publish(pdf_path, data, client)

            portal_url = f"{config.CLIENT_PORTAL_URL}/cliente/{client['id']}"
            print("[main] Enviando WhatsApp...")
            whatsapp.broadcast(
                message=message,
                pdf_path=pdf_path,
                portal_url=portal_url,
                recipients=client["whatsapp_recipients"],
            )
            clients_summary.append({"id": client["id"], "name": name})

        print(f"✓ {name} concluído.\n")

    if clients_summary:
        blob_upload.update_clients_registry(clients_summary)


def cmd_schedule():
    import scheduler
    scheduler.start()


def cmd_list():
    import client_manager
    clients = client_manager.load_clients(active_only=False)
    print(f"\n{'ID':<20} {'Nome':<30} {'Conta':<20} {'Ativo'}")
    print("-" * 75)
    for c in clients:
        status = "✓" if c.get("active", True) else "✗"
        print(f"{c['id']:<20} {c['name']:<30} {c['ad_account_id']:<20} {status}")
    print(f"\nTotal: {len(clients)} cliente(s)\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Meta Ads Reporter")
    subparsers = parser.add_subparsers(dest="command")

    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--client", help="ID do cliente (opcional)")

    subparsers.add_parser("schedule")
    subparsers.add_parser("list")

    args = parser.parse_args()

    if args.command == "run":
        cmd_run(client_id=getattr(args, "client", None))
    elif args.command == "schedule":
        cmd_schedule()
    elif args.command == "list":
        cmd_list()
    else:
        print(__doc__)
        sys.exit(1)
