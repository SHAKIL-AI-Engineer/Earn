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
export type PdfRow = {
  date: string;
  label: string;
  detail: string;
  amount: string;
  status: string;
};
export type PdfSection = { title: string; rows: PdfRow[] };
const s = StyleSheet.create({
  page: {
    padding: 38,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#23333b",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 2,
    borderColor: "#0e9f79",
    paddingBottom: 18,
    marginBottom: 22,
  },
  brand: { fontSize: 25, fontFamily: "Helvetica-Bold", color: "#0e9f79" },
  workspace: { fontSize: 9, color: "#71818a", marginTop: 5 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 22 },
  subtitle: { color: "#71818a", marginTop: 7 },
  metrics: { display: "flex", flexDirection: "row", gap: 10, marginBottom: 18 },
  metric: { flex: 1, padding: 13, backgroundColor: "#f0f7f4", borderRadius: 6 },
  label: { fontSize: 8, color: "#60776c", marginBottom: 8 },
  value: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  section: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 10,
  },
  cash: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderColor: "#edf0f2",
  },
  thead: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#edf3f1",
    padding: 8,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  tr: {
    display: "flex",
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#edf0f2",
  },
  date: { width: "16%" },
  description: { width: "37%", paddingRight: 8 },
  detail: { width: "18%", paddingRight: 6 },
  status: { width: "13%", fontSize: 8 },
  amount: { width: "16%", textAlign: "right" },
  empty: { padding: 14, color: "#71818a" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 38,
    right: 38,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#71818a",
  },
  note: {
    marginTop: 18,
    padding: 12,
    backgroundColor: "#f7f9fa",
    fontSize: 8,
    lineHeight: 1.6,
    color: "#667580",
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
          <Text style={s.workspace}>
            {data.workspace.name} · BDT · {data.workspace.timezone}
          </Text>
          <Text style={s.title}>
            {data.period.mode === "daily" ? "Daily report" : "Monthly summary"}
          </Text>
          <Text style={s.subtitle}>
            {data.period.label} · {data.period.start} to {data.period.end}
          </Text>
        </View>
        <View style={s.metrics}>
          {[
            ["PRODUCTION EARNINGS", t.revenue],
            ["TOTAL COSTS", t.costs],
            ["NET EARNINGS", t.net],
          ].map(([label, value]) => (
            <View key={label} style={s.metric}>
              <Text style={s.label}>{label}</Text>
              <CurrencyText style={s.value} value={formatMoney(value)} />
            </View>
          ))}
        </View>
        <Text style={s.section}>Earnings & expenses</Text>
        {[
          ["Production earnings", t.revenue],
          ["Operating expenses", t.expenses],
          ["Daily salaries", t.salaries],
          ["Net earnings", t.net],
        ].map(([label, value]) => (
          <View key={label} style={s.cash}>
            <Text>{label}</Text>
            <CurrencyText value={formatMoney(value)} />
          </View>
        ))}
        <Text style={s.section}>Cash flow</Text>
        {[
          ["Opening cash", t.openingCash],
          ["Cash received", t.cashIn],
          ["Cash paid", t.cashOut],
          ["Closing cash", t.closingCash],
        ].map(([label, value]) => (
          <View key={label} style={s.cash}>
            <Text>{label}</Text>
            <CurrencyText value={formatMoney(value)} />
          </View>
        ))}
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={s.section}>{section.title}</Text>
            <View style={s.thead}>
              <Text style={s.date}>DATE</Text>
              <Text style={s.description}>DESCRIPTION</Text>
              <Text style={s.detail}>DETAIL</Text>
              <Text style={s.status}>STATUS</Text>
              <Text style={s.amount}>AMOUNT</Text>
            </View>
            {section.rows.length ? (
              section.rows.map((r, i) => (
                <View key={i} style={s.tr} wrap={false}>
                  <Text style={s.date}>{r.date}</Text>
                  <Text style={s.description}>{r.label}</Text>
                  <CurrencyText style={s.detail} value={r.detail} />
                  <Text style={s.status}>{r.status}</Text>
                  <CurrencyText
                    style={s.amount}
                    value={formatMoney(r.amount)}
                  />
                </View>
              ))
            ) : (
              <Text style={s.empty}>No records for this period.</Text>
            )}
          </View>
        ))}
        <Text style={s.note}>
          Net earnings = production earnings - operating expenses - salaries.
          Cash flow uses payment dates and includes owner contributions and
          withdrawals. Unpaid records affect earnings and expenses but do not
          affect cash. Salary = daily rate × days worked. Amounts are rounded to
          two decimal places per record.
        </Text>
        <View style={s.footer} fixed>
          <Text>{data.workspace.name} · Confidential financial report</Text>
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
