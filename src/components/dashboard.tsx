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
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronRight,
  ChartNoAxesCombined,
  ClipboardList,
  Code2,
  Coins,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SunMoon,
  Wallet,
  X,
} from "lucide-react";
import { canExport, canWrite, type Kind } from "@/lib/permissions";
import { formatMoney } from "@/lib/finance";
import { today } from "@/lib/validation";
import type { RecordRow, User, WorkspaceData } from "@/lib/client-types";
import type { SortKey, SortDirection } from "@/lib/table-options";
import { RecordForm } from "./record-form";
import { RecordsTable } from "./records-table";
import { ExportDialog } from "./export-dialog";
import { UserForm } from "./user-form";
const authClient = createAuthClient();
const meta: Record<string, { title: string; subtitle: string; kind: Kind }> = {
  dashboard: {
    title: "Daily overview",
    subtitle: "Your daily totals, all in one place.",
    kind: "production",
  },
  production: {
    title: "Production earnings",
    subtitle:
      "Date, daily production, and total earn. Nothing more to fill in.",
    kind: "production",
  },
  salaries: {
    title: "Salary",
    subtitle: "Enter the final salary total for each day.",
    kind: "salary",
  },
  cashflow: {
    title: "Cash flow expenses",
    subtitle: "Enter the total money paid out for expenses each day.",
    kind: "cashflow",
  },
  "reports/daily": {
    title: "Daily report",
    subtitle: "A simple summary of one day’s earnings and costs.",
    kind: "production",
  },
  "reports/monthly": {
    title: "Monthly summary",
    subtitle: "Your daily totals, added up for the month.",
    kind: "production",
  },
  team: {
    title: "Users & roles",
    subtitle: "Choose who can view and update your records.",
    kind: "production",
  },
  settings: {
    title: "Workspace settings",
    subtitle: "Keep your workspace details simple.",
    kind: "production",
  },
  system: {
    title: "Simple system design",
    subtitle: "Three daily record types, with secure login and reporting.",
    kind: "production",
  },
};
const nav = [
  { href: "dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "production", label: "Production", icon: Package },
  { href: "salaries", label: "Salary", icon: Coins },
  { href: "cashflow", label: "Cash flow expenses", icon: Wallet },
];
const kindLabel: Record<Kind, string> = {
  production: "production",
  salary: "salary",
  cashflow: "cash flow expense",
};
export function Dashboard({ section, user }: { section: string; user: User }) {
  const router = useRouter(),
    m = meta[section];
  const reportView = section.startsWith("reports");
  const management = ["team", "settings", "system"].includes(section);
  const [recordKind, setRecordKind] = useState<Kind>(m.kind);
  const kind = recordKind,
    label = kindLabel[kind];
  const [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [month, setMonth] = useState(() => today().slice(0, 7)),
    [day, setDay] = useState(today),
    [period, setPeriod] = useState(
      section === "reports/daily" ? "daily" : "monthly",
    );
  const [filterDate, setFilterDate] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(20),
    [sort, setSort] = useState<SortKey>("date"),
    [direction, setDirection] = useState<SortDirection>("desc");
  const [data, setData] = useState<WorkspaceData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [toast, setToast] = useState("");
  const [form, setForm] = useState<{ row?: RecordRow } | null>(null),
    [exporting, setExporting] = useState(false),
    [voiding, setVoiding] = useState<RecordRow | null>(null),
    [busy, setBusy] = useState(false),
    [activity, setActivity] = useState(false),
    [team, setTeam] = useState<User[]>([]),
    [userForm, setUserForm] = useState<User | null | undefined>(undefined);
  const requestRef = useRef(0),
    summaryRef = useRef("");
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const controller = new AbortController(),
      n = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const key = `${period}/${month}/${day}`,
          q = new URLSearchParams({
            period,
            month,
            day,
            kind,
            date: filterDate,
            page: String(page),
            pageSize: String(pageSize),
            sort,
            direction,
            summary: summaryRef.current === key ? "0" : "1",
          });
        const response = await fetch(`/api/workspace?${q}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          payload = await response.json();
        if (response.status === 401 || response.status === 403) {
          router.push("/login");
          return;
        }
        if (!response.ok) throw new Error(payload.error);
        if (n === requestRef.current) {
          setData((previous) => ({ ...previous, ...payload }));
          if (payload.totals) summaryRef.current = key;
        }
        if (section === "team") {
          const response = await fetch("/api/team", {
            signal: controller.signal,
          });
          if (response.ok) setTeam(await response.json());
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    period,
    month,
    day,
    kind,
    filterDate,
    page,
    pageSize,
    sort,
    direction,
    revision,
    section,
    router,
  ]);
  function refresh() {
    summaryRef.current = "";
    setRevision((v) => v + 1);
  }
  function saved() {
    setForm(null);
    setUserForm(undefined);
    setToast("Saved. Your daily totals are up to date.");
    refresh();
  }
  function chooseKind(next: Kind) {
    setRecordKind(next);
    setSort("date");
    setDirection("desc");
    setPage(1);
    setFilterDate("");
    setData((previous) =>
      previous ? { ...previous, rows: [], count: 0 } : null,
    );
  }
  async function logout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }
  async function voidRecord() {
    if (!voiding) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/records/${kind}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: voiding.id,
            updatedAt: voiding.updatedAt,
          }),
        }),
        payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setVoiding(null);
      setToast("Daily record removed from totals. History is retained.");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to void record.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!(form || exporting || voiding || activity || userForm !== undefined))
      return;
    const previous = document.activeElement as HTMLElement | null,
      modal = document.querySelector<HTMLElement>('[aria-modal="true"]');
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
        setVoiding(null);
        setActivity(false);
        setUserForm(undefined);
      }
      if (e.key !== "Tab") return;
      const list = elements();
      if (e.shiftKey && document.activeElement === list[0]) {
        e.preventDefault();
        list.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
        e.preventDefault();
        list[0]?.focus();
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [form, exporting, voiding, activity, userForm, busy]);
  const me = data?.user || user,
    write = canWrite(me.role, kind),
    t = data?.totals;
  return (
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
    >
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Link className="logo" href="/dashboard">
            <span className="logo-icon">e</span>
            <span className="brand-name">
              earn<span className="accent">.</span>
            </span>
          </Link>
          <button
            className="icon-btn collapse-button"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={17} />
          </button>
          <button
            className="icon-btn mobile-close"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-badge">
          <span className="workspace-avatar">
            {(data?.workspace.name || "E").slice(0, 1)}
          </span>
          <div>
            <strong>{data?.workspace.name || "Earn Workspace"}</strong>
            <small>Simple daily records</small>
          </div>
        </div>
        <span className="nav-label">DAILY RECORDS</span>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              className={`nav-item ${section === n.href ? "active" : ""}`}
              href={`/${n.href}`}
              key={n.href}
              title={n.label}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
            </Link>
          ))}
          <details className="nav-group" open={reportView || undefined}>
            <summary className="nav-item">
              <FileText size={18} />
              <span>Reports</span>
              <ChevronDown size={14} />
            </summary>
            <div className="submenu">
              <Link
                className={section === "reports/daily" ? "active" : ""}
                href="/reports/daily"
              >
                Daily report
              </Link>
              <Link
                className={section === "reports/monthly" ? "active" : ""}
                href="/reports/monthly"
              >
                Monthly summary
              </Link>
            </div>
          </details>
        </nav>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Management navigation">
          {me.role === "admin" && (
            <>
              <Link
                className={`nav-item ${section === "team" ? "active" : ""}`}
                href="/team"
              >
                <ShieldCheck size={18} />
                <span>Users & roles</span>
              </Link>
              <Link
                className={`nav-item ${section === "settings" ? "active" : ""}`}
                href="/settings"
              >
                <Settings2 size={18} />
                <span>Settings</span>
              </Link>
            </>
          )}
          <Link
            className={`nav-item ${section === "system" ? "active" : ""}`}
            href="/system"
          >
            <Code2 size={18} />
            <span>How it works</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">✦</span>
            <strong>Just the daily totals.</strong>
            <p>
              Add one record per day. Your monthly summary takes care of itself.
            </p>
          </div>
          <div className="sidebar-person">
            <span className="avatar">{me.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{me.name}</strong>
              <small className="capitalize">{me.role}</small>
            </div>
            <button className="icon-btn" aria-label="Sign out" onClick={logout}>
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
              <span className="live-dot" /> BDT workspace
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
                <button onClick={logout}>
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                <span className="live-dot" /> SIMPLE DAILY RECORDS
              </div>
              <h1>{m.title}</h1>
              <p>{m.subtitle}</p>
            </div>
            <div className="heading-actions">
              {!management && canExport(me.role) && (
                <button
                  className="btn"
                  onClick={() => setExporting(true)}
                  disabled={!data || loading}
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
                  <Plus size={17} />
                  Add user
                </button>
              ) : (
                !management &&
                write && (
                  <button
                    className="btn primary"
                    onClick={() => setForm({})}
                    disabled={!data || loading}
                  >
                    <Plus size={17} />
                    Add {label}
                  </button>
                )
              )}
            </div>
          </div>
          {!management && (
            <div className="period-toolbar">
              <div className="segmented">
                <button
                  className={period === "monthly" ? "selected" : ""}
                  onClick={() => {
                    setPeriod("monthly");
                    setPage(1);
                    setFilterDate("");
                  }}
                >
                  Monthly
                </button>
                <button
                  className={period === "daily" ? "selected" : ""}
                  onClick={() => {
                    setPeriod("daily");
                    setPage(1);
                    setFilterDate("");
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
                    setFilterDate("");
                  }}
                />
              </label>
              <span className="toolbar-note">
                {data?.period.label || "Choose a period"} · ৳
              </span>
              <button
                className="icon-btn"
                aria-label="Refresh dashboard"
                onClick={refresh}
                disabled={loading}
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
          {!data && loading ? (
            <div className="loading-state">
              <RefreshCw size={25} className="spin" />
              <h3>Loading your daily totals…</h3>
            </div>
          ) : (
            data && (
              <>
                {!management && (
                  <>
                    <div className="metric-grid">
                      {[
                        [
                          "Total Earn",
                          t?.totalEarn,
                          Package,
                          `${t?.dailyProduction || 0} daily production`,
                        ],
                        [
                          "Net Salary",
                          t?.netSalary,
                          Coins,
                          `${t?.salaryDays || 0} daily records`,
                        ],
                        [
                          "Cash Flow Expenses",
                          t?.netAmount,
                          Wallet,
                          `${t?.cashflowDays || 0} daily records`,
                        ],
                        [
                          "Net Balance",
                          t?.netBalance,
                          ChartNoAxesCombined,
                          "Earn − salary − expenses",
                        ],
                      ].map(([title, value, Icon, note], i) => {
                        const Glyph = Icon as typeof Wallet;
                        return (
                          <article
                            className={`metric-card ${i === 3 ? "featured" : ""}`}
                            key={String(title)}
                          >
                            <div className="metric-top">
                              <span>{String(title)}</span>
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
                      <section className="panel simple-trend">
                        <div className="panel-heading">
                          <div>
                            <h2>Earnings & costs</h2>
                            <p>Costs are net salary plus cash flow expenses.</p>
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
                                left: 0,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                vertical={false}
                                stroke="var(--line)"
                                strokeDasharray="4 5"
                              />
                              <XAxis
                                dataKey="day"
                                tickFormatter={(v) => String(v).slice(8)}
                                tick={{ fill: "var(--muted)", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={22}
                              />
                              <YAxis
                                tickFormatter={(v) =>
                                  `৳${v >= 1000 ? `${v / 1000}k` : v}`
                                }
                                tick={{ fill: "var(--muted)", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                formatter={(v) => formatMoney(Number(v))}
                                contentStyle={{
                                  background: "var(--panel)",
                                  border: "1px solid var(--line)",
                                  borderRadius: 8,
                                }}
                              />
                              <Area
                                dataKey="revenue"
                                name="Total Earn"
                                stroke="#34bd97"
                                fill="#34bd9715"
                                strokeWidth={2}
                                isAnimationActive={false}
                              />
                              <Area
                                dataKey="costs"
                                name="Total Costs"
                                stroke="#8d9dec"
                                fill="transparent"
                                strokeWidth={2}
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                    )}
                    <section className="panel records-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            {kind === "production"
                              ? "Production records"
                              : kind === "salary"
                                ? "Salary records"
                                : "Cash flow expense records"}
                          </h2>
                          <p>
                            {kind === "production"
                              ? "Date · Daily Production · Total Earn"
                              : kind === "salary"
                                ? "Date · Net Salary"
                                : "Date · Net Amount"}
                          </p>
                        </div>
                        <span className="count-badge">One total per date</span>
                      </div>
                      {(section === "dashboard" || reportView) && (
                        <div
                          className="record-tabs"
                          role="tablist"
                          aria-label="Daily record type"
                        >
                          {(["production", "salary", "cashflow"] as Kind[]).map(
                            (k) => (
                              <button
                                role="tab"
                                key={k}
                                aria-selected={kind === k}
                                className={kind === k ? "selected" : ""}
                                onClick={() => chooseKind(k)}
                              >
                                {k === "production"
                                  ? "Production"
                                  : k === "salary"
                                    ? "Salary"
                                    : "Cash flow expenses"}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                      <RecordsTable
                        kind={kind}
                        label={label}
                        data={data}
                        loading={loading}
                        write={write}
                        filterDate={filterDate}
                        pageSize={pageSize}
                        sort={sort}
                        direction={direction}
                        onDate={(v) => {
                          setFilterDate(v);
                          setPage(1);
                        }}
                        onPage={setPage}
                        onPageSize={(v) => {
                          setPageSize(v);
                          setPage(1);
                        }}
                        onSort={(key, dir) => {
                          setSort(key);
                          setDirection(
                            dir ||
                              (sort === key && direction === "asc"
                                ? "desc"
                                : "asc"),
                          );
                          setPage(1);
                        }}
                        onAdd={() => setForm({})}
                        onEdit={(row) => setForm({ row })}
                        onVoid={setVoiding}
                      />
                    </section>
                    <p className="simple-footer-note">
                      Net Balance = Total Earn − Net Salary − Cash Flow
                      Expenses. All amounts are in ৳.
                    </p>
                  </>
                )}
                {section === "team" && (
                  <>
                    <div className="role-cards">
                      {[
                        ["Admin", "All records, users and settings"],
                        ["Manager", "Production and salary"],
                        ["Accountant", "Salary and cash flow expenses"],
                        ["Viewer", "Read-only reports"],
                      ].map(([r, n]) => (
                        <div className="panel" key={r}>
                          <ShieldCheck size={19} />
                          <h3>{r}</h3>
                          <p>{n}</p>
                        </div>
                      ))}
                    </div>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>Workspace members</h2>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.map((u) => (
                              <tr key={u.id}>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td className="capitalize">{u.role}</td>
                                <td>{u.active ? "Active" : "Inactive"}</td>
                                <td>
                                  <button
                                    className="btn"
                                    onClick={() => setUserForm(u)}
                                  >
                                    Edit member
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
          <span>Three simple daily records.</span>
          <span className="capitalize">{me.role} access</span>
        </footer>
      </div>
      {form && data && (
        <RecordForm
          kind={kind}
          row={form.row}
          day={
            period === "daily"
              ? day
              : day.startsWith(month)
                ? day
                : month + "-01"
          }
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
              <h2 id="void-title">Void this daily record?</h2>
              <button
                className="icon-btn"
                aria-label="Close confirmation"
                onClick={() => setVoiding(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="muted">
              The daily record will be excluded from reports. Its history is
              retained.
            </p>
            <strong className="void-description">
              {voiding.date.slice(0, 10)} ·{" "}
              {formatMoney(
                voiding.totalEarn ||
                  voiding.netSalary ||
                  voiding.netAmount ||
                  "0",
              )}
            </strong>
            <div className="modal-footer">
              <button
                className="btn"
                onClick={() => setVoiding(null)}
                disabled={busy}
              >
                Keep record
              </button>
              <button
                className="btn danger-btn"
                onClick={voidRecord}
                disabled={busy}
              >
                {busy ? "Voiding…" : "Void record"}
              </button>
            </div>
          </section>
        </div>
      )}
      {activity && data && (
        <div className="modal-backdrop">
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
                aria-label="Close activity"
                onClick={() => setActivity(false)}
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
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...Object.fromEntries(new FormData(e.currentTarget)),
            updatedAt: data.workspace.updatedAt,
          }),
        }),
        payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
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
          Currency
          <input value="BDT — Bangladeshi Taka (৳)" readOnly />
        </label>
        <label>
          Business timezone
          <input value="Asia/Dhaka" readOnly />
        </label>
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
      <section className="panel settings-panel">
        <h2>How the totals work</h2>
        <div className="explanation">
          <strong>Production</strong>
          <p>Enter daily production and the final Total Earn directly.</p>
          <strong>Salary</strong>
          <p>Enter one Net Salary total per date.</p>
          <strong>Cash flow expenses</strong>
          <p>Enter one Net Amount for money paid out per date.</p>
          <strong>Monthly summary</strong>
          <p>
            The app adds up the daily records. Net Balance is Total Earn minus
            Net Salary and Cash Flow Expenses.
          </p>
        </div>
      </section>
    </div>
  );
}
function SystemDesign() {
  return (
    <section className="panel architecture-panel">
      <span className="eyebrow">SIMPLE APPLICATION DESIGN</span>
      <h2>Three daily record types.</h2>
      <div className="architecture-flow">
        {[
          ["01", "Salary", "Date · Net Salary"],
          ["02", "Cashflow", "Date · Net Amount (expenses only)"],
          ["03", "Production", "Date · Daily Production · Total Earn"],
        ].map(([n, t, d]) => (
          <div key={n}>
            <span>{n}</span>
            <section>
              <h3>{t}</h3>
              <p>{d}</p>
            </section>
          </div>
        ))}
      </div>
      <p className="simple-footer-note">
        Next.js → server permissions and validation → Prisma → Neon PostgreSQL.
        Daily and monthly reports use the same totals. Better Auth handles
        login.
      </p>
    </section>
  );
}
