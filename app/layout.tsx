import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://odd-hours-jp.onrender.com";

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
    title: "世界はきょう、こうなった！",
    description: "きのうとくらべる、30秒の世界観察。今日の発見を3つだけ。",
    images: [{ url: "/og-pop.png", width: 1536, height: 1024, alt: "ODD HOURS 今日の発見3選" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "世界はきょう、こうなった！",
    description: "きのうとくらべる、30秒の世界観察。今日の発見を3つだけ。",
    images: ["/og-pop.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
