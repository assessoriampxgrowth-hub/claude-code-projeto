"""
Etiquetagem de leads no WhatsApp.

Lê as conversas mais recentes do servidor local (whatsapp-server), classifica
cada uma com a API da Anthropic e aplica as etiquetas — sempre com prévia antes
de gravar.

Fluxo:
    python etiquetar_leads.py etiquetas              # confere o mapeamento
    python etiquetar_leads.py exportar --limite 40   # baixa as conversas
    python etiquetar_leads.py analisar               # classifica
    python etiquetar_leads.py aplicar                # PRÉVIA (não grava nada)
    python etiquetar_leads.py aplicar --confirmar    # grava no WhatsApp

Conversas que já têm alguma etiqueta protegida (prospect, repique, matriculados,
aulas agendadas) são ignoradas por completo: nada é adicionado nem removido.
"""

import argparse
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import requests
from tabulate import tabulate

import config
import etiquetas as tax

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analise")
ARQ_CONVERSAS = os.path.join(PASTA, "conversas.json")
ARQ_DECISOES = os.path.join(PASTA, "decisoes.json")
ARQ_LEITURA = os.path.join(PASTA, "conversas.md")
ARQ_LISTAS = os.path.join(PASTA, "listas.md")
ARQ_IGNORAR = os.path.join(PASTA, "ignorar.txt")


# ─── Servidor WhatsApp ─────────────────────────────────────────────────────

def _url(caminho: str) -> str:
    base = config.WHATSAPP_SERVER_URL.rstrip("/")
    return f"{base}{caminho}/{config.WHATSAPP_INSTANCE}"


def _get(caminho: str, **params):
    r = requests.get(_url(caminho), params=params,
                     headers={"apikey": config.WHATSAPP_SERVER_KEY}, timeout=120)
    _checar(r)
    return r.json()


def _post(caminho: str, payload: dict):
    r = requests.post(_url(caminho), json=payload,
                      headers={"apikey": config.WHATSAPP_SERVER_KEY,
                               "Content-Type": "application/json"}, timeout=60)
    _checar(r)
    return r.json()


def _checar(r):
    if r.ok:
        return
    try:
        corpo = r.json()
        detalhe = corpo.get("error", r.text)
        dica = corpo.get("hint")
    except ValueError:
        detalhe, dica = r.text, None

    msg = f"servidor respondeu {r.status_code}: {detalhe}"
    if dica:
        msg += f"\n  → {dica}"
    if r.status_code == 503:
        msg += "\n  → Inicie o servidor e conecte o WhatsApp (iniciar-whatsapp.bat)."
    raise RuntimeError(msg)


def carregar_etiquetas(nomes_listas: list = None) -> dict:
    """
    Descobre como a conta organiza as conversas.

    Conta Business: usa as etiquetas reais, e a gravação é automática ("modo
    etiqueta"). Conta comum: cai para as Listas, que não têm API — a análise
    acontece igual, mas a inclusão fica manual ("modo lista").
    """
    try:
        grupos = tax.resolver(_get("/labels"))
    except RuntimeError as e:
        print(f"⚠  Sem API de etiquetas: {str(e).splitlines()[0]}")
        grupos = None

    if grupos and grupos["alvo"]:
        return {**grupos, "modo": "etiqueta"}

    if grupos is not None:
        print("⚠  A conta não tem nenhuma etiqueta alvo.")
    print("→  Seguindo em MODO LISTA: as conversas serão analisadas e agrupadas\n"
          "   por lista, mas a inclusão precisa ser feita à mão no WhatsApp\n"
          "   (três pontos → Listas → Editar pessoa ou grupo).\n")
    return {
        "modo": "lista",
        "alvo": tax.montar_listas(nomes_listas),
        "protegidas": [],
        "desconhecidas": [],
    }


def carregar_ignorados() -> set:
    """
    No modo lista não dá para saber em que lista um contato já está, então as
    conversas a pular (matriculados, prospect, repique, aulas agendadas) vêm de
    analise/ignorar.txt — um nome ou número por linha.
    """
    if not os.path.exists(ARQ_IGNORAR):
        return set()
    with open(ARQ_IGNORAR, encoding="utf-8") as f:
        return {tax.normalizar(l) for l in f if l.strip() and not l.startswith("#")}


