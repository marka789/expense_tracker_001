import type { Expense } from "./types";

const STORAGE_KEY = "expense_tracker_expenses";

export function getExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function addExpense(expense: Omit<Expense, "id" | "createdAt">): Expense {
  const expenses = getExpenses();
  const newExpense: Expense = {
    ...expense,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  saveExpenses([newExpense, ...expenses]);
  return newExpense;
}
