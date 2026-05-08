"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RatingControl } from "@/components/RatingControl";
import { pickTopLikedCommentSnippet } from "@/lib/reviewQuote";

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

  const heroQuoteText = useMemo(() => {
    if (!data) return pickTopLikedCommentSnippet([]);
    return pickTopLikedCommentSnippet(
      data.comments.map((c) => ({
        comment: c.comment,
        updatedAt: new Date(c.updatedAt),
        _count: { likes: c.likeCount }
      }))
    );
  }, [data]);

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

  if (loading) {
    return (
      <main>
        <div className="skeleton-line skeleton-title" />
        <div className="hot-board-card item-review-page-stack">
          <div className="item-review-plain-header item-review-plain-header--skel">
            <div className="skeleton-line item-review-thumb-skel" />
            <div className="skeleton-line item-review-title-skel" />
          </div>
          <div className="hot-board-card-rows">
            <div className="skeleton-card item-review-inner-skel" />
            <div className="skeleton-card item-review-inner-skel" />
          </div>
        </div>
      </main>
    );
  }

  if (!data) return <p className="message error">{msg || "加载失败"}</p>;

  const descQuoted = `\u201c${heroQuoteText}\u201d`;

  return (
    <main>
      <nav className="item-review-back" aria-label="返回导航">
        <Link href={`/boards/${data.board.id}`}>← 返回《{data.board.title}》</Link>
      </nav>

      <article className="hot-board-card item-review-page-stack">
        <header className="item-review-plain-header">
          <div className="item-review-plain-thumb">
            {data.item.imageUrl ? (
              <img src={data.item.imageUrl} alt="" />
            ) : (
              <span className="item-review-plain-thumb-fallback">{data.item.name.slice(0, 1)}</span>
            )}
          </div>
          <h1 className="item-review-plain-title">{data.item.name}</h1>
        </header>

        <div className="hot-board-card-rows">
          <div className="item-review-meta-card">
            <div className="item-review-meta-badges">
              {data.avgRating > 0 ? (
                <span className="item-review-meta-pill item-review-meta-pill--avg">
                  <span className="item-review-meta-star" aria-hidden>
                    ★
                  </span>
                  {data.avgRating.toFixed(1)} 均分
                </span>
              ) : (
                <span className="item-review-meta-pill">暂无均分</span>
              )}
              <span className="item-review-meta-pill">{data.reviewCount} 评分</span>
            </div>
            <p className="item-review-meta-desc">{descQuoted}</p>
          </div>

          <section className="item-review-inner-card">
            <h3 className="item-review-inner-title">立即评分</h3>
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
            <div className="form-error-slot">
              {!!msg && <p className={`message ${msg.includes("成功") ? "success" : "error"}`}>{msg}</p>}
            </div>
          </section>

          <section className="item-review-inner-card">
            <h3 className="item-review-inner-title">评论区（{data.comments.length}）</h3>
            {data.comments.length === 0 && <p className="muted">暂无评论，来发布第一条吧。</p>}
            <div className="comment-list">
              {data.comments.map((review) => (
                <article key={review.id} className="comment-card">
                  <div className="comment-head">
                    <strong>{review.user.username}</strong>
                    <span className="comment-score">评分 {review.rating.toFixed(1)}</span>
                  </div>
                  <p className="comment-content">{review.comment?.trim() ? review.comment : "（无文字评论）"}</p>
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
        </div>
      </article>
    </main>
  );
}
