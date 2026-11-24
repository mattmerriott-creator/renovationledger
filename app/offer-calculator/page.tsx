import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import OfferCalculator from "./OfferCalculator";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Free Max Offer Calculator for Flips & Rentals",
  description:
    "Work out the most you should offer on a wholesale deal, a fix and flip, or a rental. Work backward from your wholesale fee, profit, or the DSCR your lender needs. Compare up to 3 offers side by side. Free, no signup.",
  alternates: { canonical: "/offer-calculator" },
  openGraph: {
    title: "Free Max Offer Calculator for Flips & Rentals | RenovationLedger",
    description: "Compare up to 3 offers side by side. Free, no signup.",
    url: "/offer-calculator",
  },
};

const FAQ = [
  {
    q: "How is the max offer worked out?",
    a: "Each tab works backward from what you need out of the deal. Wholesale: your buyer's price is ARV times the percent they'll pay, minus repairs, and your offer is that minus your fee and costs. Flip: keep all-in cost under a percent of ARV, or start from ARV and take off selling costs, every other cost and the profit you want. Rent: the DSCR you need sets the biggest loan payment the rent can carry, that sets the refi loan, and the loan sets the price. The exact formula is shown under each result.",
  },
  {
    q: "How does the DSCR work?",
    a: "DSCR here is net operating income (rent after vacancy, minus expenses) divided by the monthly loan payment. Put in the DSCR your lender needs, plus the rate and term, and the calculator finds the biggest refi loan that still meets it. If 75% of ARV (or whatever max you set) is smaller, that limit wins instead. Anything you can't refinance out has to come off the price, unless you're OK leaving some cash in.",
  },
  {
    q: "When should I use a cap rate?",
    a: "Only for apartment buildings with 5 or more units. Those are appraised on the income they produce, so a lower cap rate means a higher value. Houses and 2–4 unit properties are valued off sold comps, so leave the switch off and use your ARV.",
  },
  {
    q: "What percent of ARV should I use?",
    a: "Plenty of flippers keep all-in cost at or under 75% of ARV, which is the default here. Tighter markets or bigger rehabs often call for less. Run a couple of scenarios side by side and see where the deal still pencils.",
  },
  {
    q: "Does it save my numbers?",
    a: "Your last numbers stay in this browser. Copy link gives you a URL with every scenario built in, so you can text it to a partner or open it on your phone. A free account turns any scenario into a tracked project.",
  },
];

export default async function OfferCalculatorPage() {
  const user = await getCurrentUser();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Max Offer Calculator",
      url: `${SITE_URL}/offer-calculator`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <SiteHeader />
      <main>
        <div className="container" style={{ padding: "40px 24px 64px" }}>
          <div className="overline">Free tool</div>
          <h1 className="h2" style={{ margin: "8px 0 8px" }}>What&apos;s the most you should pay?</h1>
          <p className="secondary" style={{ maxWidth: 680, marginBottom: 24 }}>
            Pick wholesale, flip or rent, plug in the ARV, repairs and your costs, and get a max offer that leaves
            room for your fee, your profit or the DSCR your lender needs. Compare up to three versions side by
            side. No signup needed.
          </p>

          <OfferCalculator loggedIn={!!user} />

          <section className="no-print" style={{ maxWidth: 760, marginTop: 56 }}>
            <h2 className="h3" style={{ marginBottom: 16 }}>Questions</h2>
            {FAQ.map((f) => (
              <div key={f.q} style={{ marginBottom: 20 }}>
                <h3 className="h4" style={{ fontWeight: 600, marginBottom: 4 }}>{f.q}</h3>
                <p className="secondary">{f.a}</p>
              </div>
            ))}
            <div className="card card-cream" style={{ marginTop: 24 }}>
              <p style={{ fontWeight: 600 }}>Got the deal? Track it from offer to sale.</p>
              <p className="small secondary" style={{ margin: "4px 0 12px" }}>
                Budget vs. actual, draws, receipts that read themselves, sold comps and a lender-ready report.
              </p>
              <Link href={user ? "/dashboard" : "/signup"} className="btn btn-primary btn-sm">
                {user ? "Open dashboard" : "Start free"}
              </Link>
            </div>
          </section>
        </div>
      </main>
      <div className="no-print"><SiteFooter /></div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
