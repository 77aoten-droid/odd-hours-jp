import { readFile, writeFile } from "node:fs/promises";

const archivePath = new URL("../app/archive/generated.json", import.meta.url);
const headers = { "User-Agent": "ODD-HOURS/4.0 (daily archive; public-data digest)" };

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function utcWikiDate(daysAgo) {
  const value = new Date(Date.now() - daysAgo * 86_400_000);
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ];
}

function normalWiki(article) {
  return !/^(Main_Page|Special:|Wikipedia:|File:|Portal:|Cookie)/.test(article);
}

function readableTitle(article) {
  return article.replaceAll("_", " ");
}

function japaneseDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${value.year}-${value.month}-${value.day}`;
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", weekday: "short",
  }).format(new Date()).replace(/[()（）]/g, "");
  return { date, year: Number(value.year), month: Number(value.month), day: Number(value.day), weekday };
}

async function collectDay() {
  const wikiCurrentDate = utcWikiDate(2);
  const wikiPreviousDate = utcWikiDate(3);
  const [wikiCurrent, wikiPrevious, quakeDay, quakeWeek, eonet, kp] = await Promise.all([
    getJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/${wikiCurrentDate.join("/")}`),
    getJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/${wikiPreviousDate.join("/")}`),
    getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"),
    getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson"),
    getJson("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=200"),
    getJson("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"),
  ]);

  const current = (wikiCurrent?.items?.[0]?.articles || []).filter((item) => normalWiki(item.article)).slice(0, 100);
  const previous = (wikiPrevious?.items?.[0]?.articles || []).filter((item) => normalWiki(item.article)).slice(0, 100);
  const previousRanks = new Map(previous.map((item, index) => [item.article, index + 1]));
  const risers = current.map((item, index) => {
    const rank = index + 1;
    const oldRank = previousRanks.get(item.article);
    return { ...item, rank, oldRank, jump: (oldRank || 101) - rank };
  }).sort((a, b) => b.jump - a.jump).slice(0, 4);

  const quakes = quakeDay?.features || [];
  const weeklyAverage = (quakeWeek?.features?.length || quakes.length * 7) / 7;
  const strongest = [...quakes].sort((a, b) => (b.properties.mag || 0) - (a.properties.mag || 0))[0];
  const quakePercent = Math.round(((quakes.length - weeklyAverage) / Math.max(weeklyAverage, 1)) * 100);

  const categoryCounts = new Map();
  for (const event of eonet?.events || []) {
    for (const category of event.categories || []) {
      categoryCounts.set(category.title, (categoryCounts.get(category.title) || 0) + 1);
    }
  }
  const categoryNames = {
    Wildfires: "山火事", "Sea and Lake Ice": "海氷・湖氷", "Severe Storms": "激しい嵐",
    Volcanoes: "火山", Floods: "洪水", Drought: "干ばつ", DustHaze: "砂じん",
  };
  const categories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const kpRecent = (kp || []).slice(-180).map((item) => Number(item.kp_index)).filter(Number.isFinite);
  const kpMax = kpRecent.length ? Math.max(...kpRecent) : 0;

  const stories = [];
  for (const item of risers) {
    stories.push({
      genre: "みんなの注目",
      title: readableTitle(item.article),
      takeaway: item.oldRank
        ? `英語版Wikipediaで${item.oldRank}位から${item.rank}位へ。${Number(item.views).toLocaleString("ja-JP")}閲覧`
        : `英語版Wikipedia上位100圏外から${item.rank}位へ。${Number(item.views).toLocaleString("ja-JP")}閲覧`,
    });
  }
  stories.push({
    genre: "地球の動き", title: "世界の地震、きょうは多い？少ない？",
    takeaway: `直近24時間は${quakes.length}件。7日間の日平均${Math.round(weeklyAverage)}件より${Math.abs(quakePercent)}％${quakePercent >= 0 ? "多い" : "少ない"}`,
  });
  stories.push({
    genre: "地震", title: `きょう最大の地震はM${Number(strongest?.properties?.mag || 0).toFixed(1)}`,
    takeaway: `${strongest?.properties?.place || "場所を確認中"}付近。規模と被害の大きさは同じ意味ではありません`,
  });
  for (const [name, count] of categories) {
    stories.push({
      genre: "自然現象", title: `NASAが追う「${categoryNames[name] || name}」`,
      takeaway: `直近30日の進行中イベントで${count}件`,
    });
  }
  stories.push({
    genre: "宇宙天気", title: kpMax >= 5 ? "宇宙の天気に乱れ" : "宇宙の天気は穏やか",
    takeaway: `直近約3時間の最大Kp指数は${kpMax.toFixed(1)}。Kpは0〜9の指標`,
  });

  const topCategory = categories[0] || ["自然現象", 0];
  const dateParts = japaneseDateParts();
  return {
    ...dateParts,
    mood: `注目・地震・${categoryNames[topCategory[0]] || topCategory[0]}。公開データで世界を見比べた日。`,
    summary: `Wikipediaの急上昇、世界の地震${quakes.length}件、NASAが追跡する${categoryNames[topCategory[0]] || topCategory[0]}${topCategory[1]}件を記録しました。数値の同時変化は因果関係を意味しません。`,
    stories: stories.slice(0, 10).map((story, index) => ({ number: index + 1, ...story })),
  };
}

const existing = JSON.parse(await readFile(archivePath, "utf8"));
const today = await collectDay();
const next = [today, ...existing.filter((item) => item.date !== today.date)]
  .sort((a, b) => b.date.localeCompare(a.date));
await writeFile(archivePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Saved ${today.date}: ${today.stories.length} stories`);
