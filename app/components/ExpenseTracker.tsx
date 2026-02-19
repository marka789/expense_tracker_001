"use client";

import { useState, useEffect, useCallback } from "react";
import { getExpenses, addExpense } from "@/lib/storage";
import type { Expense, Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food",
  transportation: "Transport",
  shopping: "Shopping",
  necessities: "Necessities",
  groceries: "Groceries",
  others: "Others",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [note, setNote] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const loadExpenses = useCallback(() => {
    setExpenses(getExpenses());
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(/,/g, "."));
    if (Number.isNaN(num) || num <= 0) return;
    if (!category) return;

    addExpense({ amount: num, category, note: note.trim() || undefined });
    loadExpenses();
    setAmount("");
    setCategory(null);
    setNote("");
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="flex min-h-dvh w-full max-w-md flex-col mx-auto px-4 pb-8 pt-6 safe-area-padding">
      <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-1">
        Add expense
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
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
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
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
            Note (optional)
          </label>
          <input
            id="note"
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-700 outline-none transition focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-emerald-400"
          />
        </div>

        <button
          type="submit"
          disabled={!amount || !category || parseFloat(amount.replace(/,/g, ".")) <= 0}
          className={`min-h-[52px] w-full rounded-2xl font-semibold text-white shadow-lg transition touch-manipulation ${
            justAdded
              ? "bg-emerald-600"
              : "bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:bg-zinc-300 disabled:shadow-none dark:disabled:bg-zinc-600"
          }`}
        >
          {justAdded ? "Added ✓" : "Add expense"}
        </button>
      </form>

      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
          Recent
        </h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            No expenses yet. Add one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {expenses.slice(0, 15).map((ex) => (
              <li
                key={ex.id}
                className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatAmount(ex.amount)}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {CATEGORY_LABELS[ex.category]}
                    {ex.note ? ` · ${ex.note}` : ""}
                  </span>
                </div>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {formatDate(ex.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
