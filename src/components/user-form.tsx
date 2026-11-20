"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { User } from "@/lib/client-types";
export function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const values: Record<string, unknown> = Object.fromEntries(
      new FormData(e.currentTarget),
    );
    if (!values.password) delete values.password;
    values.active = values.active !== "false";
    try {
      const r = await fetch("/api/team", {
        method: user ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          id: user?.id,
          updatedAt: user?.updatedAt,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save user.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-title"
      >
        <div className="modal-heading">
          <h2 id="user-title">
            {user ? "Edit member" : "Add workspace member"}
          </h2>
          <button
            className="icon-btn"
            aria-label="Close user form"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={save}>
          <label>
            Full name
            <input
              name="name"
              defaultValue={user?.name}
              required
              autoFocus
              maxLength={160}
            />
          </label>
          {!user && (
            <label>
              Email address
              <input name="email" type="email" required />
            </label>
          )}
          <label>
            {user ? "Reset password (optional)" : "Initial password"}
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              required={!user}
              autoComplete="new-password"
              placeholder="At least 12 characters"
            />
          </label>
          <label>
            Role
            <select name="role" defaultValue={user?.role || "viewer"}>
              {["admin", "manager", "accountant", "viewer"].map((r) => (
                <option key={r} value={r}>
                  {r[0].toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </label>
          {user && (
            <label>
              Status
              <select name="active" defaultValue={String(user.active)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          )}
          <p className="field-help">
            Share credentials privately. Users cannot register themselves;
            administrators control access.
          </p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" disabled={pending}>
              {pending ? "Saving…" : "Save member"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
