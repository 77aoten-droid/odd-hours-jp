import Link from "next/link";
import { archiveDays, archiveYears } from "./data";

export const metadata = {
  title: "あの日の世界｜ODD HOURS",
  description: "年・月・日から、世界で何が注目され、何が変化した日だったのかを振り返る記録帳。",
};

export default function ArchivePage() {
  const latest = archiveDays[0];
  return <main className="archive-page">
    <header><Link href="/" className="logo">ODD HOURS</Link><Link href="/" className="header-link">今日を見る</Link></header>
    <section className="archive-hero">
      <span className="archive-kicker">世界の観察日記</span>
      <h1>あの日、世界は<br /><em>どうだった？</em></h1>
      <p>ニュースの見出しではなく、その日に人々が何を調べ、地球や宇宙で何が動いたのかを10個の発見で残します。</p>
      <div className="archive-note"><b>記録は2026年7月25日から。</b><span>存在しない過去は作らず、観測した日だけを少しずつ増やします。</span></div>
    </section>
    <section className="archive-dashboard" aria-label="アーカイブの使い方">
      <div><small>保存済み</small><strong>{archiveDays.length}<span>日分</span></strong><p>毎朝、新しい日付が増えます</p></div>
      <div><small>いちばん新しい記録</small><strong>{latest.month}月{latest.day}日</strong><Link href={`/archive/${latest.date}`}>最新の10選を見る →</Link></div>
      <div className="archive-howto"><small>見かた</small><p><b>年</b>を選ぶ → <b>月</b>を選ぶ → 読みたい<b>日付</b>を押す</p></div>
    </section>
    <section className="archive-years" aria-label="年別アーカイブ">
      {archiveYears.map((year) => {
        const days = archiveDays.filter((item) => item.year === year);
        const months = [...new Set(days.map((item) => item.month))].sort((a, b) => b - a);
        return <section className="year-block" key={year}>
          <div className="year-title"><small>YEAR</small><strong>{year}</strong><span>{days.length}日分の記録</span></div>
          {months.map((month) => <div className="month-block" key={month}>
            <h2>{month}月 <small>{days.filter((item) => item.month === month).length}日</small></h2>
            <div className="day-grid">{days.filter((item) => item.month === month).map((item) =>
              <Link href={`/archive/${item.date}`} className="day-card" key={item.date}>
                <div className="calendar-date"><b>{item.day}</b><span>{item.weekday}</span></div>
                <div><strong>{item.mood}</strong><p>{item.summary}</p><span className="read-day">この日の10選を見る →</span></div>
              </Link>)}</div>
          </div>)}
        </section>;
      })}
    </section>
  </main>;
}
