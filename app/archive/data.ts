import generatedDays from "./generated.json";

export type ArchiveStory = { number: number; genre: string; title: string; takeaway: string };
export type ArchiveDay = {
  date: string; year: number; month: number; day: number; weekday: string;
  mood: string; summary: string; stories: ArchiveStory[];
};

const firstDay: ArchiveDay = {
  date: "2026-07-25", year: 2026, month: 7, day: 25, weekday: "土",
  mood: "注目・山火事・地震。遠く離れた出来事が、数字で一本につながった日。",
  summary: "検索の急上昇ではインド映画『Jana Nayagan』が目立ち、自然観測では山火事が大半を占めました。世界の地震活動は直近1週間の平均より静かでした。",
  stories: [
    { number: 1, genre: "みんなの注目", title: "Jana Nayagan", takeaway: "検索順位が前日から116位上昇" },
    { number: 2, genre: "自然現象", title: "いま目立つ自然現象は「山火事」", takeaway: "NASA観測の約9割が山火事" },
    { number: 3, genre: "地球の動き", title: "世界の地震、きょうは多い？少ない？", takeaway: "1週間平均より約24％少ない" },
    { number: 4, genre: "スポーツ", title: "2026年コモンウェルスゲームズ", takeaway: "開催日に合わせて注目が急上昇" },
    { number: 5, genre: "人物", title: "Jon-Erik Hexum", takeaway: "世界の検索上位へ突然浮上" },
    { number: 6, genre: "人物", title: "フリストス・ツォリス", takeaway: "ギリシャのサッカー選手に注目" },
    { number: 7, genre: "地震", title: "バヌアツ付近でM6.0", takeaway: "直近24時間で最大の地震" },
    { number: 8, genre: "自然現象", title: "世界の海氷・湖氷", takeaway: "NASAが13件を追跡中" },
    { number: 9, genre: "自然現象", title: "世界の激しい嵐", takeaway: "NASAが4件を追跡中" },
    { number: 10, genre: "宇宙天気", title: "宇宙の天気は穏やか", takeaway: "Kp指数は低い水準" },
  ],
};

export const archiveDays: ArchiveDay[] = [
  ...(generatedDays as ArchiveDay[]),
  firstDay,
].filter((item, index, all) => all.findIndex((other) => other.date === item.date) === index)
  .sort((a, b) => b.date.localeCompare(a.date));

export function getArchiveDay(date: string) {
  return archiveDays.find((item) => item.date === date);
}

export const archiveYears = [...new Set(archiveDays.map((item) => item.year))].sort((a, b) => b - a);
