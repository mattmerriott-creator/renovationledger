import type { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/projects", "/api"] },
      { userAgent: "GPTBot", allow: "/", disallow: ["/dashboard", "/projects", "/api"] },
      { userAgent: "ClaudeBot", allow: "/", disallow: ["/dashboard", "/projects", "/api"] },
      { userAgent: "PerplexityBot", allow: "/", disallow: ["/dashboard", "/projects", "/api"] },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
