"use client";

import { useState, useEffect, useCallback } from "react";
import { getExpenses, addExpense, updateExpense, deleteExpense, importExpenses, exportToCSV } from "@/lib/storage";
import { parseCSV } from "@/lib/csv";
import type { Expense, Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food",
  entertainment: "Entertainment",
  transportation: "Transportation",
  groceries: "Groceries",
  shopping: "Shopping",
  others: "Others",
  sports: "Sports",
  necessities: "Necessities",
  travelling: "Travelling",
  sasha: "Sasha",
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-HK", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** YYYY-MM-DD for grouping by calendar day */
function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00");
  const today = new Date();
  const todayKey = toDateKey(today.toISOString());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday.toISOString());
  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

/** Group expenses by calendar day (newest first), with daily totals */
function groupExpensesByDay(expenses: Expense[]): { dateKey: string; label: string; total: number; items: Expense[] }[] {
  const byDay = new Map<string, Expense[]>();
  for (const ex of expenses) {
    const key = toDateKey(ex.createdAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ex);
  }
  const keys = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));
  return keys.map((dateKey) => {
    const items = byDay.get(dateKey)!;
    const total = items.reduce((sum, ex) => sum + ex.amount, 0);
    return { dateKey, label: getDayLabel(dateKey), total, items };
  });
}

type Period = "day" | "week" | "month";

function getPeriodKey(iso: string, period: Period): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (period === "day") return `${y}-${m}-${day}`;
  if (period === "month") return `${y}-${m}`;
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const sy = start.getFullYear();
  const sm = String(start.getMonth() + 1).padStart(2, "0");
  const sd = String(start.getDate()).padStart(2, "0");
  return `${sy}-${sm}-${sd}`;
}

