import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { ReportData, CampaignMetrics } from "@/lib/meta/normalize";
import { Insight } from "@/lib/reports/insights-text";

const BLUE = "#1877F2";
const DARK = "#1C1E21";
const GRAY = "#65676B";
const LIGHT = "#F5F6FA";
const WHITE = "#FFFFFF";
const GREEN = "#00C851";
const ORANGE = "#FF8800";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: WHITE, padding: 32 },
  header: {
    backgroundColor: BLUE,
    borderRadius: 8,
    padding: 24,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: WHITE, fontSize: 18, fontFamily: "Helvetica-Bold" },
  headerSub: { color: WHITE, fontSize: 10, opacity: 0.85, marginTop: 3 },
  headerPeriod: { color: WHITE, fontSize: 11, textAlign: "right" },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E6EB",
    paddingBottom: 4,
  },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiCard: {
    backgroundColor: LIGHT,
    borderRadius: 6,
    padding: "10 12",
    width: "22%",
    alignItems: "center",
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    textAlign: "center",
  },
  kpiLabel: { fontSize: 8, color: GRAY, marginTop: 2, textAlign: "center" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BLUE,
    padding: "6 4",
    borderRadius: "4 4 0 0",
  },
  tableRow: {
    flexDirection: "row",
    padding: "5 4",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E4E6EB",
  },
  tableRowAlt: { backgroundColor: LIGHT },
  tableCell: { fontSize: 8, color: DARK, flex: 1, paddingHorizontal: 2 },
  tableCellHeader: {
    fontSize: 8,
    color: WHITE,
    flex: 1,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 2,
  },
  tableCellWide: { flex: 2.5 },
  insightRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
    marginRight: 6,
  },
  insightText: { fontSize: 9, color: DARK, flex: 1, lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    borderTopWidth: 0.5,
    borderTopColor: "#E4E6EB",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: GRAY },
  badge: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
  },
});

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtInt(v: number) {
  return v.toLocaleString("pt-BR");
}
function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}
function orDash(v: number | null | undefined, fmt: (n: number) => string) {
  return v !== null && v !== undefined ? fmt(v) : "—";
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kpiCard}>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const color =
    insight.type === "success" ? GREEN : insight.type === "warning" ? ORANGE : GRAY;
  return (
    <View style={s.insightRow}>
      <View style={[s.insightDot, { backgroundColor: color }]} />
      <Text style={s.insightText}>{insight.text}</Text>
    </View>
  );
}

interface Props {
  data: ReportData;
  clientName: string;
  insights: Insight[];
  generatedAt: string;
}

export function ReportPDF({ data, clientName, insights, generatedAt }: Props) {
  const { totals, campaigns, period } = data;
  const active = campaigns.filter((c) => c.spend > 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>📊 {clientName}</Text>
            <Text style={s.headerSub}>Relatório Meta Ads</Text>
          </View>
          <View>
            <Text style={s.headerPeriod}>
              {period.start} → {period.end}
            </Text>
            <Text style={[s.headerPeriod, { fontSize: 9, opacity: 0.8, marginTop: 2 }]}>
              {data.adAccountName}
            </Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo do Período</Text>
          <View style={s.kpiGrid}>
            <KpiCard label="Investimento" value={fmtBRL(totals.spend)} />
            <KpiCard label="Impressões" value={fmtInt(totals.impressions)} />
            <KpiCard label="Cliques" value={fmtInt(totals.clicks)} />
            <KpiCard label="CTR" value={fmtPct(totals.ctr)} />
            <KpiCard label="CPC Médio" value={fmtBRL(totals.cpc)} />
            <KpiCard label="Alcance" value={fmtInt(totals.reach)} />
            <KpiCard
              label="Conversas WhatsApp"
              value={orDash(totals.conversasIniciadas, fmtInt)}
            />
            <KpiCard
              label="Custo/Conversa"
              value={orDash(totals.custoPorConversa, fmtBRL)}
            />
          </View>
        </View>

        {/* Campaigns table */}
        {active.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Desempenho por Campanha</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableCellHeader, s.tableCellWide]}>Campanha</Text>
              <Text style={s.tableCellHeader}>Invest.</Text>
              <Text style={s.tableCellHeader}>Cliques</Text>
              <Text style={s.tableCellHeader}>CTR</Text>
              <Text style={s.tableCellHeader}>CPC</Text>
              <Text style={s.tableCellHeader}>Conversas</Text>
            </View>
            {active.map((c, i) => (
              <View key={c.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, s.tableCellWide]} numberOfLines={1}>
                  {c.name.slice(0, 38)}
                </Text>
                <Text style={s.tableCell}>{fmtBRL(c.spend)}</Text>
                <Text style={s.tableCell}>{fmtInt(c.clicks)}</Text>
                <Text style={s.tableCell}>{fmtPct(c.ctr)}</Text>
                <Text style={s.tableCell}>{fmtBRL(c.cpc)}</Text>
                <Text style={s.tableCell}>
                  {orDash(c.conversasIniciadas, fmtInt)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Análise do Período</Text>
            {insights.map((ins, i) => (
              <InsightRow key={i} insight={ins} />
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Gerado em {generatedAt}</Text>
          <Text style={s.footerText}>Meta Ads Reporter</Text>
        </View>
      </Page>
    </Document>
  );
}
