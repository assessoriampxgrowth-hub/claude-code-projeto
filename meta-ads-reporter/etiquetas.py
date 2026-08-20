"""
Taxonomia de etiquetas de lead e classificação de conversas do WhatsApp.

Duas responsabilidades:
  1. Resolver as etiquetas que realmente existem na conta do WhatsApp contra a
     taxonomia abaixo, separando-as em ALVO (podem ser aplicadas), PROTEGIDAS
     (a conversa é ignorada por inteiro) e DESCONHECIDAS (nunca tocadas).
  2. Classificar o contexto de uma conversa em uma das etiquetas alvo, via API
     da Anthropic.
"""

import json
import re
import unicodedata

import config

# Etiquetas que fazem a conversa ser ignorada: nada é adicionado nem removido.
PROTEGIDAS = ["prospect", "repique", "matriculados", "aulas agendadas"]

# Etiquetas que podem ser aplicadas, com o critério usado na classificação.
ALVO = {
    "novo": (
        "Lead que chegou agora e ainda não foi trabalhado: primeiro contato, "
        "sem resposta do atendimento ou com no máximo uma saudação inicial."
    ),
    "em atendimento": (
        "Conversa ativa e em andamento: há troca recente dos dois lados, o lead "
        "está respondendo e a negociação está viva."
    ),
    "esfriou": (
        "O lead parou de responder ou sumiu no meio da conversa. Última "
        "mensagem ficou sem retorno dele, sem recusa explícita."
    ),
    "reativar": (
        "Conversa antiga, parada há bastante tempo, que vale uma nova tentativa "
        "de contato. Houve interesse no passado mas nada avançou."
    ),
    "objecao em preco": (
        "O lead demonstrou interesse mas travou no valor: achou caro, pediu "
        "desconto, comparou preço com concorrente ou disse que não cabe no bolso."
    ),
    "vai pensar": (
        "O lead adiou a decisão sem objeção clara de preço: disse que vai "
        "pensar, falar com o cônjuge/responsável, ver a agenda, retornar depois."
    ),
    "marcado": (
        "Ficou combinado um compromisso concreto: visita, aula experimental, "
        "reunião ou retorno com data/horário definido."
    ),
}

SEM_ETIQUETA = "NENHUMA"


def normalizar(texto: str) -> str:
    """Minúsculas, sem acento e sem pontuação, para comparar nomes de etiqueta."""
    texto = unicodedata.normalize("NFKD", texto or "")
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    texto = re.sub(r"[^a-z0-9]+", " ", texto.lower())
    return texto.strip()


def _casa(nome_normalizado: str, chave: str) -> bool:
    """Casa por igualdade ou por conter a chave como termo (ex.: 'Esfriou/Reativar')."""
    if nome_normalizado == chave:
        return True
    return re.search(rf"(^| ){re.escape(chave)}( |$)", nome_normalizado) is not None


def resolver(etiquetas_whatsapp: list) -> dict:
    """
    Classifica as etiquetas reais da conta nos três grupos.

    etiquetas_whatsapp: [{"id", "name", "hexColor"}] vindo do servidor.

    Retorna {"alvo": [...], "protegidas": [...], "desconhecidas": [...]}, onde
    cada etiqueta alvo ganha um campo "criterio" com as descrições que casaram.
    Uma etiqueta que case com PROTEGIDAS e ALVO ao mesmo tempo é tratada como
    protegida — na dúvida, não mexe.
    """
    alvo, protegidas, desconhecidas = [], [], []

    for etiqueta in etiquetas_whatsapp:
        nome = normalizar(etiqueta.get("name", ""))

        if any(_casa(nome, normalizar(p)) for p in PROTEGIDAS):
            protegidas.append(etiqueta)
            continue

        criterios = [desc for chave, desc in ALVO.items() if _casa(nome, chave)]
        if criterios:
            alvo.append({**etiqueta, "criterio": " ".join(criterios)})
        else:
            desconhecidas.append(etiqueta)

    return {"alvo": alvo, "protegidas": protegidas, "desconhecidas": desconhecidas}


# ─── Classificação via Claude ──────────────────────────────────────────────

