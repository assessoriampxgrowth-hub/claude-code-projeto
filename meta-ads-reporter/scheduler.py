import os
import tempfile
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
import config
import meta_api
import report_generator
import pdf_generator
import blob_upload
import whatsapp
import client_manager


def run_report_for_client(client: dict):
    """Gera e envia relatório para um cliente específico."""
    name = client["name"]
    print(f"\n[scheduler] → Processando: {name}")
    try:
        data = meta_api.get_insights(
            days=config.REPORT_DAYS,
            ad_account_id=client["ad_account_id"],
        )
        message = report_generator.build_whatsapp_message(data, client_name=name)

        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = pdf_generator.generate(data, output_dir=tmp, client_name=name)
            urls = blob_upload.publish(pdf_path, data, client)

            # Link do portal específico do cliente
            portal_url = f"{config.CLIENT_PORTAL_URL}/cliente/{client['id']}"

            whatsapp.broadcast(
                message=message,
                pdf_path=pdf_path,
                portal_url=portal_url,
                recipients=client["whatsapp_recipients"],
            )

        print(f"[scheduler] ✓ {name} concluído — {urls['pdf_url']}")
        return True

    except Exception as e:
        print(f"[scheduler] ✗ Erro em {name}: {e}")
        return False


def run_all_reports():
    """Processa todos os clientes ativos."""
    clients = client_manager.load_clients()
    print(f"[scheduler] Iniciando relatórios para {len(clients)} clientes...")

    results = {"ok": 0, "erro": 0}
    clients_summary = []

    for client in clients:
        success = run_report_for_client(client)
        if success:
            results["ok"] += 1
            clients_summary.append({"id": client["id"], "name": client["name"]})
        else:
            results["erro"] += 1

    # Atualiza registry global de clientes no portal
    if clients_summary:
        try:
            blob_upload.update_clients_registry(clients_summary)
        except Exception as e:
            print(f"[scheduler] Aviso: erro ao atualizar registry: {e}")

    print(f"\n[scheduler] Concluído: {results['ok']} ok, {results['erro']} erro(s).")


def start():
    config.validate()

    scheduler = BlockingScheduler(timezone="America/Sao_Paulo")
    trigger = CronTrigger(
        day_of_week=config.SCHEDULE_DAY,
        hour=config.SCHEDULE_HOUR,
        minute=config.SCHEDULE_MINUTE,
        timezone="America/Sao_Paulo",
    )
    scheduler.add_job(run_all_reports, trigger=trigger, id="weekly_reports")

    day_names = {
        "monday": "segunda-feira", "tuesday": "terça-feira",
        "wednesday": "quarta-feira", "thursday": "quinta-feira",
        "friday": "sexta-feira", "saturday": "sábado", "sunday": "domingo",
    }
    day_pt = day_names.get(config.SCHEDULE_DAY, config.SCHEDULE_DAY)
    print(f"[scheduler] Agendado para toda {day_pt} às {config.SCHEDULE_HOUR:02d}:{config.SCHEDULE_MINUTE:02d}")
    print(f"[scheduler] {len(client_manager.load_clients())} cliente(s) cadastrado(s).")
    print("[scheduler] Pressione Ctrl+C para parar.")
    scheduler.start()
