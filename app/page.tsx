export const revalidate = 3600;

type Story = {
  genre: string;
  icon: string;
  hook: string;
  whatType: string;
  meter: number;
  meterLabel: string;
  caution: string;
  researchQuestion: string;
  researchSteps: string[];
  title: string;
  original?: string;
  summary: string;
  background: string;
  whyNow: string;
  before: string;
  now: string;
  change: string;
  source: string;
  sourceLabel: string;
  score: number;
  note: string;
  relatedNews?: {
    headline: string;
    source: string;
    date: string;
    url: string;
  }[];
};

async function getJson(url: string) {
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "ODD-HOURS/3.0 (daily public-data digest)" },
    } as RequestInit & { next: { revalidate: number } });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function getText(url: string) {
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "ODD-HOURS/4.1 (context research)" },
    } as RequestInit & { next: { revalidate: number } });
    return response.ok ? await response.text() : "";
  } catch {
    return "";
  }
}

function decodeXml(value: string) {
  return value
    .replaceAll("<![CDATA[", "").replaceAll("]]>", "")
    .replaceAll("&amp;", "&").replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

async function relatedNews(title: string) {
  const xml = await getText(
    `https://news.google.com/rss/search?q=${encodeURIComponent(`"${title}" when:3d`)}&hl=en&gl=US&ceid=US:en`,
  );
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3);
  return Promise.all(items.map(async (match) => {
    const body = match[1];
    const rawHeadline = decodeXml(body.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const source = decodeXml(body.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "報道機関");
    const url = decodeXml(body.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
    const pubDate = body.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
    const translated = await translateToJapanese(rawHeadline.replace(new RegExp(`\\s+-\\s+${source}$`), ""));
    return {
      headline: translated || rawHeadline,
      source,
      date: pubDate ? new Intl.DateTimeFormat("ja-JP", {
        month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
        timeZone: "Asia/Tokyo",
      }).format(new Date(pubDate)) : "日時不明",
      url,
    };
  }));
}

function day(ago: number) {
  const date = new Date(Date.now() - ago * 86_400_000);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ];
}

function normalWiki(article: string) {
  return !/^(Main_Page|Special:|Wikipedia:|File:|Portal:|Cookie)/.test(article);
}

function sourceInJapanese(story: Story) {
  if (story.source.includes("wikipedia.org")) {
    return `Wikimediaが集計した英語版Wikipediaの閲覧順位と閲覧回数です。このサイトでは項目名・人物や作品の概要・前日からの順位変化を日本語にして掲載しています。`;
  }
  if (story.source.includes("earthquake.usgs.gov")) {
    return "米国地質調査所（USGS）の観測記録です。このサイトでは場所、規模、24時間件数、7日平均との違いを日本語で整理しています。";
  }
  if (story.source.includes("eonet.gsfc.nasa.gov")) {
    return "NASA EONETの進行中イベントです。このサイトでは英語の分類名と主な登録例を日本語にし、直近30日の件数として整理しています。";
  }
  return "NOAA宇宙天気予報センターのKp指数です。このサイトでは地球の磁場の乱れを0〜9の日本語の目安に直して説明しています。";
}

function regionFor(story: Story) {
  const text = `${story.title} ${story.summary} ${story.background}`;
  const regions: [RegExp, string][] = [
    [/インド|Indian|New Delhi|ニューデリー/i, "インド（主な出来事はニューデリー）"],
    [/ギリシャ|Greek|Greece/i, "ギリシャ"],
    [/Alaska|アラスカ/i, "米国・アラスカ周辺"],
    [/Vanuatu|バヌアツ/i, "バヌアツ周辺"],
    [/Argentina|アルゼンチン|Ushuaia/i, "アルゼンチン南方"],
    [/アメリカ|American|United States/i, "米国"],
    [/Scotland|Glasgow|スコットランド|グラスゴー/i, "英国・スコットランド"],
  ];
  const match = regions.find(([pattern]) => pattern.test(text));
  if (match) return match[1];
  if (story.source.includes("earthquake.usgs.gov")) return "世界全体／記載された震源周辺";
  if (story.source.includes("eonet.gsfc.nasa.gov")) return "世界全体";
  if (story.source.includes("swpc.noaa.gov")) return "地球周辺の宇宙空間";
  return "地域別アクセスは取得できません（英語版Wikipedia全体）";
}

function meaningFor(story: Story) {
  if (/Cockroach Janta Party/i.test(story.title)) {
    return "「ゴキブリ人民党」。インドの若者が始めた、風刺と抗議を組み合わせた政治運動です。";
  }
  if (story.original) return `${story.title}。英語名は「${story.original}」で、${story.whatType}です。`;
  return `${story.title}は、${story.whatType}を扱う項目です。`;
}

function metricFor(story: Story) {
  return story.source.includes("wikipedia.org")
    ? `${story.note}（英語版Wikipedia全体）`
    : `${story.now}（${story.note}）`;
}

function resultReasonFor(story: Story) {
  const news = story.relatedNews?.[0];
  if (news) {
    return `同じ時期に「${news.headline}」と報じられました。順位上昇との関係は有力な手がかりですが、直接原因とまでは断定していません。`;
  }
  if (story.source.includes("wikipedia.org")) {
    return "閲覧順位は上がりましたが、対応する報道を確認できませんでした。原因は不明です。";
  }
  return story.whyNow;
}

async function translateToJapanese(text: string) {
  if (!text) return "";
  const data = await getJson(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text.slice(0, 1800))}`,
  );
  return Array.isArray(data?.[0])
    ? data[0].map((part: any[]) => part?.[0] || "").join("")
    : "";
}

async function wikiDetails(article: string) {
  const query = await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=langlinks%7Cpageprops&lllang=ja&lllimit=1&titles=${encodeURIComponent(article)}`,
  );
  const page: any = Object.values(query?.query?.pages || {})[0];
  const japaneseTitle = page?.langlinks?.[0]?.["*"];
  const summary = japaneseTitle
    ? await getJson(`https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(japaneseTitle)}`)
    : await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`);
  const translatedExtract = japaneseTitle ? "" : await translateToJapanese(summary?.extract || "");
  const translatedDescription = japaneseTitle ? "" : await translateToJapanese(summary?.description || "");
  const displayTitle = summary?.titles?.normalized || japaneseTitle || article.replaceAll("_", " ");
  return {
    title: displayTitle,
    original: article.replaceAll("_", " "),
    summary:
      translatedExtract ||
      summary?.extract ||
      translatedDescription ||
      summary?.description ||
      "急に検索・閲覧が増えた項目です。詳しい人物像や出来事は、参照元の公開情報で確認できます。",
    description: translatedDescription || summary?.description || "",
    relatedNews: await relatedNews(displayTitle),
  };
}

async function collectStories(): Promise<Story[]> {
  const [todayWiki, yesterdayWiki, quakeDay, quakeWeek, eonet, kp] = await Promise.all([
    getJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/${day(2).join("/")}`),
    getJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/${day(3).join("/")}`),
    getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"),
    getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson"),
    getJson("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=200"),
    getJson("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"),
  ]);

  const stories: Story[] = [];
  const current = (todayWiki?.items?.[0]?.articles || [])
    .filter((item: any) => normalWiki(item.article))
    .slice(0, 50);
  const previous = (yesterdayWiki?.items?.[0]?.articles || []).filter((item: any) =>
    normalWiki(item.article),
  );
  const oldRanks = new Map(previous.map((item: any, index: number) => [item.article, index + 1]));
  const rising = current
    .map((item: any, index: number) => ({
      ...item,
      rank: index + 1,
      old: oldRanks.get(item.article) as number | undefined,
    }))
    .map((item: any) => ({ ...item, jump: item.old ? item.old - item.rank : 100 - item.rank }))
    .sort((a: any, b: any) => b.jump - a.jump)[0];

  if (rising) {
    const info = await wikiDetails(rising.article);
    const original = info.title !== info.original ? info.original : undefined;
    stories.push({
      genre: "みんなが急に調べたもの",
      icon: "🔎",
      hook: rising.old
        ? `英語版Wikipediaで、前日${rising.old}位から今日${rising.rank}位へ`
        : `英語版Wikipediaで、前日の上位圏外から今日${rising.rank}位へ`,
      whatType: info.description || "人物・作品・場所などの注目項目",
      meter: Math.max(8, Math.round((1 - rising.rank / Math.max(rising.old || 100, 1)) * 100)),
      meterLabel: "前日順位から、どれだけ上がった？",
      caution: "閲覧数が増えた理由は、順位データだけでは断定できません。ニュース、公開日、記念日などを別の資料で確かめる必要があります。",
      researchQuestion: `なぜ「${info.title}」は、この日に急に調べられたのだろう？`,
      researchSteps: ["名前をニュース検索する", "出来事の日付を時系列に並べる", "閲覧順位が上がった日と重ねる"],
      title: info.title,
      original,
      summary: info.summary,
      background: info.description
        ? `${info.title}は「${info.description}」として紹介されている項目です。上の文章では、初見でも人物・作品・場所のどれなのか分かるように概要をまとめています。`
        : "英語版Wikipediaで閲覧が急増した人物・作品・場所のうち、前日からの順位変化が大きい項目です。",
      whyNow:
        "前日の順位と比べて大きく上昇しました。ニュースや記念日、作品公開などがきっかけの可能性はありますが、閲覧数だけでは原因を断定できません。",
      before: rising.old ? `${rising.old}位` : "上位圏外",
      now: `${rising.rank}位`,
      change: rising.old ? `${rising.jump}位アップ` : "急上昇",
      source: `https://en.wikipedia.org/wiki/${encodeURIComponent(rising.article)}`,
      sourceLabel: "元データと詳細を見る",
      score: Math.min(100, 50 + rising.jump),
      note: `${Number(rising.views || 0).toLocaleString("ja-JP")}回閲覧`,
      relatedNews: info.relatedNews,
    });
  }

  const extraRisers = current
    .map((item: any, index: number) => ({
      ...item,
      rank: index + 1,
      old: oldRanks.get(item.article) as number | undefined,
    }))
    .map((item: any) => ({ ...item, jump: item.old ? item.old - item.rank : 100 - item.rank }))
    .sort((a: any, b: any) => b.jump - a.jump)
    .slice(1, 4);
  const extraWikiDetails = await Promise.all(extraRisers.map((item: any) => wikiDetails(item.article)));
  extraRisers.forEach((item: any, index: number) => {
    const info = extraWikiDetails[index];
    stories.push({
      genre: "みんなが急に調べたもの",
      icon: ["🎬", "👤", "📚"][index] || "🔎",
      hook: item.old
        ? `英語版Wikipediaで、前日${item.old}位から今日${item.rank}位へ`
        : `英語版Wikipediaで、前日の上位圏外から今日${item.rank}位へ`,
      whatType: info.description || "人物・作品・場所などの注目項目",
      meter: Math.max(8, Math.round((1 - item.rank / Math.max(item.old || 100, 1)) * 100)),
      meterLabel: "前日順位から、どれだけ上がった？",
      caution: "検索順位の上昇だけでは、注目された原因は断定できません。複数のニュースや日付を照らし合わせます。",
      researchQuestion: `なぜ「${info.title}」は、この日に世界から注目されたのだろう？`,
      researchSteps: ["名前と日付を一緒に検索する", "複数の記事に共通する出来事を探す", "閲覧順位の変化と時系列を重ねる"],
      title: info.title,
      original: info.title !== info.original ? info.original : undefined,
      summary: info.summary,
      background: info.description
        ? `${info.title}は「${info.description}」として紹介されている項目です。人物・作品・場所のどれなのかを、まずここで確認します。`
        : "英語版Wikipediaで、前日より閲覧順位が大きく上がった項目です。",
      whyNow: `前日の${item.old || "上位圏外"}から${item.rank}位へ上昇しました。関連報道や公開日などが考えられますが、順位だけでは原因を断定できません。`,
      before: item.old ? `${item.old}位` : "上位圏外",
      now: `${item.rank}位`,
      change: item.old ? `${item.jump}位アップ` : "急上昇",
      source: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.article)}`,
      sourceLabel: "元データと詳細を見る",
      score: Math.min(94, 45 + item.jump),
      note: `${Number(item.views || 0).toLocaleString("ja-JP")}回閲覧`,
      relatedNews: info.relatedNews,
    });
  });

  const dayQuakes = quakeDay?.features || [];
  const weekQuakes = quakeWeek?.features || [];
  const dailyAverage = weekQuakes.length / 7 || dayQuakes.length || 1;
  const strongest = [...dayQuakes].sort(
    (a: any, b: any) => (b.properties.mag || 0) - (a.properties.mag || 0),
  )[0];
  const difference = dayQuakes.length - dailyAverage;
  const percent = Math.round((difference / dailyAverage) * 100);

  if (strongest) {
    stories.push({
      genre: "地球の動き",
      icon: "🌍",
      hook:
        Math.abs(percent) < 12
          ? "きょうの地球は、ほぼ平常運転"
          : percent > 0
            ? `いつもより約${percent}%、よく揺れた`
            : `いつもより約${Math.abs(percent)}%、静かだった`,
      whatType: "世界中で観測された地震の件数",
      meter: Math.min(100, Math.round((dayQuakes.length / Math.max(dailyAverage, 1)) * 100)),
      meterLabel: "1週間の日平均を100とすると",
      caution: "件数が多い日ほど危険とは限りません。規模、深さ、震源地、人口密度によって影響は大きく変わります。",
      researchQuestion: "地震の『多さ』と『被害の大きさ』は同じだろうか？",
      researchSteps: ["件数と最大マグニチュードを記録する", "震源の深さと場所を地図で見る", "1週間続けて違いを比べる"],
      title: "世界の地震、きょうは多い？少ない？",
      summary: `直近24時間に世界で${dayQuakes.length}件の地震が観測されました。最大は${strongest.properties.place}付近のマグニチュード${strongest.properties.mag?.toFixed(1)}です。`,
      background:
        "米国地質調査所（USGS）が公開する世界の観測記録です。ここで数えているのは報告された地震の件数で、被害の大きさや日本への危険度を示す数字ではありません。",
      whyNow:
        Math.abs(percent) < 12
          ? "直近1週間の日平均とほぼ同じ水準です。「大きな変化がない」ことも、昨日との違いを測る基準になります。"
          : percent > 0
            ? `発生件数が直近1週間の日平均より${percent}%多く、地球の揺れが普段より活発な1日です。`
            : `発生件数が直近1週間の日平均より${Math.abs(percent)}%少なく、比較的静かな1日です。`,
      before: `日平均 ${Math.round(dailyAverage)}件`,
      now: `${dayQuakes.length}件`,
      change: `${difference >= 0 ? "+" : ""}${Math.round(difference)}件`,
      source: strongest.properties.url,
      sourceLabel: "USGSの観測を見る",
      score: Math.min(
        100,
        Math.round(35 + Math.abs(percent) + (strongest.properties.mag || 0) * 5),
      ),
      note: "危険度ではなく活動量の変化",
    });
  }

  if (strongest) {
    const magnitude = Number(strongest.properties.mag || 0);
    stories.push({
      genre: "24時間で最大の地震",
      icon: "📍",
      hook: `最大はマグニチュード${magnitude.toFixed(1)}`,
      whatType: "直近24時間で最も規模が大きかった地震",
      meter: Math.min(100, Math.round((magnitude / 9) * 100)),
      meterLabel: "マグニチュード9を100とした目安",
      caution: "マグニチュードは地震そのものの規模です。各地で感じる揺れの強さを表す震度とは異なります。",
      researchQuestion: "マグニチュードと震度は、どう違うのだろう？",
      researchSteps: ["地震の規模と揺れ方の定義を調べる", "震源の深さと距離を確認する", "同じ規模でも震度が違う例を比べる"],
      title: `きょう最大の地震は、${strongest.properties.place}付近`,
      summary: `直近24時間で最大だったのは、${strongest.properties.place}付近で観測されたマグニチュード${magnitude.toFixed(1)}の地震です。`,
      background: "USGSが世界中の観測点からまとめている地震記録です。場所、深さ、時刻、規模を確認できます。",
      whyNow: "直近24時間の観測記録をマグニチュード順に並べ、最上位の地震を取り上げました。",
      before: "M5.0",
      now: `M${magnitude.toFixed(1)}`,
      change: `+${Math.max(0, magnitude - 5).toFixed(1)}`,
      source: strongest.properties.url,
      sourceLabel: "震源と詳細を見る",
      score: Math.round(32 + magnitude * 6),
      note: "規模と被害は同じ意味ではありません",
    });
  }

  const events = eonet?.events || [];
  const counts = new Map<string, number>();
  events.forEach((event: any) =>
    event.categories?.forEach((category: any) =>
      counts.set(category.title, (counts.get(category.title) || 0) + 1),
    ),
  );
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const categoryJa: Record<string, string> = {
    Wildfires: "山火事",
    Volcanoes: "火山活動",
    "Severe Storms": "激しい嵐",
    Floods: "洪水",
    "Sea and Lake Ice": "海氷・湖氷",
    Drought: "干ばつ",
    DustHaze: "砂じん・煙霧",
  };
  const rankedCategories = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const categoryExamples = new Map<string, string>(
    await Promise.all(rankedCategories.slice(0, 3).map(async ([category]) => {
      const titles = events
        .filter((event: any) => event.categories?.some((item: any) => item.title === category))
        .slice(0, 3)
        .map((event: any) => event.title)
        .join("、");
      return [category, (await translateToJapanese(titles)) || titles] as [string, string];
    })),
  );

  if (dominant) {
    const average = Math.round(events.length / Math.max(counts.size, 1));
    const label = categoryJa[dominant[0]] || dominant[0];
    stories.push({
      genre: "衛星が見ている自然現象",
      icon: "🛰️",
      hook: `いま見える自然現象の約${Math.round((dominant[1] / Math.max(events.length, 1)) * 10)}割が${label}`,
      whatType: "衛星で追跡中の自然現象",
      meter: Math.round((dominant[1] / Math.max(events.length, 1)) * 100),
      meterLabel: `進行中イベントに占める${label}の割合`,
      caution: "NASA EONETに登録された件数の比較です。世界で起きた全ての自然現象を数えたものではありません。",
      researchQuestion: `なぜ今、${label}がほかの自然現象より多く見えているのだろう？`,
      researchSteps: ["発生地点を世界地図に印をつける", "季節や気温との関係を調べる", "1か月後に同じ分類をもう一度数える"],
      title: `いま目立つ自然現象は「${label}」`,
      summary: `NASAの公開データでは、直近30日の進行中イベント${events.length}件のうち、${dominant[1]}件が「${label}」に分類されています。主な登録例は「${categoryExamples.get(dominant[0]) || "取得できませんでした"}」です。`,
      background:
        "NASA EONETは、山火事・火山・嵐・洪水など、衛星画像で追跡できる自然現象を世界規模で整理した公開データです。",
      whyNow: `全カテゴリーの単純平均${average}件に対して${dominant[1]}件まで集中しており、いまの観測画面で最も目立っています。`,
      before: `分類平均 ${average}件`,
      now: `${dominant[1]}件`,
      change: `全体の${Math.round((dominant[1] / Math.max(events.length, 1)) * 100)}%`,
      source: "https://eonet.gsfc.nasa.gov/",
      sourceLabel: "NASAの観測を見る",
      score: Math.min(100, Math.round(40 + (dominant[1] / Math.max(events.length, 1)) * 100)),
      note: "進行中イベントの集中度",
    });
  }

  const extraCategories = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(1, 3);
  extraCategories.forEach(([category, count], index) => {
    const label = categoryJa[category] || category;
    const share = Math.round((count / Math.max(events.length, 1)) * 100);
    stories.push({
      genre: "衛星が見ている自然現象",
      icon: index === 0 ? "🌋" : "🌪️",
      hook: `世界で追跡中の「${label}」は${count}件`,
      whatType: `NASAが追跡している${label}`,
      meter: share,
      meterLabel: `進行中イベントに占める${label}の割合`,
      caution: "登録数は観測条件やデータ更新の影響を受けます。実際に発生した全件を表す数字ではありません。",
      researchQuestion: `${label}は世界のどの地域に集まっているのだろう？`,
      researchSteps: ["発生地点を地図に印をつける", "緯度や季節の共通点を探す", "別の月と件数を比べる"],
      title: `衛星が追う「${label}」、いま世界で${count}件`,
      summary: `NASA EONETに登録された直近30日の進行中イベントでは、「${label}」が${count}件あります。全体の約${share}%です。主な登録例は「${categoryExamples.get(category) || "取得できませんでした"}」です。`,
      background: `人工衛星などで確認された自然現象のうち、「${label}」に分類された進行中イベントです。`,
      whyNow: `現在のNASA EONETデータを分類別に数え、件数が上位になったため選びました。`,
      before: "分類平均",
      now: `${count}件`,
      change: `全体の${share}%`,
      source: "https://eonet.gsfc.nasa.gov/",
      sourceLabel: "NASAの地図を見る",
      score: 38 - index,
      note: "NASA EONETの進行中イベント",
    });
  });

  const rows = kp || [];
  const values = rows.map((row: any) => Number(row.kp_index) || 0);
  const average = values.reduce((sum: number, value: number) => sum + value, 0) / Math.max(values.length, 1);
  const maximum = Math.max(...values.slice(-180), 0);
  stories.push({
    genre: "宇宙から届いた変化",
    icon: "☀️",
    hook: maximum >= 5 ? "見えないところで、地球の磁場がざわざわ" : "宇宙はきょう、のんびりモード",
    whatType: "太陽の影響で変化する地球の磁場",
    meter: Math.min(100, Math.round((maximum / 9) * 100)),
    meterLabel: "最大9のKp指数に対する現在値",
    caution: "Kp指数が少し上がっただけで、生活へすぐ影響が出るわけではありません。公式の警報とは分けて見ます。",
    researchQuestion: "Kp指数が上がると、オーロラの見える場所はどう変わる？",
    researchSteps: ["毎日の最大Kp指数を記録する", "オーロラの報告地点を調べる", "太陽活動との時間差を比べる"],
    title: maximum >= 5 ? "地球の磁場が少し荒れています" : "宇宙の天気は穏やかです",
    summary: `地球の磁場の乱れを表すKp指数は、直近約3時間の最大が${maximum.toFixed(1)}でした。Kpは0〜9で、数字が大きいほど磁場が乱れています。`,
    background:
      "太陽から届く粒子は、オーロラの見え方や、強い場合には衛星通信・電力網などに影響します。NOAAが宇宙天気として継続観測しています。",
    whyNow:
      maximum >= 5
        ? "地磁気嵐の目安であるKp5に達したためです。"
        : "大きな異常はありません。静かな日の数値を知ると、荒れた日の変化が分かりやすくなります。",
    before: `配信平均 ${average.toFixed(1)}`,
    now: `最大 ${maximum.toFixed(1)}`,
    change: `${maximum >= average ? "+" : ""}${(maximum - average).toFixed(1)}`,
    source: "https://www.swpc.noaa.gov/",
    sourceLabel: "NOAAの宇宙天気を見る",
    score: Math.round(20 + maximum * 12),
    note: "Kp指数の平均との差",
  });

  const sorted = stories.sort((a, b) => b.score - a.score);
  const top: Story[] = [];
  for (const story of sorted) {
    if (!top.some(item => item.genre === story.genre)) top.push(story);
    if (top.length === 3) break;
  }
  const rest = sorted.filter(story => !top.includes(story));
  return [...top, ...rest].slice(0, 10);
}

export default async function Home() {
  const stories = await collectStories();
  const stamp = new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date());
  const shareText = encodeURIComponent("昨日と比べて、世界は何が変わった？ 今日の変化を3つだけ。 #ODDHOURS");

  return (
    <main>
      <header>
        <a href="#top" className="logo">ODD HOURS</a>
        <div className="header-actions"><a href="/archive">あの日の世界</a><span>{stamp}号</span></div>
      </header>

      <section className="hero" id="top">
        <nav className="mode-switch" aria-label="今日と過去の切り替え">
          <a href="#today" className="active"><small>NOW</small><strong>今日を見る</strong><span>最新の10項目</span></a>
          <a href="/archive"><small>ARCHIVE</small><strong>過去を見る</strong><span>年・月・日から探す →</span></a>
        </nav>
        <div className="tape">毎朝更新・自由研究みたいな世界ニュース</div>
        <p className="eyebrow">きのうとくらべる、30秒の世界観察</p>
        <h1>世界はきょう、<br /><em>こうなった！</em></h1>
        <p className="lead">
          むずかしいニュースは、いったん置いておこう。<br />
          まずは大きな変化を3つ。もっと見たい人には、あと7つ用意しました。
        </p>
        <div className="promise">
          <span>① なにが？</span><span>② どれくらい？</span><span>③ どうして？</span>
        </div>
        <nav className="jump" id="today" aria-label="今日の10項目">
          {stories.map((story, index) => (
            <a href={`#story-${index + 1}`} key={story.title}>
              <b>0{index + 1}</b><span>{story.title}</span>
            </a>
          ))}
        </nav>
      </section>

      <section className="selection-guide" id="how-we-choose">
        <div className="selection-heading">
          <span>どうやって選ぶの？</span>
          <h2>「有名だから」ではなく、<br />いつもとの差で選びます。</h2>
          <p>危険度ランキングではありません。前日や短期平均から見て、数字の動きが大きかったものを「違和感」として拾います。</p>
        </div>
        <div className="selection-steps">
          <article><b>1</b><small>集める</small><h3>4つの一次データ</h3><p>Wikimediaの閲覧、USGSの地震、NASAの自然現象、NOAAの宇宙天気を毎朝取得。</p></article>
          <article><b>2</b><small>くらべる</small><h3>前日・短期平均との差</h3><p>閲覧順位は前日、地震は7日平均、自然現象は30日内の構成、宇宙天気は直近値で比較。</p></article>
          <article><b>3</b><small>しぼる</small><h3>ジャンルを分けて10選</h3><p>変化の大きさを点数化。上位3件は同じ種類ばかりにならないよう、異なる分野から選びます。</p></article>
        </div>
        <div className="selection-caution"><b>大事なルール</b><span>同じ日に複数の数字が動いても、因果関係があるとは断定しません。欠測は欠測として扱います。</span></div>
      </section>

      <section className="stories" aria-label="今日の変化10選">
        {stories.map((story, index) => (
          <article key={story.title} className={`story story-${index + 1}`} id={`story-${index + 1}`}>
            <div className="story-number"><small>観察</small>0{index + 1}</div>
            <div className="story-main">
              <span className={`tier ${index < 3 ? "top" : "more"}`}>
                {index < 3 ? "今日のベスト3" : "もっと見る7選"}
              </span>
              <span className="genre">{story.icon} {story.genre}</span>
              <h2>{story.title}</h2>
              {story.original && <p className="original">英語表記：{story.original}</p>}
              <section className="quick-profile" aria-label={`${story.title}の要点`}>
                <div className="meaning"><small>日本語ではどういう意味？</small><p>{meaningFor(story)}</p></div>
                <div><small>地域・対象範囲</small><strong>{regionFor(story)}</strong></div>
                <div><small>{story.source.includes("wikipedia.org") ? "アクセス数" : "観測値"}</small><strong>{metricFor(story)}</strong></div>
                <div><small>テーマ</small><strong>{story.genre}／{story.whatType}</strong></div>
              </section>
              <section className="quick-answer">
                <div><small>なぜピックアップ？</small><h3>{story.hook}</h3><p>{story.whyNow}</p></div>
                <div className={story.relatedNews?.length ? "reason-possible" : "reason-unknown"}>
                  <small>なぜこの結果になった？</small><p>{resultReasonFor(story)}</p>
                </div>
              </section>
              <p className="compare-title">数字でくらべると…</p>
              <div className="change" aria-label="変化の比較">
                <div><small>これまで・普段</small><b>{story.before}</b></div>
                <div className="arrow" aria-hidden="true">→</div>
                <div><small>きょう</small><b>{story.now}</b></div>
                <div className="answer"><small>つまり！</small><b>{story.change}</b></div>
              </div>
              <div className="foot">
                <span>{story.note}</span>
                <a href={story.source} target="_blank" rel="noreferrer">一次ソース原文を確認する ↗</a>
              </div>
              <details className="deep">
                <summary>根拠と詳しい解説を見る ＋</summary>
                <div className="deep-grid">
                  <section>
                    <span>知っておきたい背景</span>
                    <p>{story.background}</p>
                  </section>
                  <section>
                    <span>元データを日本語でいうと</span>
                    <p>{sourceInJapanese(story)}</p>
                  </section>
                  <section className="caution">
                    <span>ここは注意！</span>
                    <p>{story.caution}</p>
                  </section>
                </div>
                {story.relatedNews?.length ? (
                  <div className="evidence-detail">
                    <p>同じ名前を含む直近3日間の報道です。時期が重なっていても、アクセス増加の原因と証明されたわけではありません。</p>
                    <ol className="news-timeline">
                      {story.relatedNews.map((news, newsIndex) => (
                        <li key={`${news.url}-${newsIndex}`}>
                          <time>{news.date}</time>
                          <div><small>{news.source}</small><p>{news.headline}</p></div>
                          {news.url && <a href={news.url} target="_blank" rel="noreferrer">確認 ↗</a>}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </details>
              <aside className="research">
                <div className="research-head"><span>夏休みの課題研究に</span><b>この問いを調べてみよう</b></div>
                <h3>{story.researchQuestion}</h3>
                <ol>{story.researchSteps.map(step => <li key={step}>{step}</li>)}</ol>
              </aside>
            </div>
          </article>
        ))}
      </section>

      <section className="archive-invite">
        <div>
          <span>NEW・世界の観察日記</span>
          <h2>「あの日は何があった？」を<br />日付から探せます。</h2>
          <p>年・月・日を選ぶと、その日の注目、地球の動き、自然現象、宇宙天気を10個の発見で振り返れます。</p>
        </div>
        <a href="/archive"><b>2026</b><strong>過去の日付から見る →</strong><small>記録開始：7月25日</small></a>
      </section>

      <section className="share">
        <p>きょう、誰かに話したいのはどれ？</p>
        <h2>「知ってた？」から、<br />会話をはじめよう。</h2>
        <a href={`https://twitter.com/intent/tweet?text=${shareText}`} target="_blank" rel="noreferrer">
          今日の3つをXで共有する ↗
        </a>
      </section>

      <section className="about">
        <span>このサイトについて</span>
        <h2>大事件を当てる場所ではなく、<br />小さな変化に気づく場所。</h2>
        <p>
          公開データを毎日同じ方法で比べ、前日や普段との差を探します。
          数字の変化と原因は別物です。関連する出来事があっても、原因を断定せず、
          「確認できたこと」と「考えられること」を分けて紹介します。
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "ODD HOURS",
            description: "昨日と今日を比べ、世界の変化を3つだけ観察する学習サイト",
            inLanguage: "ja",
          }),
        }}
      />

      <footer>
        <b>ODD HOURS</b>
        <span>毎朝8時ごろ更新</span>
        <small>USGS・NASA・NOAA・Wikimediaの公開データを使用</small>
      </footer>
    </main>
  );
}
