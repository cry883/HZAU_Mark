"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RatingControl } from "@/components/RatingControl";

type CommentItem = {
  id: string;
  rating: number;
  comment: string;
  updatedAt: string;
  user: { id: string; username: string };
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

type DetailData = {
  viewerId: string | null;
  board: { id: string; title: string };
  item: { id: string; name: string; description: string; imageUrl: string };
  avgRating: number;
  reviewCount: number;
  myReview: { id: string; rating: number; comment?: string | null } | null;
  comments: CommentItem[];
};

export default function ItemReviewPage() {
  const params = useParams<{ id: string; itemId: string }>();
  const router = useRouter();
  const boardId = params?.id;
  const itemId = params?.itemId;
  const [data, setData] = useState<DetailData | null>(null);
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likingId, setLikingId] = useState("");

  function jumpToLogin() {
    if (typeof window === "undefined") return;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    router.push(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  async function loadDetail() {
    if (!boardId || !itemId) return;
    setLoading(true);
    const res = await fetch(`/api/boards/${boardId}/items/${itemId}`);
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error ?? "加载失败");
      setData(null);
      setLoading(false);
      return;
    }
    setData(json);
    setRating(json.myReview?.rating ?? 4);
    setComment(json.myReview?.comment ?? "");
    setLoading(false);
  }

  useEffect(() => {
    loadDetail();
  }, [boardId, itemId]);

  const canSubmitComment = useMemo(() => comment.trim().length > 0, [comment]);

  async function submitRating(shouldPostComment: boolean) {
    if (!itemId) return;
    setMsg("");
    if (shouldPostComment && !canSubmitComment) {
      setMsg("发布评论前请先填写评论内容");
      return;
    }

    if (shouldPostComment) {
      setSubmittingComment(true);
    } else {
      setSubmittingRate(true);
    }
    try {
      const body: { boardItemId: string; rating: number; comment?: string } = {
        boardItemId: itemId,
        rating
      };
      if (shouldPostComment) body.comment = comment.trim();
      const res = await fetch("/api/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.status === 401) {
        jumpToLogin();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? "提交失败");
        return;
      }
      setMsg(shouldPostComment ? "评论发布成功" : "评分提交成功");
      await loadDetail();
    } finally {
      setSubmittingRate(false);
      setSubmittingComment(false);
    }
  }

  async function toggleLike(reviewId: string) {
    setMsg("");
    setLikingId(reviewId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: "POST" });
      if (res.status === 401) {
        jumpToLogin();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? "点赞失败");
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: prev.comments.map((commentItem) =>
            commentItem.id === reviewId
              ? {
                  ...commentItem,
                  likedByMe: json.liked,
                  likeCount: json.likeCount
                }
              : commentItem
          )
        };
      });
    } finally {
      setLikingId("");
    }
  }

  if (loading) return <p className="card muted">加载中...</p>;
  if (!data) return <p className="message error">{msg || "加载失败"}</p>;

  return (
    <main>
      <header className="board-detail-header">
        <p className="muted">
          <Link href={`/boards/${data.board.id}`}>返回《{data.board.title}》</Link>
        </p>
      </header>

      <section className="card item-review-hero">
        <img src={data.item.imageUrl} alt={data.item.name} className="item-review-image" />
        <div>
          <h1 className="page-title">{data.item.name}</h1>
          <p className="page-subtitle">{data.item.description}</p>
          <div className="item-review-stats">
            <span className="item-review-avg">{data.avgRating > 0 ? data.avgRating.toFixed(1) : "--"}</span>
            <span className="muted">{data.reviewCount} 人评分</span>
          </div>
        </div>
      </section>

      <section className="card item-review-panel">
        <h3>立即评分</h3>
        <RatingControl value={rating} onChange={setRating} />
        <textarea
          rows={4}
          placeholder="写下你的评论（可选，不写则只提交评分）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="item-review-actions">
          <button type="button" className="secondary" disabled={submittingRate} onClick={() => submitRating(false)}>
            {submittingRate ? "提交中..." : "仅提交评分"}
          </button>
          <button type="button" disabled={submittingComment} onClick={() => submitRating(true)}>
            {submittingComment ? "发布中..." : "发布评分与评论"}
          </button>
        </div>
        {!!msg && <p className={`message ${msg.includes("成功") ? "success" : "error"}`}>{msg}</p>}
      </section>

      <section className="card">
        <h3>评论区（{data.comments.length}）</h3>
        {data.comments.length === 0 && <p className="muted">暂无评论，来发布第一条吧。</p>}
        <div className="comment-list">
          {data.comments.map((review) => (
            <article key={review.id} className="comment-card">
              <div className="comment-head">
                <strong>{review.user.username}</strong>
                <span className="comment-score">评分 {review.rating.toFixed(1)}</span>
              </div>
              <p className="comment-content">{review.comment}</p>
              <div className="comment-foot">
                <span className="muted">{new Date(review.updatedAt).toLocaleString("zh-CN")}</span>
                <button
                  type="button"
                  className="secondary comment-like-btn"
                  disabled={likingId === review.id}
                  onClick={() => toggleLike(review.id)}
                >
                  {review.likedByMe ? "已赞" : "点赞"}（{review.likeCount}）
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
