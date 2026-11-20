"use client";

import { useState } from "react";
import { ArrowRight, Check, Database, LoaderCircle, ShieldCheck, Unplug } from "lucide-react";

type Result = { status: "connected"; checkedAt: string; latencyMs: number };

export function ConnectionCheck() {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function checkConnection() {
    setPending(true);
    setError(false);
    setResult(null);
    try {
      const response = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Connection unavailable");
      const data: Result = await response.json();
      if (data.status !== "connected" || typeof data.latencyMs !== "number") throw new Error("Invalid health response");
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="connection-card">
      <div className="connection-top"><span className="card-kicker">YOUR CONNECTION</span><span className={`status-pill ${result ? "connected" : error ? "failed" : ""}`}><span className="tiny-dot" />{pending ? "Checking" : result ? "Connected" : error ? "Unavailable" : "Ready to check"}</span></div>
      <div className="database-art" aria-hidden="true"><div className="database-glow" /><Database size={58} strokeWidth={1.2} /><span className="database-badge">{result ? <Check size={15} /> : <ShieldCheck size={15} />}</span></div>
      <h3>A solid connection.<br />An open canvas.</h3>
      <p>Check the connection between your app and Neon with a live, read-only query.</p>
      <div className="check-result" role="status" aria-live="polite" aria-atomic="true">
        {pending ? <><LoaderCircle size={15} className="spin" /> Reaching your database…</> : result ? <><Check size={15} /> Query completed in {result.latencyMs} ms · {new Date(result.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</> : error ? <><Unplug size={15} /> Couldn’t connect. Please try again.</> : <><ShieldCheck size={15} /> Credentials stay on the server.</>}
      </div>
      <button className="connection-button" disabled={pending} onClick={checkConnection}>{pending ? "Testing connection…" : result ? "Test again" : error ? "Retry connection" : "Test connection"}{pending ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}</button>
    </div>
  );
}
