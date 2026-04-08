export interface CampaignMetrics {
  id: string;
  name: string;
  objective: string;
  status: string;
  classification: CampaignClassification;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  reach: number;
  frequency: number;
  conversasIniciadas: number | null;
  custoPorConversa: number | null;
  leads: number | null;
  compras: number | null;
  conversoes: number | null;
  seguidores: number | null;
  custoEstimadoPorSeguidor: "estimativa" | null;
  resultados: number | null;
  custoResultado: number | null;
}

export interface ReportData {
  period: { start: string; end: string };
  adAccountId: string;
  adAccountName: string;
  campaigns: CampaignMetrics[];
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    reach: number;
    conversasIniciadas: number | null;
    custoPorConversa: number | null;
    leads: number | null;
    conversoes: number | null;
  };
  syncedAt: string;
}

export type CampaignClassification =
  | "mensagens"
  | "seguidores"
  | "leads"
  | "vendas"
  | "trafego"
  | "branding"
  | "outros";

const OBJECTIVE_MAP: Record<string, CampaignClassification> = {
  OUTCOME_ENGAGEMENT: "seguidores",
  OUTCOME_LEADS: "leads",
  OUTCOME_SALES: "vendas",
  OUTCOME_TRAFFIC: "trafego",
  OUTCOME_AWARENESS: "branding",
  MESSAGES: "mensagens",
  PAGE_LIKES: "seguidores",
  CONVERSIONS: "vendas",
  LEAD_GENERATION: "leads",
  LINK_CLICKS: "trafego",
};

const KEYWORD_MAP: [RegExp, CampaignClassification][] = [
  [/mensagem|whatsapp|conversa|chat/i, "mensagens"],
  [/seguidor|like|curtida|engaj/i, "seguidores"],
  [/lead|cadastro|formulario|contato/i, "leads"],
  [/venda|compra|produto|ecommerce|pixel/i, "vendas"],
  [/trafego|visita|click|link/i, "trafego"],
  [/brand|alcance|awareness|reconhec/i, "branding"],
];

export function classifyCampaign(
  objective: string,
  name: string
): CampaignClassification {
  const fromObjective = OBJECTIVE_MAP[objective];
  if (fromObjective) return fromObjective;
  for (const [re, cls] of KEYWORD_MAP) {
    if (re.test(name)) return cls;
  }
  return "outros";
}

function safeAction(actions: Record<string, string>[] | undefined, type: string): number | null {
  if (!actions) return null;
  const entry = actions.find((a) => a.action_type === type);
  if (!entry) return null;
  const v = parseFloat(entry.value);
  return isNaN(v) ? null : v;
}

function sumActions(
  actions: Record<string, string>[] | undefined,
  types: string[]
): number | null {
  if (!actions) return null;
  let total = 0;
  let found = false;
  for (const t of types) {
    const v = safeAction(actions, t);
    if (v !== null) {
      total += v;
      found = true;
    }
  }
  return found ? total : null;
}

function safeDivide(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  return num / den;
}

function n(v: unknown): number {
  const f = parseFloat(String(v ?? "0"));
  return isNaN(f) ? 0 : f;
}

export function normalizeCampaign(raw: Record<string, unknown>): CampaignMetrics {
  const actions = raw.actions as Record<string, string>[] | undefined;
  const objective = String(raw.objective ?? "");
  const name = String(raw.campaign_name ?? raw.name ?? "");
  const spend = n(raw.spend);
  const impressions = n(raw.impressions);
  const clicks = n(raw.clicks);
  const reach = n(raw.reach);

  const conversasIniciadas = sumActions(actions, [
    "onsite_conversion.messaging_first_reply",
    "onsite_conversion.messaging_conversation_started_7d",
  ]);

  const leads = sumActions(actions, ["lead", "fb_pixel_lead", "offsite_conversion.fb_pixel_lead"]);
  const compras = sumActions(actions, ["purchase", "fb_pixel_purchase", "offsite_conversion.fb_pixel_purchase"]);
  const conversoes = sumActions(actions, [
    "lead", "fb_pixel_lead", "purchase", "fb_pixel_purchase",
    "offsite_conversion.fb_pixel_lead", "offsite_conversion.fb_pixel_purchase",
    "onsite_conversion.messaging_first_reply",
  ]);

  const classification = classifyCampaign(objective, name);

  return {
    id: String(raw.campaign_id ?? raw.id ?? ""),
    name,
    objective,
    status: String(raw.effective_status ?? raw.status ?? "UNKNOWN"),
    classification,
    spend,
    impressions: Math.round(impressions),
    clicks: Math.round(clicks),
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    reach: Math.round(reach),
    frequency: reach > 0 ? impressions / reach : 0,
    conversasIniciadas: conversasIniciadas !== null ? Math.round(conversasIniciadas) : null,
    custoPorConversa: safeDivide(spend, conversasIniciadas),
    leads: leads !== null ? Math.round(leads) : null,
    compras: compras !== null ? Math.round(compras) : null,
    conversoes: conversoes !== null ? Math.round(conversoes) : null,
    seguidores: null,
    custoEstimadoPorSeguidor: null,
    resultados: conversoes ?? leads ?? conversasIniciadas,
    custoResultado: null,
  };
}

export function buildTotals(campaigns: CampaignMetrics[]) {
  const spend = campaigns.reduce((s, c) => s + c.spend, 0);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const reach = campaigns.reduce((s, c) => s + c.reach, 0);

  const conversasRaw = campaigns.map((c) => c.conversasIniciadas);
  const hasConversas = conversasRaw.some((v) => v !== null);
  const conversasIniciadas = hasConversas
    ? conversasRaw.reduce<number>((s, v) => s + (v ?? 0), 0)
    : null;

  const leadsRaw = campaigns.map((c) => c.leads);
  const hasLeads = leadsRaw.some((v) => v !== null);
  const leads = hasLeads ? leadsRaw.reduce<number>((s, v) => s + (v ?? 0), 0) : null;

  const conversoesRaw = campaigns.map((c) => c.conversoes);
  const hasConversoes = conversoesRaw.some((v) => v !== null);
  const conversoes = hasConversoes
    ? conversoesRaw.reduce<number>((s, v) => s + (v ?? 0), 0)
    : null;

  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    reach,
    conversasIniciadas,
    custoPorConversa: safeDivide(spend, conversasIniciadas),
    leads,
    conversoes,
  };
}
