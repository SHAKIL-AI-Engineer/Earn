"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "better-auth/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Code2,
  Coins,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SunMoon,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { Kind } from "@/lib/permissions";
import { canExport, canWrite } from "@/lib/permissions";
import { formatMoney } from "@/lib/finance";
import { categories, today } from "@/lib/validation";
import type { RecordRow, User, WorkspaceData } from "@/lib/client-types";
import { RecordForm } from "./record-form";
import { ExportDialog } from "./export-dialog";
const authClient = createAuthClient();
const meta: Record<
  string,
  { title: string; subtitle: string; kind: Kind; label: string }
> = {
  dashboard: {
    title: "Business overview",
    subtitle: "A little clarity for your day. Here’s where things stand.",
    kind: "production",
    label: "production",
  },
  production: {
    title: "Daily production",
    subtitle: "Track the work you do and the value it creates.",
    kind: "production",
    label: "production",
  },
  salaries: {
    title: "Daily salaries",
    subtitle: "Fair pay, clear records. Keep every working day accounted for.",
    kind: "salary",
    label: "salary",
  },
  expenses: {
    title: "Operating expenses",
    subtitle: "Know where your money goes, down to the last detail.",
    kind: "expense",
    label: "expense",
  },
  cashflow: {
    title: "Cash flow",
    subtitle: "Follow what comes in, what goes out, and what’s left.",
    kind: "cashEntry",
    label: "cash adjustment",
  },
  employees: {
    title: "Your people",
    subtitle:
      "The people behind the production. Manage your team’s daily rates.",
    kind: "employee",
    label: "employee",
  },
  "reports/daily": {
    title: "Daily report",
    subtitle: "One day. Every number. A complete picture of your business.",
    kind: "production",
    label: "production",
  },
  "reports/monthly": {
    title: "Monthly summary",
    subtitle: "Step back and see the bigger picture, one month at a time.",
    kind: "production",
    label: "production",
  },
  team: {
    title: "Users & permissions",
    subtitle: "The right access for the right people.",
    kind: "employee",
    label: "user",
  },
  settings: {
    title: "Workspace settings",
    subtitle: "Make Earn feel like your business.",
    kind: "production",
    label: "production",
  },
  system: {
    title: "System architecture",
    subtitle: "A clear foundation for a growing business.",
    kind: "production",
    label: "production",
  },
};
const nav = [
  { href: "dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "production", label: "Production", icon: Package },
  { href: "salaries", label: "Daily salaries", icon: Coins },
  { href: "expenses", label: "Expenses", icon: Wallet },
  { href: "cashflow", label: "Cash flow", icon: ChartNoAxesCombined },
  { href: "employees", label: "Employees", icon: Users },
];
export function Dashboard({ section, user }: { section: string; user: User }) {
  const router = useRouter();
  const m = meta[section];
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [day, setDay] = useState(today);
  const [period, setPeriod] = useState(
    section === "reports/daily" ? "daily" : "monthly",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<{ row?: RecordRow } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState("");
  const [voiding, setVoiding] = useState<RecordRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<User[]>([]);
  const [userForm, setUserForm] = useState<User | null | undefined>(undefined);
  const [activity, setActivity] = useState(false);
  const requestRef = useRef(0);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const ctrl = new AbortController();
    const n = ++requestRef.current;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError("");
        try {
          const q = new URLSearchParams({
            month,
            day,
            period,
            kind: m.kind,
            search,
            status,
            category,
            page: String(page),
          });
          const r = await fetch(`/api/workspace?${q}`, {
            signal: ctrl.signal,
            cache: "no-store",
          });
          const d = await r.json();
          if (r.status === 401 || r.status === 403) {
            router.push("/login");
            return;
          }
          if (!r.ok) throw new Error(d.error);
          if (n === requestRef.current) setData(d);
          if (section === "team") {
            const t = await fetch("/api/team", { signal: ctrl.signal });
            if (t.ok) setTeam(await t.json());
          }
        } catch (e) {
          if (e instanceof Error && e.name !== "AbortError")
            setError(e.message);
        } finally {
          if (!ctrl.signal.aborted) setLoading(false);
        }
      },
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [
    month,
    day,
    period,
    m.kind,
    search,
    status,
    category,
    page,
    revision,
    router,
    section,
  ]);
  const refresh = () => setRevision((v) => v + 1);
  function saved() {
    setForm(null);
    setUserForm(undefined);
    setToast("Saved. Your reports are up to date.");
    refresh();
  }
  async function voidRecord() {
    if (!voiding) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/records/${m.kind}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: voiding.id, updatedAt: voiding.updatedAt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setVoiding(null);
      setToast("Entry voided. The original remains in the audit trail.");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to void entry.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const open = Boolean(
      form || exporting || userForm !== undefined || voiding || activity,
    );
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>('[aria-modal="true"]');
    const elements = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]',
        ) || [],
      ).filter((el) => el.offsetParent !== null);
    const frame = requestAnimationFrame(() => elements()[0]?.focus());
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setForm(null);
        setExporting(false);
        setUserForm(undefined);
        setVoiding(null);
        setActivity(false);
      }
      if (e.key !== "Tab") return;
      const list = elements();
      const first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", key);
      document.body.style.overflow = before;
      previous?.focus();
    };
  }, [form, exporting, userForm, voiding, activity, busy]);
  const me = data?.user || user;
  const exportAllowed = canExport(me.role);
  const write = canWrite(me.role, m.kind);
  const reportView = section.startsWith("reports");
  const management = ["team", "settings", "system"].includes(section);
  const t = data?.totals;
  return (
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
    >
      {mobile && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Link href="/dashboard" className="logo">
            <span className="logo-icon">e</span>
            <span className="brand-name">
              earn<span className="accent">.</span>
            </span>
          </Link>
          <button
            className="icon-btn collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={17} />
          </button>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-badge">
          <span className="workspace-avatar">
            {(data?.workspace.name || "W").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{data?.workspace.name || "Your workspace"}</strong>
            <small>Business workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={`/${n.href}`}
              className={`nav-item ${section === n.href ? "active" : ""}`}
              title={n.label}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {section === n.href && <span className="nav-active-dot" />}
            </Link>
          ))}
          <details className="nav-group" open={reportView || undefined}>
            <summary
              className={reportView ? "nav-item active-parent" : "nav-item"}
            >
              <FileText size={18} />
              <span>Reports</span>
              <ChevronDown size={14} />
            </summary>
            <div className="submenu">
              <Link
                href="/reports/daily"
                className={section === "reports/daily" ? "active" : ""}
              >
                Daily report
              </Link>
              <Link
                href="/reports/monthly"
                className={section === "reports/monthly" ? "active" : ""}
              >
                Monthly summary
              </Link>
            </div>
          </details>
        </nav>
        <span className="nav-label">MANAGEMENT</span>
        <nav aria-label="Management navigation">
          {me.role === "admin" && (
            <>
              <Link
                href="/team"
                className={`nav-item ${section === "team" ? "active" : ""}`}
              >
                <ShieldCheck size={18} />
                <span>Users & roles</span>
              </Link>
              <Link
                href="/settings"
                className={`nav-item ${section === "settings" ? "active" : ""}`}
              >
                <Settings2 size={18} />
                <span>Settings</span>
              </Link>
            </>
          )}
          <Link
            href="/system"
            className={`nav-item ${section === "system" ? "active" : ""}`}
          >
            <Code2 size={18} />
            <span>Architecture</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">✦</span>
            <strong>Good records. Better days.</strong>
            <p>
              Keep your daily entries up to date for a clearer monthly picture.
            </p>
          </div>
          <div className="sidebar-person">
            <span className="avatar">{me.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{me.name}</strong>
              <small className="capitalize">{me.role}</small>
            </div>
            <button
              className="icon-btn"
              aria-label="Sign out"
              onClick={async () => {
                await authClient.signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{m.title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="workspace-pill">
              <span className="live-dot" /> USD workspace
            </span>
            <button
              className="icon-btn"
              aria-label="Toggle light and dark theme"
              onClick={() => {
                const next =
                  document.documentElement.dataset.theme === "dark"
                    ? "light"
                    : "dark";
                document.documentElement.dataset.theme = next;
                localStorage.setItem("earn-theme", next);
              }}
            >
              <SunMoon size={19} />
            </button>
            {me.role === "admin" && (
              <button
                className="icon-btn"
                aria-label="View recent activity"
                onClick={() => setActivity(true)}
              >
                <ClipboardList size={19} />
              </button>
            )}
            <details className="profile-menu">
              <summary className="avatar" aria-label="Account menu">
                {me.name.slice(0, 2).toUpperCase()}
              </summary>
              <div className="dropdown">
                <strong>{me.name}</strong>
                <small>{me.email}</small>
                <span className="role-badge capitalize">{me.role}</span>
                <button
                  onClick={async () => {
                    await authClient.signOut();
                    router.push("/login");
                    router.refresh();
                  }}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </details>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                <span className="live-dot" /> YOUR BUSINESS, AT A GLANCE
              </div>
              <h1>{m.title}</h1>
              <p>{m.subtitle}</p>
            </div>
            <div className="heading-actions">
              {!management && exportAllowed && (
                <button
                  className="btn"
                  disabled={!data || loading}
                  onClick={() => setExporting(true)}
                >
                  <ArrowDownToLine size={16} />
                  Export report
                </button>
              )}
              {section === "team" ? (
                <button
                  className="btn primary"
                  onClick={() => setUserForm(null)}
                >
                  <Plus size={17} /> Add user
                </button>
              ) : (
                !reportView &&
                !management &&
                write && (
                  <button
                    className="btn primary"
                    disabled={!data}
                    onClick={() => setForm({})}
                  >
                    <Plus size={17} /> Add {m.label}
                  </button>
                )
              )}
            </div>
          </div>
          {!management && (
            <div className="period-toolbar">
              <div className="segmented" aria-label="Reporting period">
                <button
                  className={period === "monthly" ? "selected" : ""}
                  onClick={() => {
                    setPeriod("monthly");
                    setPage(1);
                  }}
                >
                  Monthly
                </button>
                <button
                  className={period === "daily" ? "selected" : ""}
                  onClick={() => {
                    setPeriod("daily");
                    setPage(1);
                  }}
                >
                  Daily
                </button>
              </div>
              <label className="date-picker">
                <span className="sr-only">
                  {period === "monthly" ? "Report month" : "Report date"}
                </span>
                <input
                  type={period === "monthly" ? "month" : "date"}
                  value={period === "monthly" ? month : day}
                  onChange={(e) => {
                    if (period === "monthly") setMonth(e.target.value);
                    else setDay(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <span className="toolbar-note">
                {data?.period.label || "Loading period…"}{" "}
                <span>· All amounts in USD</span>
              </span>
              <button
                className="icon-btn"
                onClick={refresh}
                disabled={loading}
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} />
              </button>
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button onClick={refresh}>Try again</button>
            </div>
          )}
          {loading && !data ? (
            <div className="loading-state">
              <RefreshCw className="spin" size={26} />
              <h3>Getting your workspace ready…</h3>
              <p>Your records are being loaded securely.</p>
            </div>
          ) : (
            data && (
              <>
                {!management && (
                  <>
                    <div className="metric-grid">
                      {(section === "cashflow"
                        ? [
                            [
                              "Opening cash",
                              t?.openingCash,
                              Wallet,
                              "Available at period start",
                            ],
                            [
                              "Cash received",
                              t?.cashIn,
                              ArrowDownLeft,
                              "Actual payments received",
                            ],
                            [
                              "Cash paid",
                              t?.cashOut,
                              ArrowUpRight,
                              "Actual payments made",
                            ],
                            [
                              "Closing cash",
                              t?.closingCash,
                              CircleDollarSign,
                              "Opening + received − paid",
                            ],
                          ]
                        : [
                            [
                              "Production earnings",
                              t?.revenue,
                              Package,
                              `${t?.units} units produced`,
                            ],
                            [
                              "Operating expenses",
                              t?.expenses,
                              Wallet,
                              "Excludes daily salaries",
                            ],
                            [
                              "Daily salaries",
                              t?.salaries,
                              Users,
                              `${t?.activeEmployees} active employees`,
                            ],
                            [
                              "Net earnings",
                              t?.net,
                              ChartNoAxesCombined,
                              "Earnings − expenses − salaries",
                            ],
                          ]
                      ).map(([label, value, Icon, note], i) => {
                        const Glyph = Icon as typeof Wallet;
                        return (
                          <article
                            className={`metric-card ${i === 3 ? "featured" : ""}`}
                            key={String(label)}
                          >
                            <div className="metric-top">
                              <span>{String(label)}</span>
                              <span className="metric-icon">
                                <Glyph size={17} />
                              </span>
                            </div>
                            <strong>{formatMoney(String(value || 0))}</strong>
                            <small>{String(note)}</small>
                          </article>
                        );
                      })}
                    </div>
                    {(section === "dashboard" || reportView) && (
                      <div className="chart-grid">
                        <section className="panel trend-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Earnings & costs</h2>
                              <p>
                                The shape of your{" "}
                                {period === "daily" ? "day" : "month"}.
                              </p>
                            </div>
                            <div className="chart-legend">
                              <span>
                                <i className="legend-earnings" />
                                Earnings
                              </span>
                              <span>
                                <i className="legend-costs" />
                                Costs
                              </span>
                            </div>
                          </div>
                          <div className="chart-container">
                            <ResponsiveContainer width="100%" height={235}>
                              <AreaChart
                                data={data.trend.map((r) => ({
                                  ...r,
                                  revenue: Number(r.revenue),
                                  costs: Number(r.costs),
                                }))}
                                margin={{
                                  top: 15,
                                  right: 12,
                                  left: -10,
                                  bottom: 0,
                                }}
                              >
                                <defs>
                                  <linearGradient
                                    id="earnGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="0%"
                                      stopColor="#34bd97"
                                      stopOpacity={0.23}
                                    />
                                    <stop
                                      offset="100%"
                                      stopColor="#34bd97"
                                      stopOpacity={0}
                                    />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid
                                  vertical={false}
                                  stroke="var(--line)"
                                  strokeDasharray="4 5"
                                />
                                <XAxis
                                  dataKey="day"
                                  tickFormatter={(v) => String(v).slice(8)}
                                  axisLine={false}
                                  tickLine={false}
                                  minTickGap={22}
                                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                                />
                                <YAxis
                                  tickFormatter={(v) =>
                                    `$${v >= 1000 ? `${v / 1000}k` : v}`
                                  }
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: "var(--panel)",
                                    border: "1px solid var(--line)",
                                    borderRadius: 8,
                                    color: "var(--text)",
                                  }}
                                  formatter={(v) => formatMoney(Number(v))}
                                />
                                <Area
                                  isAnimationActive={false}
                                  type="monotone"
                                  dataKey="revenue"
                                  name="Earnings"
                                  stroke="#34bd97"
                                  fill="url(#earnGradient)"
                                  strokeWidth={2.5}
                                />
                                <Area
                                  isAnimationActive={false}
                                  type="monotone"
                                  dataKey="costs"
                                  name="Costs"
                                  stroke="#8d9dec"
                                  fill="transparent"
                                  strokeWidth={2}
                                  strokeDasharray="4 3"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          {data.trend.every(
                            (r) =>
                              Number(r.revenue) === 0 && Number(r.costs) === 0,
                          ) && (
                            <p className="chart-empty">
                              Add your first entry to start seeing the bigger
                              picture.
                            </p>
                          )}
                        </section>
                        <section className="panel breakdown-panel">
                          <div className="panel-heading">
                            <div>
                              <h2>Where it goes</h2>
                              <p>Operating expenses by category.</p>
                            </div>
                            <Wallet size={18} className="muted" />
                          </div>
                          <div className="breakdown-total">
                            {formatMoney(t?.expenses || "0")}
                            <span>Total expenses</span>
                          </div>
                          {data.breakdown.length ? (
                            data.breakdown
                              .sort(
                                (a, b) => Number(b.amount) - Number(a.amount),
                              )
                              .map((b, i) => (
                                <div
                                  className="breakdown-item"
                                  key={b.category}
                                >
                                  <div>
                                    <span>
                                      <i
                                        style={{
                                          background: [
                                            "#34bd97",
                                            "#8d9dec",
                                            "#dba96c",
                                            "#78a8d6",
                                          ][i % 4],
                                        }}
                                      />
                                      {b.category}
                                    </span>
                                    <strong>{formatMoney(b.amount)}</strong>
                                  </div>
                                  <div className="progress-track">
                                    <div
                                      style={{
                                        width: `${(Number(b.amount) / Math.max(1, Number(t?.expenses))) * 100}%`,
                                        background: [
                                          "#34bd97",
                                          "#8d9dec",
                                          "#dba96c",
                                          "#78a8d6",
                                        ][i % 4],
                                      }}
                                    />
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="mini-empty">
                              <Wallet size={23} />
                              <p>No expenses recorded yet.</p>
                            </div>
                          )}
                        </section>
                      </div>
                    )}
                    {(section === "cashflow" || reportView) && (
                      <div className="cash-summary panel">
                        <div>
                          <span className="eyebrow">CASH POSITION</span>
                          <h2>{formatMoney(t?.closingCash || "0")}</h2>
                          <p>Closing cash for {data.period.label}</p>
                        </div>
                        <div>
                          <span>
                            Opening balance
                            <strong>
                              {formatMoney(t?.openingCash || "0")}
                            </strong>
                          </span>
                          <span className="positive">
                            + Cash received
                            <strong>{formatMoney(t?.cashIn || "0")}</strong>
                          </span>
                          <span>
                            − Cash paid
                            <strong>{formatMoney(t?.cashOut || "0")}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                    <section className="panel records-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            {section === "dashboard" || reportView
                              ? "Production records"
                              : section === "cashflow"
                                ? "Cash activity"
                                : m.title}
                          </h2>
                          <p>
                            {section === "cashflow"
                              ? "All receipts, payments and adjustments, by payment date."
                              : "Your records for the selected period."}
                          </p>
                        </div>
                        <span className="count-badge">
                          {data.count} {data.count === 1 ? "record" : "records"}
                        </span>
                      </div>
                      <div className="table-toolbar">
                        <div className="search-input">
                          <Search size={16} />
                          <input
                            aria-label="Search records"
                            placeholder={
                              m.kind === "salary"
                                ? "Search employee…"
                                : "Search records…"
                            }
                            value={search}
                            onChange={(e) => {
                              setSearch(e.target.value);
                              setPage(1);
                            }}
                          />
                        </div>
                        <div className="table-filters">
                          {["production", "expense", "salary"].includes(
                            m.kind,
                          ) && (
                            <select
                              aria-label="Payment status"
                              value={status}
                              onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                              }}
                            >
                              <option value="">All statuses</option>
                              <option value="paid">Paid</option>
                              <option value="pending">Pending</option>
                            </select>
                          )}
                          {m.kind === "expense" && (
                            <select
                              aria-label="Expense category"
                              value={category}
                              onChange={(e) => {
                                setCategory(e.target.value);
                                setPage(1);
                              }}
                            >
                              <option value="">All categories</option>
                              {categories.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>
                                {m.kind === "employee" ? "EMPLOYEE" : "DATE"}
                              </th>
                              <th>
                                {m.kind === "salary"
                                  ? "EMPLOYEE"
                                  : m.kind === "employee"
                                    ? "POSITION"
                                    : "DESCRIPTION"}
                              </th>
                              <th>
                                {m.kind === "production"
                                  ? "QUANTITY"
                                  : m.kind === "salary"
                                    ? "DAYS × RATE"
                                    : m.kind === "employee"
                                      ? "CODE"
                                      : m.kind === "cashEntry"
                                        ? "SOURCE"
                                        : "CATEGORY"}
                              </th>
                              <th className="align-right">
                                {m.kind === "employee"
                                  ? "DAILY RATE"
                                  : "AMOUNT"}
                              </th>
                              <th>STATUS</th>
                              <th>
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row) => (
                              <tr key={`${row.source || ""}${row.id}`}>
                                <td>
                                  {m.kind === "employee" ? (
                                    <span className="employee-name">
                                      <span className="avatar small-avatar">
                                        {row.name?.slice(0, 2).toUpperCase()}
                                      </span>
                                      {row.name}
                                    </span>
                                  ) : (
                                    row.date?.slice(0, 10)
                                  )}
                                </td>
                                <td className="row-title">
                                  {m.kind === "salary"
                                    ? row.employee?.name
                                    : m.kind === "employee"
                                      ? row.position
                                      : row.description}
                                </td>
                                <td>
                                  {m.kind === "production"
                                    ? `${row.quantity} ${row.unit}`
                                    : m.kind === "salary"
                                      ? `${row.daysWorked} × ${formatMoney(row.dailyRate || "0")}`
                                      : m.kind === "employee"
                                        ? row.code
                                        : row.source || row.category}
                                </td>
                                <td
                                  className={`align-right amount ${row.direction === "IN" ? "positive" : ""}`}
                                >
                                  {row.direction === "IN"
                                    ? "+"
                                    : row.direction === "OUT"
                                      ? "−"
                                      : ""}
                                  {formatMoney(
                                    m.kind === "employee"
                                      ? row.dailyRate || "0"
                                      : row.amount || "0",
                                  )}
                                </td>
                                <td>
                                  <span
                                    className={`status-badge ${(m.kind === "employee" ? row.active : m.kind === "cashEntry" || row.paidOn) ? "paid" : "pending"}`}
                                  >
                                    <span />
                                    {m.kind === "employee"
                                      ? row.active
                                        ? "Active"
                                        : "Inactive"
                                      : m.kind === "cashEntry"
                                        ? row.direction === "IN"
                                          ? "Received"
                                          : "Paid"
                                        : row.paidOn
                                          ? "Paid"
                                          : "Pending"}
                                  </span>
                                </td>
                                <td>
                                  {write &&
                                  (m.kind !== "cashEntry" ||
                                    row.source === "cashEntry") ? (
                                    <details className="row-menu">
                                      <summary
                                        className="icon-btn"
                                        aria-label="Record actions"
                                      >
                                        <MoreHorizontal size={18} />
                                      </summary>
                                      <div className="dropdown">
                                        <button
                                          onClick={() => setForm({ row })}
                                        >
                                          <Pencil size={14} />
                                          Edit entry
                                        </button>
                                        {m.kind !== "employee" && (
                                          <button
                                            className="danger"
                                            onClick={() => setVoiding(row)}
                                          >
                                            <Trash2 size={14} />
                                            Void entry
                                          </button>
                                        )}
                                      </div>
                                    </details>
                                  ) : (
                                    <span className="muted">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!data.rows.length && (
                        <div className="empty-state">
                          <span className="empty-icon">
                            <ClipboardList size={25} />
                          </span>
                          <h3>
                            {search || status || category
                              ? "No matching records"
                              : "A fresh page for your business"}
                          </h3>
                          <p>
                            {search || status || category
                              ? "Try adjusting the search or filters."
                              : `No ${m.label} entries for this period. Add one to get started.`}
                          </p>
                          {write && !search && !status && !category && (
                            <button
                              className="btn primary"
                              onClick={() => setForm({})}
                            >
                              <Plus size={16} />
                              Add {m.label}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="pagination">
                        <span>
                          Showing {data.count ? (page - 1) * 20 + 1 : 0}–
                          {Math.min(page * 20, data.count)} of {data.count}
                        </span>
                        <div>
                          <button
                            className="icon-btn"
                            aria-label="Previous page"
                            disabled={page <= 1 || loading}
                            onClick={() => setPage(page - 1)}
                          >
                            <ChevronLeft size={17} />
                          </button>
                          <span>Page {page}</span>
                          <button
                            className="icon-btn"
                            aria-label="Next page"
                            disabled={page * 20 >= data.count || loading}
                            onClick={() => setPage(page + 1)}
                          >
                            <ChevronRight size={17} />
                          </button>
                        </div>
                      </div>
                    </section>
                    <div className="dashboard-footnote">
                      <ShieldCheck size={14} />
                      <span>
                        Private workspace · Earnings use entry dates. Cash flow
                        uses payment dates.
                      </span>
                      <span>
                        Unpaid: {formatMoney(t?.receivable || "0")} receivable ·{" "}
                        {formatMoney(t?.payable || "0")} payable
                      </span>
                    </div>
                  </>
                )}
                {section === "team" && (
                  <>
                    <div className="role-cards">
                      {[
                        ["Admin", "Full control, users and settings"],
                        ["Manager", "Production, employees and salaries"],
                        ["Accountant", "Expenses, salaries and cash"],
                        ["Viewer", "Read-only financial access"],
                      ].map(([r, d]) => (
                        <div className="panel" key={r}>
                          <ShieldCheck size={19} />
                          <h3>{r}</h3>
                          <p>{d}</p>
                        </div>
                      ))}
                    </div>
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Workspace members</h2>
                          <p>Role changes revoke existing sessions.</p>
                        </div>
                        <span className="count-badge">
                          {team.length} members
                        </span>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>NAME</th>
                              <th>EMAIL</th>
                              <th>ROLE</th>
                              <th>STATUS</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {team.map((u) => (
                              <tr key={u.id}>
                                <td className="row-title">{u.name}</td>
                                <td>{u.email}</td>
                                <td>
                                  <span className="role-badge capitalize">
                                    {u.role}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`status-badge ${u.active ? "paid" : "pending"}`}
                                  >
                                    {u.active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="icon-btn"
                                    aria-label={`Edit ${u.name}`}
                                    onClick={() => setUserForm(u)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </>
                )}
                {section === "settings" && (
                  <SettingsPanel data={data} onSaved={saved} />
                )}
                {section === "system" && <SystemDesign />}
              </>
            )
          )}
        </main>
        <footer className="app-footer">
          <span>© 2026 Earn</span>
          <span>Good records. Better decisions.</span>
          <span className="capitalize">{me.role} access</span>
        </footer>
      </div>
      {form && data && (
        <RecordForm
          kind={m.kind}
          row={form.row}
          day={
            period === "daily"
              ? day
              : day.startsWith(month)
                ? day
                : month + "-01"
          }
          employees={data.employees}
          onClose={() => setForm(null)}
          onSaved={saved}
        />
      )}
      {exporting && data && (
        <ExportDialog
          data={data}
          month={month}
          day={day}
          period={period}
          onClose={() => setExporting(false)}
        />
      )}
      {userForm !== undefined && (
        <UserForm
          user={userForm}
          onClose={() => setUserForm(undefined)}
          onSaved={saved}
        />
      )}
      {voiding && (
        <div className="modal-backdrop">
          <section
            className="modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="void-title"
          >
            <div className="modal-heading">
              <h2 id="void-title">Void this entry?</h2>
              <button
                className="icon-btn"
                onClick={() => setVoiding(null)}
                aria-label="Close confirmation"
              >
                <X size={19} />
              </button>
            </div>
            <p className="muted">
              This removes the entry from reports and cash balances. The
              original record stays in the audit trail.
            </p>
            <strong className="void-description">
              {voiding.description || voiding.employee?.name} ·{" "}
              {formatMoney(voiding.amount || "0")}
            </strong>
            <div className="modal-footer">
              <button
                className="btn"
                disabled={busy}
                onClick={() => setVoiding(null)}
              >
                Keep entry
              </button>
              <button
                className="btn danger-btn"
                disabled={busy}
                onClick={voidRecord}
              >
                {busy ? "Voiding…" : "Void entry"}
              </button>
            </div>
          </section>
        </div>
      )}
      {activity && data && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivity(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-title"
          >
            <div className="modal-heading">
              <h2 id="activity-title">Recent activity</h2>
              <button
                className="icon-btn"
                onClick={() => setActivity(false)}
                aria-label="Close activity"
              >
                <X size={20} />
              </button>
            </div>
            {data.audit.map((a) => (
              <div className="audit-item" key={a.id}>
                <span className="audit-dot" />
                <div>
                  <strong>{a.actorName}</strong>
                  <p>
                    {a.action.toLowerCase()} · {a.entity}
                  </p>
                </div>
                <small>{new Date(a.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function SettingsPanel({
  data,
  onSaved,
}: {
  data: WorkspaceData;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(e.currentTarget)),
          updatedAt: data.workspace.updatedAt,
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
    <div className="settings-grid">
      <form className="panel settings-panel" onSubmit={save}>
        <h2>Workspace details</h2>
        <p className="muted">
          Your business information and cash starting point.
        </p>
        <label>
          Workspace name
          <input
            name="name"
            defaultValue={data.workspace.name}
            required
            maxLength={80}
          />
        </label>
        <label>
          Opening cash balance ($)
          <input
            name="openingCash"
            type="number"
            step="0.01"
            defaultValue={data.workspace.openingCash}
            required
          />
        </label>
        <p className="field-help">
          Changing the opening balance recalculates all historical cash
          balances. The change is recorded in the audit trail.
        </p>
        <div className="form-grid">
          <label>
            Currency
            <input value="USD — US Dollar" readOnly />
          </label>
          <label>
            Business timezone
            <input value="Asia/Dhaka" readOnly />
          </label>
        </div>
        <label>
          Opening date
          <input value={data.workspace.openingDate.slice(0, 10)} readOnly />
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </form>
      <div className="panel settings-panel">
        <h2>How the numbers work</h2>
        <div className="explanation">
          <strong>Production earnings</strong>
          <p>Quantity × unit rate, rounded per entry.</p>
          <strong>Daily salaries</strong>
          <p>
            Days worked × daily rate. One entry per employee per day; fractional
            days are supported.
          </p>
          <strong>Net earnings</strong>
          <p>Production earnings − operating expenses − salaries.</p>
          <strong>Closing cash</strong>
          <p>
            Opening cash + actual receipts − actual payments. Owner adjustments
            affect cash only.
          </p>
        </div>
      </div>
    </div>
  );
}
function UserForm({
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
function SystemDesign() {
  return (
    <div className="system-design">
      <div className="panel architecture-panel">
        <span className="eyebrow">HIGH-LEVEL SYSTEM DESIGN</span>
        <h2>One workspace. Clear boundaries.</h2>
        <p className="muted">
          A modular Next.js application with a single source of truth in Neon
          PostgreSQL.
        </p>
        <div className="architecture-flow">
          {[
            [
              "01",
              "Presentation",
              "Responsive dashboard · light/dark theme · report preview",
            ],
            [
              "02",
              "Application & access",
              "Better Auth sessions → server-side role checks → validated requests",
            ],
            [
              "03",
              "Business services",
              "Production · salaries · expenses · cash flow · reporting",
            ],
            [
              "04",
              "Persistence",
              "Prisma ORM → Neon PostgreSQL · atomic writes + audit log",
            ],
            [
              "05",
              "Delivery",
              "Vercel Node.js functions · private PDF streaming",
            ],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <section>
                <h3>{t}</h3>
                <p>{d}</p>
              </section>
              <ArrowRight size={20} />
            </div>
          ))}
        </div>
      </div>
      <div className="role-cards">
        {[
          [
            "Exact money",
            "Decimal storage and per-entry rounding avoid floating-point totals.",
          ],
          [
            "Real access control",
            "Every private API checks the current session, role and active status.",
          ],
          [
            "Traceable records",
            "Financial records are voided rather than deleted. Changes and audit logs commit together.",
          ],
          [
            "Consistent reporting",
            "Daily and monthly aggregates use a consistent database snapshot.",
          ],
        ].map(([t, d]) => (
          <section className="panel" key={t}>
            <ShieldCheck size={20} />
            <h3>{t}</h3>
            <p>{d}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
