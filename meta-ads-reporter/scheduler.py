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


def run_report():
    print("[scheduler] Iniciando geração do relatório...")
    try:
        # 1. Buscar dados
        data = meta_api.get_insights(days=config.REPORT_DAYS)

        # 2. Gerar mensagem WhatsApp
        message = report_generator.build_whatsapp_message(data)

        # 3. Gerar PDF
        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = pdf_generator.generate(data, output_dir=tmp)

            # 4. Publicar na nuvem (Blob + índice)
            urls = blob_upload.publish(pdf_path, data)

            # 5. Enviar WhatsApp com PDF e link do portal
            results = whatsapp.broadcast(
                message=message,
                pdf_path=pdf_path,
                portal_url=config.CLIENT_PORTAL_URL,
            )

        ok = sum(1 for v in results.values() if v == "ok")
        print(f"[scheduler] Concluído — {ok}/{len(results)} destinatários.")
        print(f"[scheduler] Portal: {config.CLIENT_PORTAL_URL}")

    except Exception as e:
        print(f"[scheduler] ERRO: {e}")
        raise


def start():
    config.validate()

    scheduler = BlockingScheduler(timezone="America/Sao_Paulo")

    trigger = CronTrigger(
        day_of_week=config.SCHEDULE_DAY,
        hour=config.SCHEDULE_HOUR,
        minute=config.SCHEDULE_MINUTE,
        timezone="America/Sao_Paulo",
    )

    scheduler.add_job(run_report, trigger=trigger, id="weekly_report")

    day_names = {
        "monday": "segunda-feira", "tuesday": "terça-feira",
        "wednesday": "quarta-feira", "thursday": "quinta-feira",
        "friday": "sexta-feira", "saturday": "sábado", "sunday": "domingo",
    }
    day_pt = day_names.get(config.SCHEDULE_DAY, config.SCHEDULE_DAY)
    print(f"[scheduler] Agendado: toda {day_pt} às {config.SCHEDULE_HOUR:02d}:{config.SCHEDULE_MINUTE:02d}")
    print("[scheduler] Pressione Ctrl+C para parar.")
    scheduler.start()
