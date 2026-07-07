import type { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), priority: 1 },
    { url: `${SITE_URL}/signup`, lastModified: new Date(), priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), priority: 0.5 },
  ];
}
