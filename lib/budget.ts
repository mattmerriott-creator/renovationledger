// Budget units and the default category template.
// Kept free of server-only imports so client components can use them too.

// Units a budget line can be priced in. "job" means a flat total.
export const BUDGET_UNITS = ["job", "sqft", "each", "lf", "sq", "sheet", "month"] as const;

export const UNIT_LABELS: Record<string, string> = {
  job: "flat bid",
  sqft: "per sqft",
  each: "per item",
  lf: "per linear ft",
  sq: "per square (roofing)",
  sheet: "per sheet",
  month: "per month",
};

// Default budget template used to seed a new project. Each category carries the
// unit it is most often priced in; users add, delete, and re-unit lines freely.
export const DEFAULT_BUDGET_TEMPLATE: { category: string; unit: string }[] = [
  { category: "Demo & Cleanout", unit: "job" },
  { category: "Foundation & Structural", unit: "job" },
  { category: "Framing", unit: "job" },
  { category: "Roof", unit: "sq" },
  { category: "Windows & Doors", unit: "each" },
  { category: "Siding & Exterior", unit: "sqft" },
  { category: "Electrical", unit: "job" },
  { category: "Plumbing", unit: "job" },
  { category: "HVAC", unit: "job" },
  { category: "Insulation & Drywall", unit: "sqft" },
  { category: "Paint", unit: "sqft" },
  { category: "Flooring", unit: "sqft" },
  { category: "Kitchen", unit: "job" },
  { category: "Bathrooms", unit: "each" },
  { category: "Trim & Interior Doors", unit: "each" },
  { category: "Landscaping & Concrete", unit: "job" },
  { category: "Permits & Fees", unit: "job" },
  { category: "Holding Costs", unit: "month" },
  { category: "Contingency", unit: "job" },
];
