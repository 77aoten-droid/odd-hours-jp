import type { MetadataRoute } from "next";
import { archiveDays } from "./archive/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://odd-hours-jp.onrender.com";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/archive`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ...archiveDays.map((item) => ({
      url: `${base}/archive/${item.date}`,
      lastModified: new Date(`${item.date}T00:00:00+09:00`),
      changeFrequency: "never" as const,
      priority: 0.8,
    })),
  ];
}
