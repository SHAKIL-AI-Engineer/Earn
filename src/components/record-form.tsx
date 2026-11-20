"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { Kind } from "@/lib/permissions";
import type { RecordRow } from "@/lib/client-types";
const names: Record<Kind, string> = {
  production: "production",
  salary: "salary",
  cashflow: "cash flow expense",
};
export function RecordForm({
  kind,
  row,
  day,
  onClose,
  onSaved,
}: {
  kind: Kind;
  row?: RecordRow;
  day: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch(`/api/records/${kind}`, {
        method: row ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          id: row?.id || requestId,
          updatedAt: row?.updatedAt,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <section
        className="modal small-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">SIMPLE DAILY TOTAL</span>
            <h2 id="entry-title">
              {row ? "Edit" : "Add"} {names[kind]}
            </h2>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            disabled={pending}
            aria-label="Close form"
          >
            <X size={21} />
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Date
            <input
              name="date"
              type="date"
              defaultValue={row?.date.slice(0, 10) || day}
              required
              autoFocus
            />
          </label>
          {kind === "production" && (
            <label>
              Daily Production
              <input
                name="dailyProduction"
                type="number"
                min="0"
                max="10000000"
                step="0.001"
                defaultValue={row?.dailyProduction}
                required
                placeholder="Enter the day's production"
              />
            </label>
          )}
          <label>
            {kind === "production"
              ? "Total Earn (৳)"
              : kind === "salary"
                ? "Net Salary (৳)"
                : "Net Amount (৳)"}
            <input
              name={
                kind === "production"
                  ? "totalEarn"
                  : kind === "salary"
                    ? "netSalary"
                    : "netAmount"
              }
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              defaultValue={
                kind === "production"
                  ? row?.totalEarn
                  : kind === "salary"
                    ? row?.netSalary
                    : row?.netAmount
              }
              placeholder="0.00"
              required
            />
          </label>
          <p className="field-help">
            One total per date.{" "}
            {kind === "cashflow"
              ? "Net Amount is money paid out for expenses."
              : "Enter the final daily amount directly."}
          </p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-footer">
            <button
              className="btn"
              type="button"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button className="btn primary" disabled={pending}>
              {pending ? "Saving…" : row ? "Save changes" : "Save entry"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
