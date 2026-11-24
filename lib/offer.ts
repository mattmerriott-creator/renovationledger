// Max-offer math for the public offer calculator. Pure functions, no DB, so
// the client-side calculator and any server code share one version.
//
// Flip, "cap all-in at % of ARV" (the same 75%-of-ARV rule the project pages
// warn on):
//   max offer = ARV × cap% − repairs − buying closing costs − holding − wholesale fee
//   e.g. ARV 200,000, cap 75%, repairs 40,000, closing 3,000, holding 1,000 × 5 mo, no fee
//        → 150,000 − 40,000 − 3,000 − 5,000 = 102,000
//        all-in 150,000; selling costs 8% = 16,000; profit 200,000 − 16,000 − 150,000 = 34,000
//
// Flip, "hit a profit target":
//   max offer = ARV − selling costs − repairs − closing − holding − wholesale fee − profit
//   e.g. same numbers, profit 30,000 → 200,000 − 16,000 − 40,000 − 3,000 − 5,000 − 30,000 = 106,000
//
// Rental, "hit a cap rate on total cost":
//   NOI = rent × 12 × (1 − vacancy%) − monthly expenses × 12
//   max all-in = NOI ÷ cap rate; max offer = max all-in − repairs − closing − holding − fee
//   e.g. rent 1,600, vacancy 8%, expenses 450, cap 8% → NOI 17,664 − 5,400 = 12,264
//        max all-in 153,300 → max offer 153,300 − 40,000 − 3,000 − 5,000 = 105,300

export type OfferMode = "flip" | "rental";
export type FlipMethod = "percent" | "profit";

export type OfferInputs = {
  arv: number;
  repairs: number;
  buyClosing: number;
  holdingMonthly: number;
  holdMonths: number;
  wholesaleFee: number;
  // Flip
  method: FlipMethod;
  maxAllInPct: number;
  sellCostPct: number;
  desiredProfit: number;
  // Rental
  monthlyRent: number;
  vacancyPct: number;
  monthlyExpenses: number;
  targetCapPct: number;
};

export type OfferResult = {
  maxOffer: number; // can be negative: the deal doesn't work at these numbers
  holding: number;
  allIn: number; // max offer + repairs + closing + holding + wholesale fee
  allInPctOfArv: number | null;
  sellCosts: number;
  profit: number | null; // flip only
  noi: number | null; // rental only, per year
  capOnCost: number | null; // rental only, percent
  capOnArv: number | null; // rental only, percent
};

const r = (n: number) => Math.round(n);

export function calculateOffer(mode: OfferMode, i: OfferInputs): OfferResult {
  const holding = i.holdingMonthly * i.holdMonths;
  const otherCosts = i.repairs + i.buyClosing + holding + i.wholesaleFee;
  const sellCosts = i.arv * (i.sellCostPct / 100);

  if (mode === "rental") {
    const noi = i.monthlyRent * 12 * (1 - i.vacancyPct / 100) - i.monthlyExpenses * 12;
    const maxAllIn = i.targetCapPct > 0 ? noi / (i.targetCapPct / 100) : 0;
    const maxOffer = maxAllIn - otherCosts;
    const allIn = maxOffer + otherCosts;
    return {
      maxOffer: r(maxOffer),
      holding: r(holding),
      allIn: r(allIn),
      allInPctOfArv: i.arv > 0 ? (allIn / i.arv) * 100 : null,
      sellCosts: 0,
      profit: null,
      noi: r(noi),
      capOnCost: allIn > 0 ? (noi / allIn) * 100 : null,
      capOnArv: i.arv > 0 ? (noi / i.arv) * 100 : null,
    };
  }

  const maxOffer =
    i.method === "profit"
      ? i.arv - sellCosts - otherCosts - i.desiredProfit
      : i.arv * (i.maxAllInPct / 100) - otherCosts;
  const allIn = maxOffer + otherCosts;
  return {
    maxOffer: r(maxOffer),
    holding: r(holding),
    allIn: r(allIn),
    allInPctOfArv: i.arv > 0 ? (allIn / i.arv) * 100 : null,
    sellCosts: r(sellCosts),
    profit: r(i.arv - sellCosts - allIn),
    noi: null,
    capOnCost: null,
    capOnArv: null,
  };
}

// The formula in words, shown under each result so nobody has to guess.
export function offerFormula(mode: OfferMode, i: Pick<OfferInputs, "method" | "maxAllInPct" | "targetCapPct">): string {
  if (mode === "rental") {
    return `Max offer = yearly NOI ÷ ${i.targetCapPct || 0}% cap rate − repairs − closing − holding − wholesale fee`;
  }
  return i.method === "profit"
    ? "Max offer = ARV − selling costs − repairs − closing − holding − wholesale fee − your profit"
    : `Max offer = ARV × ${i.maxAllInPct || 0}% − repairs − closing − holding − wholesale fee`;
}
