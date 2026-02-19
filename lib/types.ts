export const CATEGORIES = [
  "food",
  "entertainment",
  "transportation",
  "groceries",
  "shopping",
  "others",
  "sports",
  "necessities",
  "travelling",
  "sasha",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  note: string;
  createdAt: string; // ISO string
}
