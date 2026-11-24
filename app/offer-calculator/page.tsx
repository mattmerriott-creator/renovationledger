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
    "Work out the most you should pay for a fix and flip or rental. Compare up to 3 offers side by side using ARV, repairs, holding costs, profit or cap rate. Free, no signup.",
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
    a: "You cap your all-in cost (price, repairs, closing, holding and any wholesale fee) at a percent of ARV, or, for a flip, start from ARV, take off selling costs and every other cost, and leave room for the profit you want. Rentals use the percent rule, since a refi lender lends against value. For buildings with 5 or more units, turn on the cap rate switch: ARV becomes the yearly net operating income divided by the cap rate, and the offer follows from that. The exact formula is shown under each result.",
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
            Plug in the ARV, repairs and your costs to get a max offer for a flip or a rental. Compare up to three
            versions of the deal side by side. No signup needed.
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
