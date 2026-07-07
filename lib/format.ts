export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "$0";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function money2(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function dateFmt(d: string): string {
  if (!d) return "—";
  const parsed = new Date(d + (d.length === 10 ? "T12:00:00" : ""));
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  complete: "Complete",
  sold: "Sold / Closed",
};

export const TYPE_LABELS: Record<string, string> = {
  single_family: "Single Family",
  multi_family: "Multi Family",
};

export const STRATEGY_LABELS: Record<string, string> = {
  rehab: "Rehab",
  new_build: "New Build",
};
