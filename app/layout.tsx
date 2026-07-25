import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://odd-hours.onrender.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ODD HOURS｜昨日と比べる、30秒の世界観測",
  description: "人の関心、地球、自然、宇宙。昨日までと何が変わったのか、公開データから毎日3つだけ日本語で紹介します。",
  keywords: ["昨日との変化", "世界の変化", "データ", "ニュース", "地震", "宇宙天気"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: "ODD HOURS",
    title: "きょう、世界はここが変わった。",
    description: "昨日と比べる、30秒の世界観測。今日の変化を3つだけ。",
    images: [{ url: "/og.png", width: 1718, height: 920, alt: "ODD HOURS 今日の変化3選" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "きょう、世界はここが変わった。",
    description: "昨日と比べる、30秒の世界観測。今日の変化を3つだけ。",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
