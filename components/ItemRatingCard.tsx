"use client";

import Link from "next/link";

type ItemRatingCardProps = {
  rank: number;
  boardId: string;
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  avgRating: number;
  reviewCount: number;
  myRating?: number;
};

export function ItemRatingCard({
  rank,
  boardId,
  id,
  name,
  description,
  imageUrl,
  avgRating,
  reviewCount,
  myRating
}: ItemRatingCardProps) {
  return (
    <article className="item-rating-card">
      <div className={`item-rank rank-${rank > 3 ? 4 : rank}`}>{rank}</div>

      <div className="item-main">
        <div className="item-main-top">
          <img src={imageUrl} alt={name} className="item-thumb" />
          <div>
            <h3>{name}</h3>
            <p>{description}</p>
          </div>
        </div>
      </div>

      <div className="item-score-box">
        <span className="item-score">{avgRating > 0 ? avgRating.toFixed(1) : "--"}</span>
        <span className="item-votes">{reviewCount} 人评分</span>
      </div>

      <div className="item-actions">
        <Link
          className={`item-action-link ${myRating ? "reviewed-btn" : ""}`}
          href={`/boards/${boardId}/items/${id}`}
        >
          {myRating ? `我的评分: ${myRating.toFixed(1)}` : "去打分"}
        </Link>
      </div>
    </article>
  );
}
