export const dynamic = "force-dynamic";

type Story = {
  genre: string;
  icon: string;
  hook: string;
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
};

async function getJson(url: string) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "ODD-HOURS/3.0 (daily public-data digest)" },
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
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
  return {
    title: summary?.titles?.normalized || japaneseTitle || article.replaceAll("_", " "),
    original: article.replaceAll("_", " "),
    summary:
      translatedExtract ||
      summary?.extract ||
      translatedDescription ||
      summary?.description ||
      "急に検索・閲覧が増えた項目です。詳しい人物像や出来事は、参照元の公開情報で確認できます。",
    description: translatedDescription || summary?.description || "",
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
      hook: rising.old ? `たった1日で、${rising.jump}人抜き！` : "きのうまで圏外、きょう急浮上！",
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
    });
  }

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

  if (dominant) {
    const average = Math.round(events.length / Math.max(counts.size, 1));
    const label = categoryJa[dominant[0]] || dominant[0];
    stories.push({
      genre: "衛星が見ている自然現象",
      icon: "🛰️",
      hook: `いま見える自然現象の約${Math.round((dominant[1] / Math.max(events.length, 1)) * 10)}割が${label}`,
      title: `いま目立つ自然現象は「${label}」`,
      summary: `NASAの公開データでは、直近30日の進行中イベント${events.length}件のうち、${dominant[1]}件が「${label}」に分類されています。`,
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

  const rows = kp || [];
  const values = rows.map((row: any) => Number(row.kp_index) || 0);
  const average = values.reduce((sum: number, value: number) => sum + value, 0) / Math.max(values.length, 1);
  const maximum = Math.max(...values.slice(-180), 0);
  stories.push({
    genre: "宇宙から届いた変化",
    icon: "☀️",
    hook: maximum >= 5 ? "見えないところで、地球の磁場がざわざわ" : "宇宙はきょう、のんびりモード",
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

  return stories.sort((a, b) => b.score - a.score).slice(0, 3);
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
        <span>{stamp}号</span>
      </header>

      <section className="hero" id="top">
        <div className="tape">毎朝更新・自由研究みたいな世界ニュース</div>
        <p className="eyebrow">きのうとくらべる、30秒の世界観察</p>
        <h1>世界はきょう、<br /><em>こうなった！</em></h1>
        <p className="lead">
          むずかしいニュースは、いったん置いておこう。<br />
          「へえ！」と思える世界の変化を、きょうも3つだけ観察しました。
        </p>
        <div className="promise">
          <span>① なにが？</span><span>② どれくらい？</span><span>③ どうして？</span>
        </div>
        <nav className="jump" aria-label="今日の3項目">
          {stories.map((story, index) => (
            <a href={`#story-${index + 1}`} key={story.title}>
              <b>0{index + 1}</b><span>{story.title}</span>
            </a>
          ))}
        </nav>
      </section>

      <section className="stories" aria-label="今日の変化3選">
        {stories.map((story, index) => (
          <article key={story.title} className={`story story-${index + 1}`} id={`story-${index + 1}`}>
            <div className="story-number"><small>観察</small>0{index + 1}</div>
            <div className="story-main">
              <span className="genre">{story.icon} {story.genre}</span>
              <h2>{story.title}</h2>
              {story.original && <p className="original">英語表記：{story.original}</p>}
              <div className="discovery">
                <span>きょうの発見！</span>
                <strong>{story.hook}</strong>
              </div>
              <p className="summary">{story.summary}</p>
              <div className="explain">
                <div>
                  <b><i>1</i> そもそも、これは何？</b>
                  <p>{story.background}</p>
                </div>
                <div>
                  <b><i>2</i> どうして目立った？</b>
                  <p>{story.whyNow}</p>
                </div>
              </div>
              <p className="compare-title">数字でくらべると…</p>
              <div className="change" aria-label="変化の比較">
                <div><small>これまで・普段</small><b>{story.before}</b></div>
                <div className="arrow" aria-hidden="true">→</div>
                <div><small>きょう</small><b>{story.now}</b></div>
                <div className="answer"><small>つまり！</small><b>{story.change}</b></div>
              </div>
              <div className="foot">
                <span>{story.note}</span>
                <a href={story.source} target="_blank" rel="noreferrer">{story.sourceLabel} ↗</a>
              </div>
            </div>
          </article>
        ))}
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

      <footer>
        <b>ODD HOURS</b>
        <span>毎朝8時ごろ更新</span>
        <small>USGS・NASA・NOAA・Wikimediaの公開データを使用</small>
      </footer>
    </main>
  );
}
