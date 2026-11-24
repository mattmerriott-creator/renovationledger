// Max-offer math for the public offer calculator. Pure functions, no DB, so
// the client-side calculator and any server code share one version.
//
// WHOLESALE — what you can put the property under contract for and still
// leave your buyer a deal:
//   buyer's price = ARV × buyer's max % − repairs
//   max offer     = buyer's price − your fee − your costs
//   e.g. ARV 200,000, buyer 70%, repairs 40,000 → buyer's price 100,000
//        fee 10,000, costs 1,000 → max offer 89,000
//
// FLIP, "cap all-in at % of ARV" (the same 75%-of-ARV rule the project
// pages warn on):
//   max offer = ARV × cap% − repairs − buying closing costs − holding − assignment fee paid
//   e.g. ARV 200,000, cap 75%, repairs 40,000, closing 3,000, holding 1,000 × 5 mo, no fee
//        → 150,000 − 40,000 − 3,000 − 5,000 = 102,000
//        all-in 150,000; selling costs 8% = 16,000; profit 200,000 − 16,000 − 150,000 = 34,000
//
// FLIP, "hit a profit target":
//   max offer = ARV − selling costs − repairs − closing − holding − fee paid − profit
//   e.g. same numbers, profit 30,000 → 200,000 − 16,000 − 40,000 − 3,000 − 5,000 − 30,000 = 106,000
//
// RENT, worked backward from the DSCR your lender needs (buy, fix, rent, refi).
// DSCR is lender style: gross rent ÷ PITIA (loan payment + taxes + insurance
// + HOA). Vacancy and other expenses don't count toward DSCR, but they do
// count in cash flow and NOI.
//   max PITIA     = rent ÷ target DSCR
//   max payment   = max PITIA − taxes − insurance − HOA → max loan (amortized at the rate/term)
//   refi loan     = the smaller of that and ARV × LTV%
//   max offer     = refi loan + cash you'll leave in − repairs − closing − holding − refi closing − fee paid
//   NOI / month   = rent × (1 − vacancy%) − taxes − insurance − HOA − other expenses
//   ARV is typed in, or for 5+ unit buildings, yearly NOI ÷ cap rate.
//   e.g. rent 1,600, taxes 180, insurance 100, no HOA, DSCR 1.25
//        → max PITIA 1,280 → max payment 1,000; 7.5% / 30 yr → max loan ≈ 143,018
//        ARV 200,000 × 75% = 150,000, so DSCR is the limit: loan ≈ 143,018
//        costs 40,000 + 3,000 + 5,000 + 3,000 refi closing → max offer ≈ 92,018
//        cash flow with 8% vacancy and 170 other: 1,472 − 180 − 100 − 170 − 1,000 = 22/mo

export type OfferMode = "wholesale" | "flip" | "rental";
export type FlipMethod = "percent" | "profit";

export type OfferInputs = {
  arv: number;
  repairs: number;
  // Wholesale
  buyerPct: number;
  yourFee: number;
  yourCosts: number;
  // Flip and rent
  buyClosing: number;
  holdingMonthly: number;
  holdMonths: number;
  wholesaleFee: number; // assignment fee paid to a wholesaler, if any
  // Flip
  method: FlipMethod;
  maxAllInPct: number;
  sellCostPct: number;
  desiredProfit: number;
  // Rent
  monthlyRent: number;
  vacancyPct: number;
  taxesMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  otherExpenses: number; // management, upkeep, reserves — not part of DSCR
  useCapRate: boolean; // value 5+ unit buildings from NOI ÷ cap rate
  targetCapPct: number;
  ltvPct: number;
  interestRate: number;
  termYears: number;
  targetDscr: number;
  cashLeftIn: number;
  refiClosing: number;
};

export type OfferResult = {
  maxOffer: number; // can be negative: the deal doesn't work at these numbers
  arv: number; // the value used: typed in, or NOI ÷ cap rate
  allIn: number;
  allInPctOfArv: number | null;
  // Wholesale
  buyerPrice?: number;
  // Flip
  sellCosts?: number;
  profit?: number;
  // Rent
  noiMonthly?: number;
  loan?: number;
  loanLimitedBy?: "dscr" | "ltv";
  monthlyPayment?: number; // principal + interest
  pitia?: number; // payment + taxes + insurance + HOA
  dscr?: number | null; // rent ÷ PITIA
  monthlyCashFlow?: number;
  valuedByCapRate?: boolean;
};

const r = (n: number) => Math.round(n);