INSTRUCOES = """Você classifica conversas de WhatsApp de uma escola de idiomas \
para organizar o funil comercial.

Leia a conversa e escolha EXATAMENTE UMA etiqueta da lista, a que melhor \
descreve o estado atual do lead. Considere quem falou por último, há quanto \
tempo, e o que ficou pendente.

Regras:
- Julgue pelo estado ATUAL da conversa, não pelo que já foi no passado.
- Se o lead levantou preço como travamento, isso tem prioridade sobre "vai pensar".
- Se ficou um compromisso com data/horário, isso tem prioridade sobre o resto.
- Se a conversa não der base para decidir, responda com a etiqueta "{sem_etiqueta}".
- Responda APENAS com um objeto JSON, sem texto ao redor, no formato:
  {{"etiqueta": "<nome exato da etiqueta ou {sem_etiqueta}>", "confianca": <0.0 a 1.0>, "justificativa": "<uma frase curta em português>"}}
"""


def _formatar_conversa(conversa: dict, max_mensagens: int = 40) -> str:
    """Monta o transcript legível de uma conversa para o classificador."""
    from datetime import datetime

    mensagens = conversa.get("mensagens", [])[-max_mensagens:]
    linhas = []
    for m in mensagens:
        quem = "ATENDIMENTO" if m.get("fromMe") else "LEAD"
        try:
            data = datetime.fromtimestamp(m.get("timestamp", 0)).strftime("%d/%m/%Y %H:%M")
        except (ValueError, OSError, TypeError):
            data = "sem data"

        corpo = (m.get("body") or "").strip()
        if not corpo:
            corpo = f"[{m.get('type') or 'mídia'}]"
        if len(corpo) > 600:
            corpo = corpo[:600] + "…"
        linhas.append(f"[{data}] {quem}: {corpo}")

    if not linhas:
        linhas.append("(conversa sem mensagens legíveis)")
    return "\n".join(linhas)


def _construir_prompt(conversa: dict, etiquetas_alvo: list, dias_parado) -> str:
    opcoes = "\n".join(
        f'- "{e["name"]}": {e.get("criterio", "")}'.rstrip() for e in etiquetas_alvo
    )
    parado = (
        f"{dias_parado} dia(s) desde a última mensagem"
        if dias_parado is not None
        else "tempo de parada desconhecido"
    )
    return (
        f"ETIQUETAS DISPONÍVEIS:\n{opcoes}\n\n"
        f"CONTATO: {conversa.get('name', 'sem nome')}\n"
        f"SITUAÇÃO: {parado}\n\n"
        f"CONVERSA (mais antiga primeiro):\n{_formatar_conversa(conversa)}"
    )


def _extrair_json(texto: str) -> dict:
    """Aceita a resposta pura ou embrulhada em cerca de código."""
    texto = texto.strip()
    texto = re.sub(r"^```(?:json)?|```$", "", texto, flags=re.MULTILINE).strip()
    inicio, fim = texto.find("{"), texto.rfind("}")
    if inicio == -1 or fim == -1:
        raise ValueError(f"resposta sem JSON: {texto[:200]}")
    return json.loads(texto[inicio : fim + 1])


def classificar(conversa: dict, etiquetas_alvo: list, dias_parado=None, cliente=None) -> dict:
    """
    Classifica uma conversa. Retorna {"etiqueta", "confianca", "justificativa"},
    onde "etiqueta" é o nome exato de uma etiqueta alvo ou SEM_ETIQUETA.
    """
    if cliente is None:
        cliente = criar_cliente()

    resposta = cliente.messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=300,
        system=INSTRUCOES.format(sem_etiqueta=SEM_ETIQUETA),
        messages=[{"role": "user", "content": _construir_prompt(conversa, etiquetas_alvo, dias_parado)}],
    )

    resultado = _extrair_json("".join(b.text for b in resposta.content if b.type == "text"))

    nome = str(resultado.get("etiqueta", "")).strip()
    validas = {normalizar(e["name"]): e["name"] for e in etiquetas_alvo}
    escolhida = validas.get(normalizar(nome), SEM_ETIQUETA)

    try:
        confianca = float(resultado.get("confianca", 0))
    except (TypeError, ValueError):
        confianca = 0.0

    return {
        "etiqueta": escolhida,
        "confianca": max(0.0, min(1.0, confianca)),
        "justificativa": str(resultado.get("justificativa", "")).strip(),
    }


def criar_cliente():
    """Instancia o cliente da Anthropic, com erro claro se faltar dependência/chave."""
    try:
        import anthropic
    except ImportError as e:
        raise RuntimeError(
            "Pacote 'anthropic' não instalado. Rode: pip install -r requirements.txt"
        ) from e

    if not config.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY não configurada no .env")

    return anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
