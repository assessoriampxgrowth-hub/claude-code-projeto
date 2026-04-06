import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# ─── Paleta de cores ──────────────────────────────────────────────
BLUE_DARK  = colors.HexColor("#1877F2")   # azul Meta
BLUE_LIGHT = colors.HexColor("#E7F0FD")
GRAY_BG    = colors.HexColor("#F5F6FA")
GRAY_TEXT  = colors.HexColor("#65676B")
WHITE      = colors.white
BLACK      = colors.HexColor("#1C1E21")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", parent=base["Title"],
            fontSize=22, textColor=WHITE, spaceAfter=2,
            alignment=TA_CENTER, fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"],
            fontSize=11, textColor=WHITE, alignment=TA_CENTER,
        ),
        "section": ParagraphStyle(
            "section", parent=base["Heading2"],
            fontSize=13, textColor=BLUE_DARK, spaceBefore=14, spaceAfter=6,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"],
            fontSize=10, textColor=BLACK, leading=14,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"],
            fontSize=8, textColor=GRAY_TEXT, alignment=TA_CENTER,
        ),
    }


def _header_table(period: dict, styles: dict) -> Table:
    title = Paragraph("RELATÓRIO META ADS", styles["title"])
    subtitle = Paragraph(
        f"Período: {period['start']}  →  {period['end']}",
        styles["subtitle"],
    )
    data = [[title], [subtitle]]
    t = Table(data, colWidths=[17 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE_DARK),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BLUE_DARK]),
        ("TOPPADDING",    (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ("LEFTPADDING",   (0, 0), (-1, -1), 20),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 20),
        ("ROUNDEDCORNERS", [8]),
    ]))
    return t


def _metric_card(label: str, value: str) -> Table:
    t = Table(
        [[Paragraph(f"<b>{value}</b>", ParagraphStyle(
            "val", fontSize=16, textColor=BLUE_DARK,
            alignment=TA_CENTER, fontName="Helvetica-Bold",
        ))],
         [Paragraph(label, ParagraphStyle(
             "lbl", fontSize=8, textColor=GRAY_TEXT,
             alignment=TA_CENTER,
         ))]],
        colWidths=[4 * cm],
        rowHeights=[1.1 * cm, 0.7 * cm],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GRAY_BG),
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#D8DADF")),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("ROUNDEDCORNERS", [6]),
    ]))
    return t


def _summary_grid(totals: dict) -> Table:
    def fmt_brl(v): return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    def fmt_int(v): return f"{v:,}".replace(",", ".")

    cards = [
        _metric_card("Investimento",  fmt_brl(totals["spend"])),
        _metric_card("Impressões",    fmt_int(totals["impressions"])),
        _metric_card("Cliques",       fmt_int(totals["clicks"])),
        _metric_card("CTR Médio",     f"{totals['ctr']:.2f}%"),
        _metric_card("CPC Médio",     fmt_brl(totals["cpc"])),
        _metric_card("Conversões",    fmt_int(totals["conversions"])),
        _metric_card("CPA",           fmt_brl(totals.get("cpa", 0)) if totals["conversions"] else "—"),
        _metric_card("Alcance",       fmt_int(totals["reach"])),
    ]

    # 4 cards por linha
    rows = [cards[i:i+4] for i in range(0, len(cards), 4)]
    grid = Table(rows, colWidths=[4.1 * cm] * 4, hAlign="LEFT")
    grid.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 3),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 3),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return grid


def _campaigns_table(campaigns: list) -> Table:
    def fmt_brl(v): return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    def fmt_int(v): return f"{v:,}".replace(",", ".")

    header = ["Campanha", "Investido", "Impressões", "Cliques", "CTR", "CPC", "Conv."]
    rows = [header]

    for c in sorted(campaigns, key=lambda x: x["spend"], reverse=True):
        name = c["name"][:35] + ("…" if len(c["name"]) > 35 else "")
        rows.append([
            name,
            fmt_brl(c["spend"]),
            fmt_int(c["impressions"]),
            fmt_int(c["clicks"]),
            f"{c['ctr']:.2f}%",
            fmt_brl(c["cpc"]),
            str(c["conversions"]) if c["conversions"] else "—",
        ])

    col_w = [5.5 * cm, 2.3 * cm, 2.3 * cm, 1.8 * cm, 1.5 * cm, 1.8 * cm, 1.5 * cm]
    t = Table(rows, colWidths=col_w, repeatRows=1)

    style = [
        # Cabeçalho
        ("BACKGROUND",    (0, 0), (-1, 0), BLUE_DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING",    (0, 0), (-1, 0), 8),
        # Dados
        ("FONTSIZE",      (0, 1), (-1, -1), 8.5),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, GRAY_BG]),
        ("ALIGN",         (1, 1), (-1, -1), "RIGHT"),
        ("ALIGN",         (0, 1), (0, -1),  "LEFT"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        # Borda
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#D8DADF")),
        ("LINEBELOW",     (0, 0), (-1, 0),  0.5, colors.HexColor("#D8DADF")),
    ]
    t.setStyle(TableStyle(style))
    return t


def generate(data: dict, output_dir: str = ".") -> str:
    """Gera o PDF e retorna o caminho do arquivo."""
    os.makedirs(output_dir, exist_ok=True)

    period = data["period"]
    filename = f"meta-ads-{period['end']}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title=f"Relatório Meta Ads — {period['end']}",
        author="Meta Ads Reporter",
    )

    styles = _styles()
    story = []

    # Cabeçalho
    story.append(_header_table(period, styles))
    story.append(Spacer(1, 0.5 * cm))

    # Resumo geral
    story.append(Paragraph("Resumo Geral", styles["section"]))
    story.append(_summary_grid(data["totals"]))
    story.append(Spacer(1, 0.5 * cm))

    # Tabela de campanhas
    if data["campaigns"]:
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D8DADF")))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph("Desempenho por Campanha", styles["section"]))
        story.append(_campaigns_table(data["campaigns"]))

    # Rodapé
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D8DADF")))
    story.append(Spacer(1, 0.3 * cm))
    generated_at = datetime.now().strftime("%d/%m/%Y às %H:%M")
    story.append(Paragraph(f"Gerado automaticamente em {generated_at}", styles["footer"]))

    doc.build(story)
    print(f"[pdf] Arquivo gerado: {filepath}")
    return filepath
