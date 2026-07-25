import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveDays, getArchiveDay } from "../data";

export function generateStaticParams() {
  return archiveDays.map((item) => ({ date: item.date }));
}

export default async function ArchiveDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const item = getArchiveDay(date);
  if (!item) notFound();
  return <main className="archive-page day-page">
    <header><Link href="/" className="logo">ODD HOURS</Link><Link href="/archive" className="header-link">日付から探す</Link></header>
    <section className="day-hero">
      <Link href="/archive" className="back-link">← 世界の観察日記へ</Link>
      <p className="day-label">あの日の世界・10の発見</p>
      <div className="big-date"><b>{item.year}</b><strong>{String(item.month).padStart(2, "0")}.{String(item.day).padStart(2, "0")}</strong><span>（{item.weekday}）</span></div>
      <h1>{item.mood}</h1><p>{item.summary}</p>
    </section>
    <section className="day-stories" aria-label={`${item.date}の10項目`}>
      {item.stories.map((story) => <article key={story.number}>
        <span className="archive-number">{String(story.number).padStart(2, "0")}</span>
        <div><small>{story.genre}</small><h2>{story.title}</h2><p>{story.takeaway}</p></div>
      </article>)}
    </section>
    <section className="day-ending"><span>この日を一言でいうと</span><h2>{item.mood}</h2><Link href="/">今日の世界を見る →</Link></section>
  </main>;
}
