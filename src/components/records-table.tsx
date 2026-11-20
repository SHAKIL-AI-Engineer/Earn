"use client";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ListFilter,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { Kind } from "@/lib/permissions";
import type { RecordRow, WorkspaceData } from "@/lib/client-types";
import type { SortKey, SortDirection } from "@/lib/table-options";
import { formatMoney } from "@/lib/finance";
import { categories } from "@/lib/validation";
const sourceLabel: Record<string, string> = {
  production: "Production",
  expense: "Expense",
  salary: "Salary",
  cashEntry: "Adjustment",
};
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const displayDate = (date?: string) =>
  date ? dateFormatter.format(new Date(date)) : "—";
export function RecordsTable({
  kind,
  label,
  data,
  loading,
  write,
  search,
  status,
  category,
  page,
  pageSize,
  sort,
  direction,
  onSearch,
  onStatus,
  onCategory,
  onPage,
  onPageSize,
  onSort,
  onClear,
  onAdd,
  onEdit,
  onVoid,
}: {
  kind: Kind;
  label: string;
  data: WorkspaceData;
  loading: boolean;
  write: boolean;
  search: string;
  status: string;
  category: string;
  page: number;
  pageSize: number;
  sort: SortKey;
  direction: SortDirection;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onCategory: (value: string) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onSort: (key: SortKey, direction?: SortDirection) => void;
  onClear: () => void;
  onAdd: () => void;
  onEdit: (row: RecordRow) => void;
  onVoid: (row: RecordRow) => void;
}) {
  const [compact, setCompact] = useState(false);
  const filtered = Boolean(search || status || category);
  const pages = Math.max(1, Math.ceil(data.count / pageSize));
  const effectivePage = data.page || page;
  const firstTitle = kind === "employee" ? "Employee" : "Date";
  const mainTitle =
    kind === "salary"
      ? "Employee"
      : kind === "employee"
        ? "Position"
        : "Description";
  const detailTitle =
    kind === "production"
      ? "Quantity"
      : kind === "salary"
        ? "Days × rate"
        : kind === "employee"
          ? "Code"
          : kind === "cashEntry"
            ? "Source"
            : "Category";
  function heading(title: string, key: SortKey, align = false) {
    const selected = sort === key;
    const Icon = selected
      ? direction === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;
    return (
      <th
        scope="col"
        className={align ? "align-right" : ""}
        aria-sort={
          selected ? (direction === "asc" ? "ascending" : "descending") : "none"
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
      className={`records-table ${compact ? "density-compact" : ""}`}
      aria-busy={loading}
    >
      <div className="table-toolbar">
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label="Search records"
            placeholder={
              kind === "salary" || kind === "employee"
                ? "Search people…"
                : "Search descriptions…"
            }
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && (
            <button
              className="icon-btn search-clear"
              onClick={() => onSearch("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="table-filters">
          {["production", "expense", "salary"].includes(kind) && (
            <select
              aria-label="Payment status"
              value={status}
              onChange={(e) => onStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="paid">
                {kind === "production" ? "Received" : "Paid"}
              </option>
              <option value="pending">Pending</option>
            </select>
          )}
          {kind === "expense" && (
            <select
              aria-label="Expense category"
              value={category}
              onChange={(e) => onCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
          {filtered && (
            <button className="btn clear-filters" onClick={onClear}>
              <X size={13} />
              Clear filters
            </button>
          )}
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
            <option value="label:asc">Name A–Z</option>
            <option value="label:desc">Name Z–A</option>
          </select>
          <button
            className="icon-btn density-toggle"
            aria-label={compact ? "Use comfortable rows" : "Use compact rows"}
            aria-pressed={compact}
            title="Toggle row spacing"
            onClick={() => setCompact(!compact)}
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </div>
      <div className="table-context">
        <span>
          <ListFilter size={13} />
          {data.count} {filtered ? "matching " : ""}
          {data.count === 1 ? "record" : "records"}
        </span>
        <span>Amounts in ৳ · {compact ? "Compact" : "Comfortable"}</span>
      </div>
      <div
        className="table-scroll optimized-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${label} records`}
      >
        <table className="optimized-table">
          <caption className="sr-only">
            {label} records. Amounts in Bangladeshi taka. Use column buttons to
            sort all matching records.
          </caption>
          <thead>
            <tr>
              {kind === "employee"
                ? heading(firstTitle, "label")
                : heading(firstTitle, "date")}
              {kind === "employee" ? (
                <th scope="col">{mainTitle}</th>
              ) : (
                heading(mainTitle, "label")
              )}
              <th scope="col">{detailTitle}</th>
              {heading(
                kind === "employee" ? "Daily rate" : "Amount",
                "amount",
                true,
              )}
              <th scope="col">Status</th>
              <th className="row-actions-cell" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const editable =
                write && (kind !== "cashEntry" || row.source === "cashEntry");
              const paid =
                kind === "employee"
                  ? row.active
                  : kind === "cashEntry" || Boolean(row.paidOn);
              const statusText =
                kind === "employee"
                  ? row.active
                    ? "Active"
                    : "Inactive"
                  : kind === "cashEntry"
                    ? row.direction === "IN"
                      ? "Received"
                      : "Paid"
                    : row.paidOn
                      ? kind === "production"
                        ? "Received"
                        : "Paid"
                      : "Pending";
              const title =
                kind === "salary"
                  ? row.employee?.name
                  : kind === "employee"
                    ? row.position
                    : row.description;
              return (
                <tr key={`${row.source || ""}${row.id}`}>
                  <td
                    data-label={firstTitle}
                    className={
                      kind === "employee" ? "employee-cell" : "date-cell"
                    }
                  >
                    {kind === "employee" ? (
                      <span className="employee-name">
                        <span className="avatar small-avatar">
                          {row.name?.slice(0, 2).toUpperCase()}
                        </span>
                        <strong>{row.name}</strong>
                      </span>
                    ) : (
                      displayDate(row.date)
                    )}
                  </td>
                  <td data-label={mainTitle} className="row-title">
                    <div className="record-description">
                      <strong title={title}>{title}</strong>
                      {row.notes && (
                        <small title={row.notes}>{row.notes}</small>
                      )}
                    </div>
                  </td>
                  <td data-label={detailTitle} className="record-detail">
                    {kind === "production"
                      ? `${Number(row.quantity).toLocaleString("en-BD")} ${row.unit}`
                      : kind === "salary"
                        ? `${row.daysWorked} × ${formatMoney(row.dailyRate || "0")}`
                        : kind === "employee"
                          ? row.code
                          : kind === "cashEntry"
                            ? sourceLabel[row.source || ""] || "Adjustment"
                            : row.category}
                  </td>
                  <td
                    data-label={kind === "employee" ? "Daily rate" : "Amount"}
                    className={`align-right amount ${row.direction === "IN" ? "positive" : ""}`}
                  >
                    {row.direction === "IN"
                      ? "+ "
                      : row.direction === "OUT"
                        ? "− "
                        : ""}
                    {formatMoney(
                      kind === "employee"
                        ? row.dailyRate || "0"
                        : row.amount || "0",
                    )}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`status-badge ${paid ? "paid" : "pending"}`}
                    >
                      <span />
                      {statusText}
                    </span>
                    {row.paidOn && (
                      <small className="payment-date">
                        {displayDate(row.paidOn)}
                      </small>
                    )}
                  </td>
                  <td className="row-actions-cell" data-label="Actions">
                    {editable ? (
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          aria-label={`Edit ${row.description || row.name || row.employee?.name || "entry"}`}
                          title="Edit entry"
                          disabled={loading}
                          onClick={() => onEdit(row)}
                        >
                          <Pencil size={15} />
                        </button>
                        {kind !== "employee" && (
                          <button
                            className="icon-btn danger"
                            aria-label={`Void ${row.description || row.employee?.name || "entry"}`}
                            title="Void entry"
                            disabled={loading}
                            onClick={() => onVoid(row)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="row-readonly">
                        {kind === "cashEntry" ? "From ledger" : "View only"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!data.rows.length && (
        <div className="empty-state">
          <span className="empty-icon">
            <ClipboardList size={25} />
          </span>
          <h3>
            {filtered
              ? "No records match your filters"
              : "Ready for your first entry"}
          </h3>
          <p>
            {filtered
              ? "Try another search or clear your filters."
              : `Add a ${label} entry to start building your records.`}
          </p>
          {filtered ? (
            <button className="btn" onClick={onClear}>
              Clear all filters
            </button>
          ) : (
            write && (
              <button className="btn primary" onClick={onAdd}>
                <Plus size={16} />
                Add {label}
              </button>
            )
          )}
        </div>
      )}
      <div className="pagination enhanced-pagination">
        <div className="pagination-summary">
          <span aria-live="polite">
            {data.count
              ? `${(effectivePage - 1) * pageSize + 1}–${Math.min(effectivePage * pageSize, data.count)}`
              : "0"}{" "}
            of <strong>{data.count}</strong>
          </span>
          <label className="page-size-control">
            <span>Rows</span>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              disabled={loading}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="pagination-controls">
          <button
            className="icon-btn"
            aria-label="Previous page"
            disabled={effectivePage <= 1 || loading}
            onClick={() => onPage(effectivePage - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Page <strong>{effectivePage}</strong> of {pages}
          </span>
          <button
            className="icon-btn"
            aria-label="Next page"
            disabled={effectivePage >= pages || loading}
            onClick={() => onPage(effectivePage + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
