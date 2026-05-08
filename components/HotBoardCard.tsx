import Link from "next/link";
import { QUOTE_PLACEHOLDER } from "@/lib/reviewQuote";

export type HotBoardTopItem = {
  id: string;
  name: string;
  avgRating: number;
  imageUrl?: string;
  /** 引号内展示：点赞最高的评论摘要，由接口计算 */
  quoteSnippet?: string;
  reviewCount?: number;
};

type HotBoardCardProps = {
  id: string;
  title: string;
  description?: string | null;
  participantCount: number;
  topItems: HotBoardTopItem[];
  /** 0–5 循环，用于头部不同渐变 */
  tone?: number;
};

export function StarMeter({ value, className }: { value: number; className?: string }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      className={["score-star-meter", className].filter(Boolean).join(" ")}
      aria-label={`评分 ${value.toFixed(1)} / 5`}
    >
      <span className="score-star-base">★★★★★</span>
      <span className="score-star-fill" style={{ width: `${percent}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

export function HotBoardCard({
  id,
  title,
  description: boardDesc,
  participantCount,
  topItems,
  tone = 0
}: HotBoardCardProps) {
  const list = topItems.slice(0, 3);
  const toneClass = `hot-board-card-hero--tone-${Math.abs(tone) % 6}`;

  return (
    <Link href={`/boards/${id}`} className="hot-board-card-link">
      <article className="hot-board-card">
        <header className={`hot-board-card-hero ${toneClass}`}>
          <div className="hot-board-card-hero-main">
            <h3 className="hot-board-card-title">{title}</h3>
            {participantCount > 0 ? (
              <div className="hot-board-hero-badge">
                <span className="hot-board-hero-badge-star" aria-hidden>
                  ★
                </span>
                <span>{participantCount} 评分</span>
              </div>
            ) : (
              <div className="hot-board-hero-badge hot-board-hero-badge--dim">暂无评分</div>
            )}
            {boardDesc ? <p className="hot-board-card-sub">{boardDesc}</p> : null}
          </div>
          <span className="hot-board-card-more" aria-hidden>
            ›››
          </span>
        </header>

        <div className="hot-board-card-rows">
          {list.length === 0 ? (
            <div className="hot-board-row hot-board-row--empty">
              <p className="muted">暂无对象或评分数据</p>
            </div>
          ) : (
            list.map((item) => (
              <div key={item.id} className="hot-board-row">
                <div className="hot-board-row-thumb">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" />
                  ) : (
                    <span className="hot-board-row-thumb-fallback">{item.name.slice(0, 1)}</span>
                  )}
                </div>
                <div className="hot-board-row-body">
                  <div className="hot-board-row-name">{item.name}</div>
                  <div
                    className={[
                      "hot-board-row-quote",
                      (item.quoteSnippet ?? QUOTE_PLACEHOLDER) === QUOTE_PLACEHOLDER ? "hot-board-row-quote--muted" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {"\u201c"}
                    {item.quoteSnippet ?? QUOTE_PLACEHOLDER}
                    {"\u201d"}
                  </div>
                </div>
                <div className="hot-board-row-aside">
                  <div className="hot-board-row-score">
                    {item.avgRating > 0 ? item.avgRating.toFixed(1) : "—"}
                  </div>
                  {item.avgRating > 0 ? (
                    <StarMeter value={item.avgRating} className="hot-board-row-stars" />
                  ) : null}
                  <div className="hot-board-row-meta">
                    {item.reviewCount ?? 0} 评分
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </Link>
  );
}
