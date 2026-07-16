import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Rehab & New Build Project Tracking Software | RenovationLedger",
  description:
    "Track rehabs and new builds start to finish. Build the budget, log every dollar, manage lender draws, pull sold comps, and hand your lender a clean report.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Rehab & New Build Project Tracking Software | RenovationLedger",
    description:
      "Budget, transactions, draws, comps, and lender-ready reports for single family and multi family projects.",
    url: SITE_URL,
  },
};

const FAQS = [
  {
    q: "What does RenovationLedger do?",
    a: "RenovationLedger tracks a rehab or new build project from purchase to payoff. You build the rehab budget by category, log every transaction against it, track lender draws, pull recent sold comps near the property, and export a clean report your lender can read in two minutes.",
  },
  {
    q: "Does it work for both rehabs and new construction?",
    a: "Yes. Every project is set up as a rehab or a new build, single family or multi family. The budget categories, draw schedule, and reports work the same way for both.",
  },
  {
    q: "Where do the comps come from?",
    a: "Comps are recent sold properties pulled by distance from your project address, from public records and MLS data. Each comp links to its Zillow page so you can verify it yourself.",
  },
  {
    q: "Can I send the reports to my bank or lender?",
    a: "Yes. Every project has a one-page lender report with budget vs. actual, the full draw schedule, and the transaction ledger. Download it as a PDF or CSV and send it as-is. No cleanup needed.",
  },
  {
    q: "How much does it cost?",
    a: "It is free while in early access. Create an account, add your projects, and you are in. Paid plans come later, and early users will be told before anything changes.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. The whole app works on a phone, so you can log a receipt or check the budget from the job site.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const tickerItems = [
    "Rehab budgets", "Draw schedules", "Sold comps", "Lender-ready reports",
    "Transaction tracking", "Single family", "Multi family", "New builds",
  ];

  const features = [
    {
      n: "01",
      title: "Rehab budget by category",
      body: "19 standard categories from demo to contingency, ready the moment you create a project. Set the numbers. Watch actuals stack against them.",
    },
    {
      n: "02",
      title: "Every transaction, logged",
      body: "Vendor, category, amount, date. Each expense lands against its budget line so you see overruns while you can still do something about them.",
    },
    {
      n: "03",
      title: "Draw tracking",
      body: "Request, approve, fund. Every draw numbered and dated, with a running total against the loan. Your lender sees exactly what you see.",
    },
    {
      n: "04",
      title: "Comps by proximity",
      body: "Recent solds pulled by distance from the project address. Price, price per square foot, sold date. Each one links to Zillow so you can check it.",
    },
    {
      n: "05",
      title: "Lender-ready reports",
      body: "One page. Budget vs. actual, draw schedule, transaction ledger, all-in vs. ARV. Print it, download it, send it. Nothing to edit first.",
    },
    {
      n: "06",
      title: "Built for the job site",
      body: "Works on a phone. Log the receipt in the truck, not three weeks later from a shoebox.",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" aria-label="RenovationLedger home">
            <img src="/logo.png" alt="" width={132} height={32} style={{ display: "block" }} />
          </Link>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#features" className="hide-mobile">Features</a>
            <a href="#how-it-works" className="hide-mobile">How it works</a>
            <a href="#faq" className="hide-mobile">FAQ</a>
            {user ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="hide-mobile">Log in</Link>
                <Link href="/signup" className="btn btn-primary btn-sm">Start free</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="hero-visual" aria-hidden="true">
            <div style={{ width: "100%", maxWidth: 380 }}>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="overline" style={{ color: "var(--color-text-muted)" }}>Active · Rehab</div>
                <div style={{ fontSize: 18, fontWeight: 700, margin: "6px 0 12px" }}>1412 E Marshall Pl</div>
                <div className="small secondary" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Budget $52,000</span><span>Spent $38,450</span>
                </div>
                <div className="progress"><div style={{ width: "74%" }} /></div>
                <div className="small muted" style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
                  <span>All-in 71.2% of ARV</span>
                  <span>Draw 3 of 4 funded</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div className="badge-circle"><small>All-in max</small>75%<small>of ARV</small></div>
              </div>
            </div>
          </div>
          <div className="hero-content">
            <div className="overline" style={{ marginBottom: 16 }}>For real estate investors</div>
            <h1 className="display">Every dollar of the project. Tracked.</h1>
            <p className="secondary" style={{ maxWidth: 400, margin: "20px 0 28px" }}>
              Rehabs and new builds, single family and multi family. Build the budget,
              log the spend, track the draws, pull the comps. Hand your lender a report
              that needs no explaining.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">Start tracking free</Link>
              <a href="#how-it-works" className="btn btn-outline btn-lg">See how it works</a>
            </div>
          </div>
        </section>

        {/* Ticker */}
        <div className="ticker" aria-hidden="true">
          <div className="ticker-inner">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i}>{t}<i className="ticker-dot" /></span>
            ))}
          </div>
        </div>

        {/* Features */}
        <section className="section" id="features">
          <div className="container">
            <div className="overline">What it does</div>
            <h2 className="h1" style={{ margin: "12px 0 40px", maxWidth: 700 }}>
              One place for the whole project
            </h2>
            <div className="grid-3">
              {features.map((f) => (
                <article key={f.n} className="card project-card">
                  <div className="feature-num">{f.n}.</div>
                  <h3 className="h4" style={{ fontWeight: 600 }}>{f.title}</h3>
                  <p className="small secondary">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="section section-dark" id="how-it-works">
          <div className="container">
            <div className="overline">How it works</div>
            <h2 className="h1" style={{ margin: "12px 0 40px", maxWidth: 720 }}>
              From purchase to payoff in three steps
            </h2>
            <div className="grid-3">
              <div className="card card-dark" style={{ border: "1px solid #333830" }}>
                <div className="feature-num" style={{ color: "var(--color-accent)" }}>01.</div>
                <h3 className="h4" style={{ margin: "10px 0 8px", fontWeight: 600 }}>Create the project</h3>
                <p className="small muted">
                  Address, purchase price, ARV, loan. The budget comes pre-loaded with 19
                  standard categories. Fill in your numbers.
                </p>
              </div>
              <div className="card card-dark" style={{ border: "1px solid #333830" }}>
                <div className="feature-num" style={{ color: "var(--color-accent)" }}>02.</div>
                <h3 className="h4" style={{ margin: "10px 0 8px", fontWeight: 600 }}>Log as you go</h3>
                <p className="small muted">
                  Every receipt, every invoice, every draw. Fifteen minutes a week keeps
                  the whole project current.
                </p>
              </div>
              <div className="card card-dark" style={{ border: "1px solid #333830" }}>
                <div className="feature-num" style={{ color: "var(--color-accent)" }}>03.</div>
                <h3 className="h4" style={{ margin: "10px 0 8px", fontWeight: 600 }}>Send the report</h3>
                <p className="small muted">
                  Budget vs. actual, draws, ledger, all-in vs. ARV on one page. Your
                  lender reads it in two minutes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq">
          <div className="container" style={{ maxWidth: 800 }}>
            <div className="overline">FAQ</div>
            <h2 className="h1" style={{ margin: "12px 0 24px" }}>Common questions</h2>
            {FAQS.map((f) => (
              <details className="faq-item" key={f.q}>
                <summary><h3 style={{ fontSize: 17, fontWeight: 600 }}>{f.q}</h3></summary>
                <p className="small">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="section section-dark">
          <div className="container" style={{ textAlign: "left" }}>
            <h2 className="h1" style={{ maxWidth: 700 }}>
              Stop tracking six figures in a notebook.
            </h2>
            <p className="muted" style={{ margin: "16px 0 28px", maxWidth: 480 }}>
              Free while in early access. Create an account and add your first project
              in under five minutes.
            </p>
            <Link href="/signup" className="btn btn-primary btn-lg">Create your free account</Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="nav-logo" style={{ color: "#fff" }}>RenovationLedger</div>
            <p className="small muted" style={{ marginTop: 8 }}>
              Project tracking for real estate investors.
            </p>
          </div>
          <p className="small muted">© {new Date().getFullYear()} MJM Solutions Group</p>
        </div>
      </footer>
    </>
  );
}
