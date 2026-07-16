import type { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

// /login and /signup are excluded here on purpose — both set `robots:
// { index: false }` on their own metadata, and listing noindex pages in the
// sitemap sends search engines a mixed signal.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), priority: 1 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), priority: 0.3 },
  ];
}