function groupByPeriod(
  expenses: Expense[],
  period: Period
): { key: string; label: string; total: number; byCategory: Record<Category, number> }[] {
  const byKey = new Map<string, { total: number; byCategory: Record<Category, number> }>();
  const catZero = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;

  for (const ex of expenses) {
    const key = getPeriodKey(ex.createdAt, period);
    if (!byKey.has(key)) byKey.set(key, { total: 0, byCategory: { ...catZero } });
    const entry = byKey.get(key)!;
    entry.total += ex.amount;
    entry.byCategory[ex.category] = (entry.byCategory[ex.category] ?? 0) + ex.amount;
  }

  const keys = Array.from(byKey.keys()).sort((a, b) => b.localeCompare(a));
  return keys.slice(0, 14).map((key) => {
    const { total, byCategory } = byKey.get(key)!;
    let label = key;
    if (period === "day") label = getDayLabel(key);
    else if (period === "week") {
      const [y, m, d] = key.split("-").map(Number);
      const start = new Date(y, m - 1, d);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      label = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    } else label = new Date(key + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" });
    return { key, label, total, byCategory };
  });
}

const CATEGORY_COLORS: Record<Category, string> = {
  food: "bg-amber-500",
  entertainment: "bg-pink-500",
  transportation: "bg-blue-500",
  groceries: "bg-teal-500",
  shopping: "bg-violet-500",
  others: "bg-zinc-400",
  sports: "bg-lime-500",
  necessities: "bg-emerald-600",
  travelling: "bg-cyan-500",
  sasha: "bg-rose-400",
};

function SummaryView({ expenses }: { expenses: Expense[] }) {
  const [period, setPeriod] = useState<Period>("day");
  const groups = groupByPeriod(expenses, period);
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = CATEGORIES.reduce((acc, c) => {
    acc[c] = expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {} as Record<Category, number>);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800/50">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Total spent</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatAmount(totalAll)}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">Group by</p>
        <div className="flex gap-2">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${
                period === p ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-zinc-500">No data for this period.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Stacked bar</p>
          <div className="space-y-3">
            {groups.map(({ key, label, total, byCategory }) => (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[60%]">{label}</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatAmount(total)}</span>
                </div>
                <div className="h-8 w-full flex rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                  {CATEGORIES.filter((c) => (byCategory[c] ?? 0) > 0).map((c) => (
                    <div
                      key={c}
                      className={`${CATEGORY_COLORS[c]} transition-all`}
                      style={{
                        width: total > 0 ? `${((byCategory[c] ?? 0) / total) * 100}%` : "0",
                        minWidth: (byCategory[c] ?? 0) > 0 ? "4px" : "0",
                      }}
                      title={`${CATEGORY_LABELS[c]}: ${formatAmount(byCategory[c] ?? 0)}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">By category</p>
        <div className="space-y-2">
          {CATEGORIES.map((c) => {
            const sum = byCat[c] ?? 0;
            const pct = totalAll > 0 ? (sum / totalAll) * 100 : 0;
            return (
              <div key={c} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full shrink-0 ${CATEGORY_COLORS[c]}`} />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{CATEGORY_LABELS[c]}</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatAmount(sum)}</span>
                <span className="text-xs text-zinc-500 w-10 text-right">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrackerIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8 shrink-0"
      aria-hidden
    >
      {/* Piggy body - rounded blob */}
      <path
        d="M8 18c0-4 2-8 8-8s8 4 8 8c0 5-2 10-8 10S8 23 8 18Z"
        className="fill-emerald-500 dark:fill-emerald-400"
      />
      {/* Ear */}
      <ellipse cx="10" cy="12" rx="2.5" ry="3" className="fill-emerald-600 dark:fill-emerald-500" />
      {/* Coin slot */}
      <rect x="13" y="8" width="6" height="2" rx="1" className="fill-zinc-700 dark:fill-zinc-400" />
      {/* Eye */}
      <circle cx="12" cy="16" r="1.5" className="fill-zinc-800 dark:fill-zinc-200" />
      {/* Smile */}
      <path
        d="M11 20c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        className="stroke-zinc-700 dark:stroke-zinc-300"
      />
      {/* Dollar sparkle */}
      <path
        d="M22 14v4M20 16h4M21 15l2 2M21 17l2-2"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        className="stroke-amber-400 dark:stroke-amber-300"
      />
    </svg>
  );
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [note, setNote] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editNote, setEditNote] = useState("");
  const [viewMode, setViewMode] = useState<"details" | "summary">("details");
  const [moreOpen, setMoreOpen] = useState(false);
  const [importPaste, setImportPaste] = useState("");
  const [importMessage, setImportMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportText, setExportText] = useState("");

  const loadExpenses = useCallback(() => {
    setExpenses(getExpenses());
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const startEdit = (ex: Expense) => {
    setEditingId(ex.id);
    setEditAmount(String(ex.amount));
    setEditCategory(ex.category);
    setEditNote(ex.note ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const num = Math.round(parseFloat(editAmount.replace(/,/g, ".")) || 0);
    if (num <= 0 || !editCategory || !editNote.trim()) return;
    updateExpense(editingId, { amount: num, category: editCategory, note: editNote.trim() });
    loadExpenses();
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (typeof window !== "undefined" && window.confirm("Delete this expense?")) {
      deleteExpense(id);
      loadExpenses();
      if (editingId === id) setEditingId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Math.round(parseFloat(amount.replace(/,/g, ".")) || 0);
    if (num <= 0) return;
    if (!category) return;
    const trimmedNote = note.trim();
    if (!trimmedNote) return;

    addExpense({ amount: num, category, note: trimmedNote });
    loadExpenses();
    setAmount("");
    setCategory(null);
    setNote("");
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleImport = () => {
    setImportMessage(null);
    const trimmed = importPaste.trim();
    if (!trimmed) {
      setImportMessage({ type: "err", text: "Paste CSV first." });
      return;
    }
    try {
      const rows = parseCSV(trimmed);
      if (rows.length === 0) {
        setImportMessage({ type: "err", text: "No valid rows. Use columns: date,category,note,amount" });
        return;
      }
      const count = importExpenses(
        rows.map((r) => ({ amount: r.amount, category: r.category, note: r.note, createdAt: r.date }))
      );
      loadExpenses();
      setImportPaste("");
      setImportMessage({ type: "ok", text: `Imported ${count} expense(s).` });
    } catch (err) {
      setImportMessage({ type: "err", text: err instanceof Error ? err.message : "Import failed." });
    }
  };

  const handleExportClick = () => {
    setExportText(exportToCSV(expenses));
    setShowExport(true);
  };

  const copyExport = () => {
    if (typeof navigator?.clipboard !== "undefined" && exportText) {
      navigator.clipboard.writeText(exportText);
    }
  };

  return (
    <div className="flex min-h-dvh w-full max-w-md flex-col mx-auto safe-area-padding">
      <header className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <TrackerIcon />
          <h1 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 tracking-tight truncate">
            Expense Tracker
          </h1>
        </div>
        <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("details")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              viewMode === "details" ? "bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setViewMode("summary")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              viewMode === "summary" ? "bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            Summary
          </button>
        </div>
      </header>

      {viewMode === "summary" ? (
        <SummaryView expenses={expenses} />
      ) : (
        <>
      <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 mb-1">
        Add expense
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
        Tap amount, pick a category, done.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="amount" className="sr-only">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-5 py-4 text-2xl font-semibold text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400"
            autoFocus
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium transition touch-manipulation ${
                  category === cat
                    ? "bg-emerald-500 text-white shadow-md"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="note" className="sr-only">
            Note
          </label>
          <input
            id="note"
            type="text"
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-700 outline-none transition focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-emerald-400"
          />
        </div>

        <button
          type="submit"
          disabled={!amount || !category || !note.trim() || Math.round(parseFloat(amount.replace(/,/g, ".")) || 0) <= 0}
          className={`min-h-[52px] w-full rounded-2xl font-semibold text-white shadow-lg transition touch-manipulation ${
            justAdded
              ? "bg-emerald-600"
              : "bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:bg-zinc-300 disabled:shadow-none dark:disabled:bg-zinc-600"
          }`}
        >
          {justAdded ? "Added ✓" : "Add expense"}
        </button>
      </form>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          More
          <svg className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {moreOpen && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50 space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Import from CSV
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-2">
                Paste CSV with columns: date,category,note,amount
              </p>
              <textarea
                value={importPaste}
                onChange={(e) => setImportPaste(e.target.value)}
                placeholder="date,category,note,amount&#10;2024-01-15,food,Lunch,80"
                rows={4}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
              {importMessage && (
                <p className={`text-sm mt-1 ${importMessage.type === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {importMessage.text}
                </p>
              )}
              <button
                type="button"
                onClick={handleImport}
                className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
              >
                Parse &amp; Import
              </button>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <button
                type="button"
                onClick={handleExportClick}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Export to CSV
              </button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-2">
                Copy all records as CSV text.
              </p>
              {showExport && (
                <>
                  <textarea
                    readOnly
                    value={exportText}
                    rows={4}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={copyExport}
                    className="mt-2 rounded-lg bg-zinc-200 dark:bg-zinc-600 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    Copy to clipboard
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
          History by day
        </h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            No expenses yet. Add one above.
          </p>
        ) : (
          <div className="space-y-5">
            {groupExpensesByDay(expenses).map(({ dateKey, label, total, items }) => (
              <section key={dateKey}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatAmount(total)}
                  </span>
                </div>
                <ul className="space-y-2">
                  {items.map((ex) =>
                    editingId === ex.id ? (
                      <li
                        key={ex.id}
                        className="rounded-xl border-2 border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-zinc-800/80"
                      >
                        <div className="flex flex-col gap-3">
                          <input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="1"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-lg font-medium dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                          <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setEditCategory(cat)}
                                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium ${
                                  editCategory === cat
                                    ? "bg-emerald-500 text-white"
                                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                {CATEGORY_LABELS[cat]}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="Note"
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={
                                Math.round(parseFloat(editAmount.replace(/,/g, ".")) || 0) <= 0 ||
                                !editCategory ||
                                !editNote.trim()
                              }
                              className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-lg bg-zinc-200 py-2 px-4 text-sm font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </li>
                    ) : (
                      <li
                        key={ex.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50"
                      >
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {formatAmount(ex.amount)}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {CATEGORY_LABELS[ex.category]}
                            {(ex.note ?? "") ? ` · ${ex.note}` : ""}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                          {formatTime(ex.createdAt)}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(ex)}
                            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                            aria-label="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ex.id)}
                            className="rounded-lg p-2 text-zinc-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            aria-label="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