def _dias_parado(timestamp) -> int:
    if not timestamp:
        return None
    delta = datetime.now(timezone.utc) - datetime.fromtimestamp(timestamp, timezone.utc)
    return max(delta.days, 0)


# ─── exportar ──────────────────────────────────────────────────────────────

def cmd_exportar(args):
    grupos = carregar_etiquetas()
    _resumo_etiquetas(grupos)

    ids_protegidos = {str(e["id"]) for e in grupos["protegidas"]}
    ignorados = carregar_ignorados()
    if ignorados:
        print(f"\n{len(ignorados)} contato(s) na lista de exclusão (analise/ignorar.txt).")

    # Puxa uma folga quando --completar, para repor as conversas descartadas.
    limite_busca = args.limite * 4 if args.completar else args.limite
    brutas = _get("/chats", limit=limite_busca)[: limite_busca]
    print(f"\n[1/2] {len(brutas)} conversa(s) recebida(s) do WhatsApp.")

    selecionadas, ignoradas = [], []
    for chat in brutas:
        protegidas = [e["name"] for e in chat.get("labels", [])
                      if str(e["id"]) in ids_protegidos]
        if tax.normalizar(chat["name"]) in ignorados or chat["number"] in ignorados:
            protegidas = protegidas or ["consta em ignorar.txt"]

        if protegidas:
            ignoradas.append({**chat, "motivo": ", ".join(protegidas)})
            if not args.completar:
                # Conta na cota das N conversas, mas não é analisada.
                if len(selecionadas) + len(ignoradas) >= args.limite:
                    break
            continue

        selecionadas.append(chat)
        if len(selecionadas) >= args.limite:
            break
        if not args.completar and len(selecionadas) + len(ignoradas) >= args.limite:
            break

    print(f"[2/2] Baixando mensagens de {len(selecionadas)} conversa(s)...")
    conversas = []
    for i, chat in enumerate(selecionadas, 1):
        try:
            mensagens = _get("/chat/messages", chatId=chat["chatId"], limit=args.mensagens)
        except RuntimeError as e:
            print(f"  ! {chat['name']}: {e}")
            mensagens = []
        conversas.append({**chat, "mensagens": mensagens})
        print(f"  {i}/{len(selecionadas)}  {chat['name']} ({len(mensagens)} msgs)")

    os.makedirs(PASTA, exist_ok=True)
    _salvar(ARQ_CONVERSAS, {
        "exportado_em": datetime.now().isoformat(timespec="seconds"),
        "etiquetas": grupos,
        "conversas": conversas,
        "ignoradas": ignoradas,
    })
    _escrever_markdown(conversas, ignoradas)

    print(f"\n✓ {len(conversas)} conversa(s) exportada(s) → {ARQ_CONVERSAS}")
    print(f"  Versão legível → {ARQ_LEITURA}")
    if ignoradas:
        print(f"  {len(ignoradas)} ignorada(s) por etiqueta protegida:")
        for c in ignoradas:
            print(f"    · {c['name']} — {c['motivo']}")


def _escrever_markdown(conversas, ignoradas):
    partes = ["# Conversas exportadas", ""]
    for c in conversas:
        partes.append(f"## {c['name']} ({c['number']})")
        etq = ", ".join(e["name"] for e in c.get("labels", [])) or "sem etiqueta"
        partes.append(f"*Etiquetas atuais:* {etq}")
        partes.append("")
        partes.append("```")
        partes.append(tax._formatar_conversa(c, max_mensagens=60))
        partes.append("```")
        partes.append("")
    if ignoradas:
        partes.append("## Ignoradas (etiqueta protegida)")
        partes.extend(f"- {c['name']} — {c['motivo']}" for c in ignoradas)
    with open(ARQ_LEITURA, "w", encoding="utf-8") as f:
        f.write("\n".join(partes))


# ─── analisar ──────────────────────────────────────────────────────────────

