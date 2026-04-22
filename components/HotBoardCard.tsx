import Link from "next/link";

type TopItem = {
  id: string;
  name: string;
  avgRating: number;
  imageUrl?: string;
};

type HotBoardCardProps = {
  id: string;
  title: string;
  description?: string | null;
  participantCount: number;
  topItems: TopItem[];
};

function StarMeter({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="score-star-meter" aria-label={`评分 ${value.toFixed(1)} / 5`}>
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
  description,
  participantCount,
  topItems
}: HotBoardCardProps) {
  return (
    <article className="hot-board-card">
      <header className="hot-board-card-header">
        <h3>
          <Link href={`/boards/${id}`}>{title}</Link>
        </h3>
        <span className="hot-board-card-meta">{participantCount} 人参与</span>
      </header>
      <p className="hot-board-card-desc">{description || "校园同学正在热议中"}</p>
      {topItems.length > 0 && (
        <div className="top-image-row">
          {topItems.slice(0, 3).map((item, idx) => (
            <div key={item.id} className="top-image-wrap" title={item.name}>
              {item.imageUrl ? (
                <img className="top-image" src={item.imageUrl} alt={item.name} />
              ) : (
                <div className="top-image-fallback">{idx + 1}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="hot-board-card-body">
        {topItems.length === 0 && <p className="muted">暂无评分数据</p>}
        {topItems.slice(0, 3).map((item, idx) => (
          <div key={item.id} className="hot-board-top-item">
            <span className={`rank-badge rank-${idx + 1}`}>TOP {idx + 1}</span>
            <span className="hot-board-top-name">{item.name}</span>
            <span className="hot-board-top-score">
              <StarMeter value={item.avgRating} />
              {item.avgRating.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
