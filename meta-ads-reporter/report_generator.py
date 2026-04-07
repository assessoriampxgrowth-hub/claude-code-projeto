from tabulate import tabulate


def build_whatsapp_message(data: dict, client_name: str = "") -> str:
    period = data["period"]
    totals = data["totals"]
    campaigns = data["campaigns"]

    lines = []
    header = f"📊 *RELATÓRIO META ADS*" + (f" — {client_name}" if client_name else "")
    lines.append(header)
    lines.append(f"📅 {period['start']} → {period['end']}")
    lines.append("")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("📈 *RESUMO GERAL*")
    lines.append(f"💰 Investimento: R$ {totals['spend']:.2f}")
    lines.append(f"👁️ Impressões: {totals['impressions']:,}")
    lines.append(f"🖱️ Cliques: {totals['clicks']:,}")
    lines.append(f"📊 CTR médio: {totals['ctr']:.2f}%")
    lines.append(f"💵 CPC médio: R$ {totals['cpc']:.2f}")
    lines.append(f"🎯 Conversões: {totals['conversions']:,}")
    if totals["conversions"] > 0:
        lines.append(f"📉 CPA: R$ {totals['cpa']:.2f}")
    lines.append(f"👥 Alcance: {totals['reach']:,}")
    lines.append("")

    if campaigns:
        lines.append("━━━━━━━━━━━━━━━━━━━━━━")
        lines.append("📋 *POR CAMPANHA*")
        lines.append("")
        for c in sorted(campaigns, key=lambda x: x["spend"], reverse=True):
            name = c["name"][:30] + ("…" if len(c["name"]) > 30 else "")
            lines.append(f"▸ *{name}*")
            lines.append(f"   💰 R$ {c['spend']:.2f}  |  🖱️ {c['clicks']:,} cliques  |  CTR {c['ctr']:.2f}%")
            if c["conversions"] > 0:
                lines.append(f"   🎯 {c['conversions']} conversões  |  CPA R$ {c['spend']/c['conversions']:.2f}")
            lines.append("")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("_Relatório gerado automaticamente_")

    return "\n".join(lines)
