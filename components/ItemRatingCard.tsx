"use client";

import Link from "next/link";
import { StarMeter } from "@/components/HotBoardCard";
import { QUOTE_PLACEHOLDER } from "@/lib/reviewQuote";

type ItemRatingCardProps = {
  boardId: string;
  id: string;
  name: string;
  /** 引号内展示：点赞最高的评论或占位 */
  quoteSnippet: string;
  imageUrl: string;
  avgRating: number;
  reviewCount: number;
  myRating?: number;
};

export function ItemRatingCard({
  boardId,
  id,
  name,
  quoteSnippet,
  imageUrl,
  avgRating,
  reviewCount,
  myRating
}: ItemRatingCardProps) {
  return (
    <article className="hot-board-row board-item-detail-row">
      <div className="hot-board-row-thumb">
        {imageUrl ? <img src={imageUrl} alt="" /> : <span className="hot-board-row-thumb-fallback">{name.slice(0, 1)}</span>}
      </div>
      <div className="hot-board-row-body">
        <div className="hot-board-row-name">{name}</div>
        <div
          className={[
            "hot-board-row-quote",
            quoteSnippet === QUOTE_PLACEHOLDER ? "hot-board-row-quote--muted" : ""
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {"\u201c"}
          {quoteSnippet}
          {"\u201d"}
        </div>
      </div>
      <div className="hot-board-row-aside board-item-detail-aside">
        <div className="hot-board-row-score">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</div>
        {avgRating > 0 ? <StarMeter value={avgRating} className="hot-board-row-stars" /> : null}
        <div className="hot-board-row-meta">{reviewCount} 评分</div>
        <Link
          className={`board-item-action-link ${myRating ? "board-item-action-link--done" : ""}`}
          href={`/boards/${boardId}/items/${id}`}
        >
          {myRating ? `我的 ${myRating.toFixed(1)}` : "去打分"}
        </Link>
      </div>
    </article>
  );
}
