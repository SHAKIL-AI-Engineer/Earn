"use client";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { Kind } from "@/lib/permissions";
import type { RecordRow, WorkspaceData } from "@/lib/client-types";
import type { SortKey, SortDirection } from "@/lib/table-options";
import { formatMoney } from "@/lib/finance";
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
export function RecordsTable({
  kind,
  label,
  data,
  loading,
  write,
  filterDate,
  pageSize,
  sort,
  direction,
  onDate,
  onPage,
  onPageSize,
  onSort,
  onAdd,
  onEdit,
  onVoid,
}: {
  kind: Kind;
  label: string;
  data: WorkspaceData;
  loading: boolean;
  write: boolean;
  filterDate: string;
  pageSize: number;
  sort: SortKey;
  direction: SortDirection;
  onDate: (v: string) => void;
  onPage: (v: number) => void;
  onPageSize: (v: number) => void;
  onSort: (key: SortKey, direction?: SortDirection) => void;
  onAdd: () => void;
  onEdit: (r: RecordRow) => void;
  onVoid: (r: RecordRow) => void;
}) {
  const [compact, setCompact] = useState(false);
  const amountTitle =
    kind === "production"
      ? "Total Earn"
      : kind === "salary"
        ? "Net Salary"
        : "Net Amount";
  const pages = Math.max(1, Math.ceil(data.count / pageSize));
  function header(title: string, key: SortKey) {
    const active = sort === key,
      Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        scope="col"
        aria-sort={
          active ? (direction === "asc" ? "ascending" : "descending") : "none"
        }
      >
        <button
          className="sort-button"
          onClick={() => onSort(key)}
          disabled={loading}
        >
          {title}
          <Icon size={13} />
        </button>
      </th>
    );
  }
  return (
    <div
      className={`records-table simple-records ${compact ? "density-compact" : ""}`}
      aria-busy={loading}
    >
      <div className="table-toolbar">
        <label className="daily-date-filter">
          Filter by date
          <input
            type="date"
            aria-label="Filter by date"
            value={filterDate}
            onChange={(e) => onDate(e.target.value)}
          />
        </label>
        {filterDate && (
          <button className="btn" onClick={() => onDate("")}>
            <X size={13} />
            Clear date
          </button>
        )}
        <span className="table-spacer" />
        <select
          className="mobile-sort"
          aria-label="Sort records"
          value={`${sort}:${direction}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":");
            onSort(key as SortKey, dir as SortDirection);
          }}
        >
          <option value="date:desc">Newest first</option>
          <option value="date:asc">Oldest first</option>
          <option value="amount:desc">Highest amount</option>
          <option value="amount:asc">Lowest amount</option>
          {kind === "production" && (
            <>
              <option value="dailyProduction:desc">Highest production</option>
              <option value="dailyProduction:asc">Lowest production</option>
            </>
          )}
        </select>
        <button
          className="icon-btn density-toggle"
          aria-label={compact ? "Use comfortable rows" : "Use compact rows"}
          aria-pressed={compact}
          onClick={() => setCompact(!compact)}
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>
      <div className="table-context">
        <span>
          {data.count} daily {data.count === 1 ? "record" : "records"}
        </span>
        <span>Amounts in ৳</span>
      </div>
      <div
        className="table-scroll optimized-scroll"
        role="region"
        tabIndex={0}
        aria-label={`${label} records`}
      >
        <table className="optimized-table simple-table">
          <caption className="sr-only">
            {label} daily totals in Bangladeshi taka.
          </caption>
          <thead>
            <tr>
              {header("Date", "date")}
              {kind === "production" &&
                header("Daily Production", "dailyProduction")}
              {header(amountTitle, "amount")}
              <th scope="col" className="row-actions-cell">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Date" className="date-cell">
                  {dateFormatter.format(new Date(row.date))}
                </td>
                {kind === "production" && (
                  <td data-label="Daily Production">
                    {Number(row.dailyProduction).toLocaleString("en-BD")}
                  </td>
                )}
                <td data-label={amountTitle} className="align-right amount">
                  {formatMoney(
                    kind === "production"
                      ? row.totalEarn || "0"
                      : kind === "salary"
                        ? row.netSalary || "0"
                        : row.netAmount || "0",
                  )}
                </td>
                <td data-label="Actions" className="row-actions-cell">
                  {write ? (
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Edit entry"
                        aria-label={`Edit ${row.date.slice(0, 10)}`}
                        onClick={() => onEdit(row)}
                        disabled={loading}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Void entry"
                        aria-label={`Void ${row.date.slice(0, 10)}`}
                        onClick={() => onVoid(row)}
                        disabled={loading}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <span className="row-readonly">View only</span>
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
            <ClipboardList size={24} />
          </span>
          <h3>No daily records yet</h3>
          <p>
            {filterDate
              ? "Clear the date filter or choose another date."
              : `Add your first ${label} total for this period.`}
          </p>
          {write && (
            <button className="btn primary" onClick={onAdd}>
              <Plus size={16} />
              Add {label}
            </button>
          )}
        </div>
      )}
      <div className="pagination enhanced-pagination">
        <div className="pagination-summary">
          <span>
            {data.count
              ? `${(data.page - 1) * pageSize + 1}–${Math.min(data.page * pageSize, data.count)}`
              : "0"}{" "}
            of <strong>{data.count}</strong>
          </span>
          <label className="page-size-control">
            Rows
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              disabled={loading}
            >
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="pagination-controls">
          <button
            className="icon-btn"
            aria-label="Previous page"
            disabled={data.page <= 1 || loading}
            onClick={() => onPage(data.page - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Page {data.page} of {pages}
          </span>
          <button
            className="icon-btn"
            aria-label="Next page"
            disabled={data.page >= pages || loading}
            onClick={() => onPage(data.page + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
