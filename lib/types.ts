export const CATEGORIES = [
  "food",
  "transportation",
  "shopping",
  "necessities",
  "groceries",
  "others",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  note: string;
  createdAt: string; // ISO string
}
