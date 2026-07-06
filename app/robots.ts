import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/konto", "/login"],
    },
    sitemap: "https://allswim.pl/sitemap.xml",
    host: "https://allswim.pl",
  };
}
