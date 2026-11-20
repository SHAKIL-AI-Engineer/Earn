"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Download, Eye, FileText, LoaderCircle, X } from "lucide-react";
import { formatMoney } from "@/lib/finance";
import type { WorkspaceData } from "@/lib/client-types";
const PdfPreview = dynamic(
  () => import("./pdf-preview").then((m) => m.PdfPreview),
  { ssr: false, loading: () => <p className="muted">Loading PDF viewer…</p> },
);
export function ExportDialog({
  data,
  month,
  day,
  period,
  onClose,
}: {
  data: WorkspaceData;
  month: string;
  day: string;
  period: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState(period);
  const [date, setDate] = useState(day);
  const [selectedMonth, setMonth] = useState(month);
  const [detail, setDetail] = useState("detailed");
  const [orientation, setOrientation] = useState("portrait");
  const [sections, setSections] = useState([
    "production",
    "salary",
    "cashflow",
  ]);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  function reset() {
    setUrl("");
    setError("");
  }
  async function generate() {
    setPending(true);
    setError("");
    try {
      const q = new URLSearchParams({
        period: mode,
        day: date,
        month: selectedMonth,
        detail,
        orientation,
        sections: sections.join(","),
      });
      const r = await fetch(`/api/export?${q}`);
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error);
      }
      setUrl(URL.createObjectURL(await r.blob()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create PDF.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">READY TO SHARE</span>
            <h2 id="export-title">Your report, beautifully clear.</h2>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close PDF export"
          >
            <X size={21} />
          </button>
        </div>
        <div className="export-body">
          <aside className="export-options">
            <label>
              Report type
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  reset();
                }}
              >
                <option value="monthly">Monthly summary</option>
                <option value="daily">Daily report</option>
              </select>
            </label>
            {mode === "daily" ? (
              <label>
                Report date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    reset();
                  }}
                />
              </label>
            ) : (
              <label>
                Report month
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    reset();
                  }}
                />
              </label>
            )}
            <label>
              Content
              <select
                value={detail}
                onChange={(e) => {
                  setDetail(e.target.value);
                  reset();
                }}
              >
                <option value="detailed">Summary + detailed records</option>
                <option value="summary">Summary only</option>
              </select>
            </label>
            <label>
              Page layout
              <select
                value={orientation}
                onChange={(e) => {
                  setOrientation(e.target.value);
                  reset();
                }}
              >
                <option value="portrait">A4 · Portrait</option>
                <option value="landscape">A4 · Landscape</option>
              </select>
            </label>
            {detail === "detailed" && (
              <fieldset>
                <legend>Include sections</legend>
                {[
                  ["production", "Total Earn"],
                  ["salary", "Salary"],
                  ["cashflow", "Cash flow expenses"],
                ].map(([key, label]) => (
                  <label className="checkbox-label" key={key}>
                    <input
                      type="checkbox"
                      checked={sections.includes(key)}
                      onChange={(e) => {
                        setSections(
                          e.target.checked
                            ? [...sections, key]
                            : sections.filter((x) => x !== key),
                        );
                        reset();
                      }}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            )}
            <p className="field-help">
              Generated from your daily totals. Cash flow records are expenses
              only.
            </p>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button
              className="btn primary"
              disabled={pending}
              onClick={generate}
            >
              {pending ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Eye size={17} />
              )}{" "}
              {pending
                ? "Generating…"
                : url
                  ? "Refresh preview"
                  : "Generate preview"}
            </button>
            {url && (
              <a
                href={url}
                download={`earn-${mode}-${mode === "daily" ? date : selectedMonth}.pdf`}
                className="btn download"
              >
                <Download size={17} /> Download PDF
              </a>
            )}
          </aside>
          <div className="pdf-preview">
            {url ? (
              <PdfPreview key={url} url={url} />
            ) : (
              <div className="preview-paper">
                <div className="preview-brand">earn.</div>
                <span className="small muted">{data.workspace.name} · BDT</span>
                <h3>{mode === "daily" ? "Daily report" : "Monthly summary"}</h3>
                <p>{mode === "daily" ? date : selectedMonth}</p>
                <div className="preview-metrics">
                  <span>
                    Total Earn
                    <strong>
                      {mode === data.period.mode &&
                      (mode === "daily"
                        ? date === day
                        : selectedMonth === month)
                        ? formatMoney(data.totals.totalEarn)
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Net Balance
                    <strong>
                      {mode === data.period.mode &&
                      (mode === "daily"
                        ? date === day
                        : selectedMonth === month)
                        ? formatMoney(data.totals.netBalance)
                        : "—"}
                    </strong>
                  </span>
                </div>
                <div className="preview-lines" />
                <div className="preview-lines short" />
                <div className="preview-lines" />
                <div className="preview-placeholder">
                  <FileText size={27} />
                  <p>Make it yours, then generate a preview.</p>
                  <small>Your actual PDF will appear here.</small>
                </div>
                <footer>Confidential financial report · A4</footer>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
