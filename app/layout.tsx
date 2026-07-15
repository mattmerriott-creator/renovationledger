import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RenovationLedger | Rehab & New Build Project Tracking for Real Estate Investors",
    template: "%s | RenovationLedger",
  },
  description:
    "Track single family and multi family rehabs and new builds start to finish. Rehab budgets, transactions, draw schedules, sold comps, and lender-ready reports in one place.",
  openGraph: {
    siteName: "RenovationLedger",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  // No `icons` field here — app/icon.png and app/apple-icon.png are picked up
  // automatically via Next.js's file-convention metadata resolution.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RenovationLedger",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    image: `${SITE_URL}/logo.png`,
    description:
      "Project tracking software for real estate investors: rehab budgets, transaction tracking, draw schedules, sold comps, and lender-ready reports for single family and multi family rehabs and new builds.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
