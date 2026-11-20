"use client";
import { useState } from "react";
import { X, CircleHelp } from "lucide-react";
import type { Kind } from "@/lib/permissions";
import type { RecordRow } from "@/lib/client-types";
import { categories } from "@/lib/validation";
import { formatMoney, productAmount } from "@/lib/finance";
const names: Record<Kind, string> = {
  production: "production",
  expense: "expense",
  salary: "salary",
  cashEntry: "cash adjustment",
  employee: "employee",
};
export function RecordForm({
  kind,
  row,
  employees,
  day,
  onClose,
  onSaved,
}: {
  kind: Kind;
  row?: RecordRow;
  employees: RecordRow[];
  day: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(Boolean(row?.paidOn));
  const [a, setA] = useState(row?.quantity || row?.daysWorked || "1");
  const [b, setB] = useState(row?.unitRate || row?.dailyRate || "");
  const [employee, setEmployee] = useState(row?.employeeId || "");
  const [date, setDate] = useState(row?.date?.slice(0, 10) || day);
  const [requestId] = useState(() => crypto.randomUUID());
  let total = "0.00";
  try {
    total = productAmount(a, b || "0").toFixed(2);
  } catch {}
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const values: Record<string, unknown> = Object.fromEntries(
      new FormData(e.currentTarget),
    );
    if (kind === "employee") values.active = values.active === "true";
    else if (kind !== "cashEntry") values.paidOn = paid ? values.paidOn : null;
    try {
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
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">KEEP YOUR BOOKS UP TO DATE</span>
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
          {kind !== "employee" && (
            <label>
              Entry date
              <input
                autoFocus
                name="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          )}
          {kind === "employee" ? (
            <>
              <div className="form-grid">
                <label>
                  Employee code
                  <input
                    name="code"
                    defaultValue={row?.code}
                    placeholder="EMP-001"
                    maxLength={30}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Employee name
                  <input
                    name="name"
                    defaultValue={row?.name}
                    required
                    placeholder="Full name"
                    maxLength={160}
                  />
                </label>
              </div>
              <label>
                Position
                <input
                  name="position"
                  defaultValue={row?.position}
                  placeholder="e.g. Machine operator"
                  required
                  maxLength={80}
                />
              </label>
              <div className="form-grid">
                <label>
                  Daily rate (৳)
                  <input
                    name="dailyRate"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    defaultValue={row?.dailyRate}
                    required
                  />
                </label>
                <label>
                  Status
                  <select
                    name="active"
                    defaultValue={row?.active === false ? "false" : "true"}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
              </div>
            </>
          ) : (
            <>
              {kind === "salary" ? (
                <label>
                  Employee
                  <select
                    name="employeeId"
                    required
                    value={employee}
                    onChange={(e) => {
                      setEmployee(e.target.value);
                      setB(
                        employees.find((x) => x.id === e.target.value)
                          ?.dailyRate || "",
                      );
                    }}
                  >
                    <option value="">Select employee</option>
                    {employees.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} · {x.code}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  Description
                  <input
                    name="description"
                    defaultValue={row?.description}
                    maxLength={160}
                    required
                    placeholder={
                      kind === "production"
                        ? "e.g. Cotton shirt production"
                        : kind === "expense"
                          ? "e.g. Fabric purchase"
                          : "e.g. Owner contribution"
                    }
                  />
                </label>
              )}
              {kind === "production" && (
                <>
                  <div className="form-grid">
                    <label>
                      Quantity
                      <input
                        name="quantity"
                        type="number"
                        min="0.001"
                        step="0.001"
                        max="10000000"
                        value={a}
                        onChange={(e) => setA(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Rate per unit (৳)
                      <input
                        name="unitRate"
                        type="number"
                        min="0.01"
                        step="0.01"
                        max="1000000"
                        value={b}
                        onChange={(e) => setB(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Unit
                    <input
                      name="unit"
                      defaultValue={row?.unit || "pieces"}
                      maxLength={25}
                      required
                    />
                  </label>
                </>
              )}
              {kind === "salary" && (
                <div className="form-grid">
                  <label>
                    Days worked
                    <input
                      name="daysWorked"
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={a}
                      onChange={(e) => setA(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Daily rate (৳)
                    <input
                      name="dailyRate"
                      type="number"
                      min="0.01"
                      max="1000000"
                      step="0.01"
                      value={b}
                      onChange={(e) => setB(e.target.value)}
                      required
                    />
                  </label>
                </div>
              )}
              {(kind === "expense" || kind === "cashEntry") && (
                <div className="form-grid">
                  <label>
                    Amount (৳)
                    <input
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max="100000000"
                      defaultValue={row?.amount}
                      required
                    />
                  </label>
                  {kind === "expense" ? (
                    <label>
                      Category
                      <select
                        name="category"
                        defaultValue={row?.category || "Materials"}
                      >
                        {categories.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      Direction
                      <select
                        name="direction"
                        defaultValue={row?.direction || "IN"}
                      >
                        <option value="IN">Cash in</option>
                        <option value="OUT">Cash out</option>
                      </select>
                    </label>
                  )}
                </div>
              )}
              {(kind === "production" || kind === "salary") && (
                <div className="calculated">
                  <span>Calculated total</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
              )}
              {kind !== "cashEntry" && (
                <>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={paid}
                      onChange={(e) => setPaid(e.target.checked)}
                    />
                    {kind === "production"
                      ? "Payment received"
                      : "Payment made"}
                  </label>
                  {paid && (
                    <label>
                      Payment date
                      <input
                        name="paidOn"
                        type="date"
                        min={date}
                        defaultValue={row?.paidOn?.slice(0, 10) || date}
                        required
                      />
                    </label>
                  )}
                </>
              )}
              <label>
                Notes <span className="muted">(optional)</span>
                <textarea
                  name="notes"
                  defaultValue={row?.notes}
                  maxLength={1000}
                  rows={2}
                  placeholder="Add useful context…"
                />
              </label>
              {kind === "cashEntry" && (
                <p className="field-help">
                  <CircleHelp size={14} /> Use adjustments for owner
                  contributions or withdrawals. Paid production, salaries and
                  expenses already affect cash automatically.
                </p>
              )}
            </>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-footer">
            <button
              type="button"
              className="btn"
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
