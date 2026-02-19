import type { Category } from "./types";
import { CATEGORIES } from "./types";

const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.toLowerCase(), c])
) as Record<string, Category>;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if ((ch === "," && !inQuotes) || ch === "\n" || ch === "\r") {
      if (ch !== "\n" && ch !== "\r") {
        result.push(current.trim());
        current = "";
      }
    } else {
      if (ch !== "\r") current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export interface ParsedRow {
  date: string;
  category: Category;
  note: string;
  amount: number;
}

export function parseCSV(csvText: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0]?.toLowerCase();
  const start = header?.includes("date") && header?.includes("category") ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 4) continue;
    const dateStr = parts[0]?.trim() ?? "";
    const categoryStr = (parts[1]?.trim() ?? "").toLowerCase();
    const note = parts.slice(2, -1).join(",").trim().replace(/^"|"$/g, "") || "";
    const amountNum = Math.round(parseFloat((parts[parts.length - 1] ?? "").replace(/[^0-9.-]/g, "")) || 0);

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) continue;
    if (amountNum <= 0) continue;
    const localNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);

    const category = CATEGORY_MAP[categoryStr] ?? "others";
    rows.push({
      date: localNoon.toISOString(),
      category,
      note: note || "Imported",
      amount: amountNum,
    });
  }
  return rows;
}