def cmd_analisar(args):
    dados = _carregar(ARQ_CONVERSAS, "Rode 'exportar' antes de 'analisar'.")
    conversas = dados["conversas"]
    alvo = dados["etiquetas"]["alvo"]

    print(f"Classificando {len(conversas)} conversa(s) com {config.ANTHROPIC_MODEL}...\n")
    cliente = tax.criar_cliente()
    trava = threading.Lock()

    def trabalhar(item):
        i, conversa = item
        try:
            r = tax.classificar(conversa, alvo, _dias_parado(conversa.get("timestamp")), cliente)
        except Exception as e:
            r = {"etiqueta": tax.SEM_ETIQUETA, "confianca": 0.0,
                 "justificativa": f"erro na classificação: {e}"}
        with trava:
            print(f"  {i}/{len(conversas)}  {conversa['name']:<28.28} → {r['etiqueta']}")
        return {
            "chatId": conversa["chatId"],
            "name": conversa["name"],
            "number": conversa["number"],
            "etiquetas_atuais": [e["name"] for e in conversa.get("labels", [])],
            **r,
        }

    with ThreadPoolExecutor(max_workers=args.paralelo) as pool:
        decisoes = list(pool.map(trabalhar, enumerate(conversas, 1)))

    _salvar(ARQ_DECISOES, {
        "analisado_em": datetime.now().isoformat(timespec="seconds"),
        "modelo": config.ANTHROPIC_MODEL,
        "etiquetas": dados["etiquetas"],
        "decisoes": decisoes,
    })

    print(f"\n✓ Decisões salvas → {ARQ_DECISOES}")
    print("  Revise o arquivo (dá pra editar à mão) e rode: python etiquetar_leads.py aplicar")


# ─── aplicar ───────────────────────────────────────────────────────────────

def cmd_aplicar(args):
    dados = _carregar(ARQ_DECISOES, "Rode 'analisar' antes de 'aplicar'.")

    if dados["etiquetas"].get("modo") == "lista":
        return _saida_modo_lista(dados, args)

    alvo_por_nome = {tax.normalizar(e["name"]): e for e in dados["etiquetas"]["alvo"]}
    ids_alvo = {str(e["id"]) for e in dados["etiquetas"]["alvo"]}

    planos, pulos = [], []
    for d in dados["decisoes"]:
        if d["etiqueta"] == tax.SEM_ETIQUETA:
            pulos.append((d, "classificador não decidiu"))
            continue
        if d["confianca"] < args.confianca_minima:
            pulos.append((d, f"confiança {d['confianca']:.2f} < {args.confianca_minima:.2f}"))
            continue

        nova = alvo_por_nome[tax.normalizar(d["etiqueta"])]
        atuais_alvo = [n for n in d["etiquetas_atuais"]
                       if tax.normalizar(n) in alvo_por_nome]

        if any(tax.normalizar(n) == tax.normalizar(nova["name"]) for n in atuais_alvo):
            pulos.append((d, "já está com essa etiqueta"))
            continue

        remover = [] if args.sem_remover else [
            alvo_por_nome[tax.normalizar(n)] for n in atuais_alvo
        ]
        planos.append({"decisao": d, "adicionar": nova, "remover": remover})

    _mostrar_plano(planos, pulos)

    if not planos:
        print("\nNada a aplicar.")
        return

    if not args.confirmar:
        print(f"\n⚠  PRÉVIA — nada foi gravado no WhatsApp.")
        print(f"   Para aplicar de verdade: python etiquetar_leads.py aplicar --confirmar")
        return

    print(f"\nAplicando em {len(planos)} conversa(s)...")
    ok = 0
    for p in planos:
        d = p["decisao"]
        try:
            _post("/label/handle", {
                "chatId": d["chatId"],
                "add": [p["adicionar"]["id"]],
                "remove": [e["id"] for e in p["remover"]],
            })
            ok += 1
            print(f"  ✓ {d['name']} → {p['adicionar']['name']}")
        except RuntimeError as e:
            print(f"  ✗ {d['name']}: {e}")
        time.sleep(args.intervalo)

    print(f"\n✓ {ok}/{len(planos)} conversa(s) etiquetada(s).")
    # Protegidas e desconhecidas nunca entram em `remover`, por construção:
    # `remover` só é montado a partir de ids_alvo.
    assert all(str(e["id"]) in ids_alvo for p in planos for e in p["remover"])


