import type { Expense } from "./types";

const STORAGE_KEY = "expense_tracker_expenses";

export function getExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as (Omit<Expense, "note"> & { note?: string })[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) => ({ ...e, note: e.note ?? "" }));
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

export function updateExpense(
  id: string,
  updates: Partial<Pick<Expense, "amount" | "category" | "note">>
): Expense | null {
  const expenses = getExpenses();
  const index = expenses.findIndex((e) => e.id === id);
  if (index === -1) return null;
  const updated = { ...expenses[index], ...updates };
  const next = [...expenses];
  next[index] = updated;
  saveExpenses(next);
  return updated;
}

export function deleteExpense(id: string): boolean {
  const expenses = getExpenses().filter((e) => e.id !== id);
  if (expenses.length === getExpenses().length) return false;
  saveExpenses(expenses);
  return true;
}
