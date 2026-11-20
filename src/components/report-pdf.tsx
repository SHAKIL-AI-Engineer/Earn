import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { report } from "@/lib/reports";
import path from "node:path";
import { formatMoney } from "@/lib/finance";
Font.register({
  family: "NotoBengali",
  src: path.join(process.cwd(), "public/fonts/NotoSansBengali-Regular.ttf"),
});
function CurrencyText({ value, style }: { value: string; style?: Style }) {
  return (
    <Text style={style}>
      {value.split("৳").map((part, index) => (
        <Text key={index}>
          {index > 0 ? (
            <Text style={{ fontFamily: "NotoBengali" }}>৳</Text>
          ) : null}
          {part}
        </Text>
      ))}
    </Text>
  );
}
export type PdfData = Awaited<ReturnType<typeof report>>;
export type PdfSection = {
  kind: string;
  title: string;
  amountLabel: string;
  rows: { date: string; dailyProduction?: string; amount: string }[];
};
const s = StyleSheet.create({
  page: {
    padding: 38,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#23333b",
    backgroundColor: "#fff",
  },
  header: {
    borderBottomWidth: 2,
    borderColor: "#119c79",
    paddingBottom: 20,
    marginBottom: 22,
  },
  brand: { fontSize: 27, fontFamily: "Helvetica-Bold", color: "#119c79" },
  muted: { fontSize: 9, color: "#71818a", marginTop: 7 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 20 },
  metrics: { flexDirection: "row", gap: 10, marginBottom: 20 },
  metric: { flex: 1, padding: 14, backgroundColor: "#f0f7f4", borderRadius: 6 },
  label: { fontSize: 8, color: "#60776c", marginBottom: 9 },
  value: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  section: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 12,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#edf0f2",
  },
  thead: {
    flexDirection: "row",
    backgroundColor: "#edf3f1",
    padding: 9,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#edf0f2",
  },
  date: { flex: 1 },
  production: { flex: 1, textAlign: "center" },
  amount: { flex: 1, textAlign: "right" },
  empty: { padding: 14, fontSize: 9, color: "#71818a" },
  note: {
    fontSize: 9,
    color: "#667580",
    lineHeight: 1.6,
    backgroundColor: "#f7f9fa",
    padding: 13,
    marginTop: 24,
  },
  footer: {
    position: "absolute",
    bottom: 21,
    left: 38,
    right: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#71818a",
  },
});
export function ReportPdf({
  data,
  sections,
  orientation,
}: {
  data: PdfData;
  sections: PdfSection[];
  orientation: "portrait" | "landscape";
}) {
  const t = data.totals;
  return (
    <Document
      title={`${data.workspace.name} — ${data.period.label}`}
      author={data.workspace.name}
    >
      <Page size="A4" orientation={orientation} style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>earn.</Text>
          <Text style={s.muted}>
            {data.workspace.name} · BDT · {data.workspace.timezone}
          </Text>
          <Text style={s.title}>
            {data.period.mode === "daily" ? "Daily report" : "Monthly summary"}
          </Text>
          <Text style={s.muted}>
            {data.period.label} · {data.period.start} to {data.period.end}
          </Text>
        </View>
        <View style={s.metrics}>
          {[
            ["TOTAL EARN", t.totalEarn],
            ["TOTAL COSTS", t.totalCost],
            ["NET BALANCE", t.netBalance],
          ].map(([label, value]) => (
            <View style={s.metric} key={label}>
              <Text style={s.label}>{label}</Text>
              <CurrencyText style={s.value} value={formatMoney(value)} />
            </View>
          ))}
        </View>
        <Text style={s.section}>Simple daily totals</Text>
        {[
          ["Total Earn", t.totalEarn],
          ["Net Salary", t.netSalary],
          ["Cash Flow Expenses", t.netAmount],
          ["Net Balance", t.netBalance],
        ].map(([label, value]) => (
          <View key={label} style={s.summary}>
            <Text>{label}</Text>
            <CurrencyText value={formatMoney(value)} />
          </View>
        ))}
        {sections.map((section) => (
          <View key={section.kind}>
            <View wrap={false} minPresenceAhead={36}>
              <Text style={s.section}>{section.title}</Text>
              <View style={s.thead}>
                <Text style={s.date}>Date</Text>
                {section.kind === "production" && (
                  <Text style={s.production}>Daily Production</Text>
                )}
                <Text style={s.amount}>{section.amountLabel}</Text>
              </View>
            </View>
            {section.rows.length ? (
              section.rows.map((row, i) => (
                <View style={s.row} key={i} wrap={false}>
                  <Text style={s.date}>{row.date}</Text>
                  {section.kind === "production" && (
                    <Text style={s.production}>{row.dailyProduction}</Text>
                  )}
                  <CurrencyText
                    style={s.amount}
                    value={formatMoney(row.amount)}
                  />
                </View>
              ))
            ) : (
              <Text style={s.empty}>No daily records for this period.</Text>
            )}
          </View>
        ))}
        <Text style={s.note}>
          Net Balance = Total Earn - Net Salary - Cash Flow Expenses. Each
          section stores one daily total per date. Cash flow Net Amount is
          expense-only: money paid out. Monthly summaries add up the daily
          records. All amounts are in Bangladeshi taka.
        </Text>
        <View style={s.footer} fixed>
          <Text>{data.workspace.name} · Confidential report</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
