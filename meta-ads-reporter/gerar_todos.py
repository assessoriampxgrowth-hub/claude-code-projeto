# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os, json, tempfile
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

import meta_api, report_generator, pdf_generator, blob_upload, client_manager

clients = client_manager.load_clients()
print(f"Processando {len(clients)} clientes...\n")

ok, vazios, erros = [], [], []
clients_summary = []

for c in clients:
    name = c["name"]
    try:
        data = meta_api.get_insights(days=30, ad_account_id=c["ad_account_id"])
        t = data["totals"]

        if t["spend"] == 0 and t["impressions"] == 0:
            print(f"  [vazio]  {name}")
            vazios.append(name)
            continue

        with tempfile.TemporaryDirectory() as tmp:
            pdf_path = pdf_generator.generate(data, output_dir=tmp, client_name=name)
            urls = blob_upload.publish(pdf_path, data, c)

        print(f"  [ok]     {name} — R$ {t['spend']:.2f} — {urls['pdf_url']}")
        ok.append(name)
        clients_summary.append({"id": c["id"], "name": name})

    except Exception as e:
        print(f"  [erro]   {name}: {e}")
        erros.append(name)

# Atualiza registry do portal
if clients_summary:
    blob_upload.update_clients_registry(clients_summary)
    print(f"\nPortal atualizado com {len(clients_summary)} cliente(s).")

print(f"\n{'='*50}")
print(f"Concluido: {len(ok)} publicados | {len(vazios)} sem dados | {len(erros)} erros")