// Monthly principal + interest on an amortized loan.
export function loanPayment(principal: number, annualRatePct: number, termYears: number): number {
  const n = termYears * 12;
  if (principal <= 0 || n <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

// The loan a given monthly payment will carry (inverse of loanPayment).
export function loanForPayment(payment: number, annualRatePct: number, termYears: number): number {
  const n = termYears * 12;
  if (payment <= 0 || n <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  if (i === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + i, -n))) / i;
}

export function calculateOffer(mode: OfferMode, i: OfferInputs): OfferResult {
  if (mode === "wholesale") {
    const buyerPrice = i.arv * (i.buyerPct / 100) - i.repairs;
    const maxOffer = buyerPrice - i.yourFee - i.yourCosts;
    const buyerAllIn = buyerPrice + i.repairs;
    return {
      maxOffer: r(maxOffer),
      arv: r(i.arv),
      allIn: r(buyerAllIn),
      allInPctOfArv: i.arv > 0 ? (buyerAllIn / i.arv) * 100 : null,
      buyerPrice: r(buyerPrice),
    };
  }

  const holding = i.holdingMonthly * i.holdMonths;

  if (mode === "rental") {
    const tih = i.taxesMonthly + i.insuranceMonthly + i.hoaMonthly;
    const noiMonthly = i.monthlyRent * (1 - i.vacancyPct / 100) - tih - i.otherExpenses;
    const valuedByCapRate = i.useCapRate && i.targetCapPct > 0;
    const arv = valuedByCapRate ? Math.max(0, (noiMonthly * 12) / (i.targetCapPct / 100)) : i.arv;
    const loanByLtv = Math.max(0, arv * (i.ltvPct / 100));
    const loanByDscr =
      i.targetDscr > 0 ? loanForPayment(i.monthlyRent / i.targetDscr - tih, i.interestRate, i.termYears) : loanByLtv;
    const loan = Math.min(loanByLtv, loanByDscr);
    const loanLimitedBy = loanByDscr < loanByLtv ? "dscr" : "ltv";
    const monthlyPayment = loanPayment(loan, i.interestRate, i.termYears);
    const pitia = monthlyPayment + tih;
    const costs = i.repairs + i.buyClosing + holding + i.refiClosing + i.wholesaleFee;
    const maxOffer = loan + i.cashLeftIn - costs;
    const allIn = maxOffer + costs;
    return {
      maxOffer: r(maxOffer),
      arv: r(arv),
      allIn: r(allIn),
      allInPctOfArv: arv > 0 ? (allIn / arv) * 100 : null,
      noiMonthly: r(noiMonthly),
      loan: r(loan),
      loanLimitedBy,
      monthlyPayment: r(monthlyPayment),
      pitia: r(pitia),
      dscr: pitia > 0 ? i.monthlyRent / pitia : null,
      monthlyCashFlow: r(noiMonthly - monthlyPayment),
      valuedByCapRate,
    };
  }

  const otherCosts = i.repairs + i.buyClosing + holding + i.wholesaleFee;
  const sellCosts = i.arv * (i.sellCostPct / 100);
  const maxOffer =
    i.method === "profit"
      ? i.arv - sellCosts - otherCosts - i.desiredProfit
      : i.arv * (i.maxAllInPct / 100) - otherCosts;
  const allIn = maxOffer + otherCosts;
  return {
    maxOffer: r(maxOffer),
    arv: r(i.arv),
    allIn: r(allIn),
    allInPctOfArv: i.arv > 0 ? (allIn / i.arv) * 100 : null,
    sellCosts: r(sellCosts),
    profit: r(i.arv - sellCosts - allIn),
  };
}

// The formula in words, shown under each result so nobody has to guess.
export function offerFormula(mode: OfferMode, i: OfferInputs): string {
  if (mode === "wholesale") {
    return `Buyer's price = ARV × ${i.buyerPct || 0}% − repairs. Max offer = buyer's price − your fee − your costs`;
  }
  if (mode === "rental") {
    const arv = i.useCapRate ? `ARV = yearly NOI ÷ ${i.targetCapPct || 0}% cap rate. ` : "";
    return `${arv}Refi loan = the smaller of ARV × ${i.ltvPct || 0}% and the loan that keeps DSCR = rent ÷ (payment + taxes + insurance + HOA) at ${i.targetDscr || 0}. Max offer = loan + cash left in − repairs − closing − holding − refi closing − fee paid`;
  }
  return i.method === "profit"
    ? "Max offer = ARV − selling costs − repairs − closing − holding − fee paid − your profit"
    : `Max offer = ARV × ${i.maxAllInPct || 0}% − repairs − closing − holding − fee paid`;
}