def _saida_modo_lista(dados, args):
    """
    Listas do WhatsApp não têm API: em vez de gravar, agrupa os contatos por
    lista, na ordem em que você vai adicioná-los no diálogo
    'Editar pessoa ou grupo'.
    """
    por_lista, indefinidos = {}, []
    for d in dados["decisoes"]:
        if d["etiqueta"] == tax.SEM_ETIQUETA or d["confianca"] < args.confianca_minima:
            motivo = ("classificador não decidiu" if d["etiqueta"] == tax.SEM_ETIQUETA
                      else f"confiança {d['confianca']:.2f}")
            indefinidos.append((d, motivo))
            continue
        por_lista.setdefault(d["etiqueta"], []).append(d)

    partes = ["# Contatos por lista", "",
              "Abra o WhatsApp → três pontos → Listas → escolha a lista →",
              "*Editar pessoa ou grupo* → adicione os contatos abaixo.", ""]

    for e in dados["etiquetas"]["alvo"]:
        contatos = por_lista.get(e["name"], [])
        cabecalho = f"## {e['name']}  ({len(contatos)})"
        print(f"\n{'─' * 62}\n  {e['name'].upper()}  —  {len(contatos)} contato(s)\n{'─' * 62}")
        partes.append(cabecalho)
        if not contatos:
            print("  (nenhum)")
            partes.extend(["", "_nenhum contato_", ""])
            continue
        for d in contatos:
            print(f"  • {d['name']:<26.26} {d['number']:<15} {d['justificativa'][:44]}")
            partes.append(f"- **{d['name']}** — `{d['number']}` — {d['justificativa']}")
        partes.append("")

    if indefinidos:
        print(f"\n{'─' * 62}\n  SEM DEFINIÇÃO  —  decida à mão\n{'─' * 62}")
        partes.append("## Sem definição — decida à mão")
        for d, motivo in indefinidos:
            print(f"  • {d['name']:<26.26} {d['number']:<15} {motivo}")
            partes.append(f"- **{d['name']}** — `{d['number']}` — {motivo}")

    _salvar_texto(ARQ_LISTAS, "\n".join(partes))
    total = sum(len(v) for v in por_lista.values())
    print(f"\n✓ {total} contato(s) distribuído(s) → {ARQ_LISTAS}")
    print("\n⚠  Listas do WhatsApp não têm API: a inclusão é manual, pelo diálogo\n"
          "   'Editar pessoa ou grupo'. Nada foi alterado na sua conta.")
    if args.confirmar:
        print("   (--confirmar não tem efeito no modo lista)")


def _mostrar_plano(planos, pulos):
    if planos:
        print("\nSERÁ APLICADO:\n")
        print(tabulate(
            [[p["decisao"]["name"][:24],
              ", ".join(e["name"] for e in p["remover"]) or "—",
              p["adicionar"]["name"],
              f"{p['decisao']['confianca']:.2f}",
              p["decisao"]["justificativa"][:52]] for p in planos],
            headers=["Contato", "Remove", "Aplica", "Conf.", "Motivo"],
            tablefmt="simple",
        ))
    if pulos:
        print("\nPULADAS:\n")
        print(tabulate(
            [[d["name"][:24], d["etiqueta"], motivo] for d, motivo in pulos],
            headers=["Contato", "Sugerido", "Motivo"],
            tablefmt="simple",
        ))


# ─── etiquetas ─────────────────────────────────────────────────────────────

def cmd_etiquetas(_args):
    _resumo_etiquetas(carregar_etiquetas())


# ─── tudo ──────────────────────────────────────────────────────────────────

def cmd_tudo(args):
    """Exporta, classifica e mostra a prévia numa tacada só."""
    print("═" * 62 + "\n  1/3  EXPORTANDO CONVERSAS\n" + "═" * 62)
    cmd_exportar(args)
    print("\n" + "═" * 62 + "\n  2/3  ANALISANDO O CONTEXTO\n" + "═" * 62)
    cmd_analisar(args)
    print("\n" + "═" * 62 + "\n  3/3  PRÉVIA DAS ETIQUETAS\n" + "═" * 62)
    cmd_aplicar(args)


