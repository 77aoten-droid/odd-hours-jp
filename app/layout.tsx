import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://odd-hours-jp.onrender.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ODD HOURS｜昨日と比べる、30秒の世界観測",
  description: "人の関心、ゲーム、地球、自然、宇宙。昨日までと何が変わったのか、公開データから日本語で紹介します。",
  keywords: ["昨日との変化", "世界の変化", "ゲーム注目度", "Steam", "データ", "ニュース", "地震", "宇宙天気"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: "ODD HOURS",
    title: "世界はきょう、こうなった！",
    description: "無料・有料ゲームを分け、現在プレイヤー数と売上順位から今日の注目を観察します。",
    images: [{ url: "/og-game-radar.png", width: 1672, height: 939, alt: "ODD HOURS GAME RADAR 今日、どのゲームが動いた？" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "世界はきょう、こうなった！",
    description: "無料・有料ゲームを分け、現在プレイヤー数と売上順位から今日の注目を観察します。",
    images: ["/og-game-radar.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