def _resumo_etiquetas(grupos):
    if grupos.get("modo") == "lista":
        print(tabulate([[e["name"], "análise automática, inclusão manual"]
                        for e in grupos["alvo"]],
                       headers=["Lista", "Tratamento"], tablefmt="simple"))
        print("\nPara pular contatos já matriculados/prospect/repique, escreva o\n"
              "nome ou número de cada um em analise/ignorar.txt (um por linha).")
        return

    linhas = [[e["name"], "ALVO — pode ser aplicada"] for e in grupos["alvo"]]
    linhas += [[e["name"], "PROTEGIDA — conversa é ignorada"] for e in grupos["protegidas"]]
    linhas += [[e["name"], "não mapeada — nunca é tocada"] for e in grupos["desconhecidas"]]
    print(tabulate(linhas, headers=["Etiqueta no WhatsApp", "Tratamento"], tablefmt="simple"))

    faltando = [c for c in tax.ALVO
                if not any(tax._casa(tax.normalizar(e["name"]), c) for e in grupos["alvo"])]
    if faltando:
        print(f"\n⚠  Etiquetas da taxonomia sem correspondente na conta: {', '.join(faltando)}")


# ─── util ──────────────────────────────────────────────────────────────────

def _salvar(caminho, dados):
    _salvar_texto(caminho, json.dumps(dados, ensure_ascii=False, indent=2))


def _salvar_texto(caminho, texto):
    os.makedirs(PASTA, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(texto)


def _carregar(caminho, dica):
    if not os.path.exists(caminho):
        raise RuntimeError(f"{os.path.basename(caminho)} não encontrado. {dica}")
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def main():
    p = argparse.ArgumentParser(
        description="Etiqueta leads do WhatsApp analisando o contexto das conversas.")
    sub = p.add_subparsers(dest="comando", required=True)

    sub.add_parser("etiquetas", help="lista as etiquetas da conta e como serão tratadas"
                   ).set_defaults(func=cmd_etiquetas)

    e = sub.add_parser("exportar", help="baixa as conversas mais recentes")
    e.add_argument("--limite", type=int, default=40, help="quantas conversas (padrão: 40)")
    e.add_argument("--mensagens", type=int, default=40,
                   help="mensagens por conversa (padrão: 40)")
    e.add_argument("--completar", action="store_true",
                   help="repor as conversas protegidas para fechar o total pedido")
    e.set_defaults(func=cmd_exportar)

    a = sub.add_parser("analisar", help="classifica as conversas exportadas")
    a.add_argument("--paralelo", type=int, default=4, help="chamadas simultâneas (padrão: 4)")
    a.set_defaults(func=cmd_analisar)

    ap = sub.add_parser("aplicar", help="prévia das etiquetas; --confirmar para gravar")
    ap.add_argument("--confirmar", action="store_true", help="grava no WhatsApp de verdade")
    ap.add_argument("--confianca-minima", type=float, default=0.6,
                    help="ignora decisões abaixo desta confiança (padrão: 0.6)")
    ap.add_argument("--sem-remover", action="store_true",
                    help="só adiciona; mantém as etiquetas alvo antigas")
    ap.add_argument("--intervalo", type=float, default=1.0,
                    help="segundos entre gravações (padrão: 1.0)")
    ap.set_defaults(func=cmd_aplicar)

    t = sub.add_parser("tudo", help="exporta + analisa + mostra a prévia de uma vez")
    t.add_argument("--limite", type=int, default=40)
    t.add_argument("--mensagens", type=int, default=40)
    t.add_argument("--completar", action="store_true")
    t.add_argument("--paralelo", type=int, default=4)
    t.add_argument("--confirmar", action="store_true", help="já grava no WhatsApp no fim")
    t.add_argument("--confianca-minima", type=float, default=0.6)
    t.add_argument("--sem-remover", action="store_true")
    t.add_argument("--intervalo", type=float, default=1.0)
    t.set_defaults(func=cmd_tudo)

    args = p.parse_args()
    try:
        args.func(args)
    except (RuntimeError, requests.RequestException) as e:
        print(f"\n✗ {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
