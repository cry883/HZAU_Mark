"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ItemRatingCard } from "@/components/ItemRatingCard";

function heroToneFromBoardId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 6;
}

type BoardItem = {
  id: string;
  name: string;
  description: string;
  quoteSnippet: string;
  imageUrl: string;
  avgRating: number;
  reviewCount: number;
  reviews?: Array<{ rating: number; user?: { id: string; username: string } }>;
};

export default function BoardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const boardId = params?.id;
  const [data, setData] = useState<{
    board: { id: string; title: string; description?: string | null };
    boardItems: BoardItem[];
  } | null>(null);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImageDataUrl, setNewImageDataUrl] = useState("");
  const [newImagePreview, setNewImagePreview] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  function buildMyRatings(
    boardItems: BoardItem[],
    userId: string | null | undefined
  ): Record<string, number> {
    if (!userId) return {};
    const ratings: Record<string, number> = {};
    for (const item of boardItems) {
      const mine = item.reviews?.find((r) => r.user?.id === userId);
      if (mine) ratings[item.id] = mine.rating;
    }
    return ratings;
  }

  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/boards/${boardId}`).then((r) => r.json()),
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    ])
      .then(([boardData, me]) => {
        setData(boardData);
        if (boardData?.boardItems) {
          setMyRatings(buildMyRatings(boardData.boardItems, me?.id));
        }
      })
      .finally(() => setLoading(false));
  }, [boardId]);

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setNewImageDataUrl(result);
      setNewImagePreview(result);
    };
    reader.readAsDataURL(file);
  }

  async function addBoardItem() {
    if (!boardId) return;
    if (addingItem) return;
    setAddMsg("");
    if (!newName.trim() || !newDescription.trim() || !newImageDataUrl) {
      setAddMsg("名称、描述和图片都必填");
      return;
    }

    setAddingItem(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          imageUrl: newImageDataUrl
        })
      });
      if (res.status === 401) {
        const returnTo = typeof window === "undefined" ? `/boards/${boardId}` : window.location.pathname;
        router.push(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setAddMsg(json.error ?? "提交失败");
        return;
      }
      setAddMsg("对象已提交审核，管理员通过后会显示在榜单中");
      setNewName("");
      setNewDescription("");
      setNewImageDataUrl("");
      setNewImagePreview("");
    } finally {
      setAddingItem(false);
    }
  }

  if (loading) {
    return (
      <main>
        <div className="skeleton-line skeleton-title" />
        <div className="board-detail-grid">
          <div>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div className="item-rating-card skeleton-card" key={idx} />
            ))}
          </div>
          <aside className="board-sidebar">
            <div className="card skeleton-card" />
          </aside>
        </div>
      </main>
    );
  }

  if (!data) return <p className="message error">加载失败</p>;
  if ((data as any).error) return <p>{(data as any).error}</p>;

  const totalReviews = data.boardItems.reduce((sum, item) => sum + item.reviewCount, 0);
  const weightedScore =
    totalReviews > 0
      ? data.boardItems.reduce((sum, item) => sum + item.avgRating * item.reviewCount, 0) / totalReviews
      : 0;
  const topRated = [...data.boardItems]
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 3);

  const heroTone = heroToneFromBoardId(data.board.id);
  const heroToneClass = `hot-board-card-hero--tone-${heroTone}`;

  return (
    <main>
      <div className="hot-board-card board-detail-page-card">
        <header className={`hot-board-card-hero ${heroToneClass}`}>
          <div className="hot-board-card-hero-main">
            <h1 className="hot-board-card-title">{data.board.title}</h1>
            {totalReviews > 0 ? (
              <div className="hot-board-hero-badge">
                <span className="hot-board-hero-badge-star" aria-hidden>
                  ★
                </span>
                <span>{totalReviews} 评分</span>
              </div>
            ) : (
              <div className="hot-board-hero-badge hot-board-hero-badge--dim">暂无评分</div>
            )}
            <p className="hot-board-card-sub">
              {data.board.description?.trim() || "为榜单对象打分（支持 0.5 分）。仅展示本榜单内且已审核通过的对象。"}
            </p>
          </div>
        </header>
        <div className="hot-board-card-rows">
          {data.boardItems.map((item) => (
            <ItemRatingCard
              key={item.id}
              boardId={data.board.id}
              id={item.id}
              name={item.name}
              quoteSnippet={item.quoteSnippet}
              imageUrl={item.imageUrl}
              avgRating={item.avgRating}
              reviewCount={item.reviewCount}
              myRating={myRatings[item.id]}
            />
          ))}
        </div>
      </div>

      <div className="board-detail-footer-grid">
        <article className="card add-item-card">
          <h3>补充对象到本榜单</h3>
          <p className="muted">提交后进入待审核，管理员通过后才会在前台展示。</p>
          <div className="form-grid">
            <input placeholder="对象名称" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <textarea
              rows={3}
              placeholder="对象描述"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
            <input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
            {newImagePreview && <img src={newImagePreview} alt="预览" className="add-item-preview" />}
            <button type="button" disabled={addingItem} onClick={addBoardItem}>
              {addingItem ? "提交中..." : "提交对象审核"}
            </button>
          </div>
          {!!addMsg && <p className={`message ${addMsg.includes("已提交") ? "success" : "error"}`}>{addMsg}</p>}
        </article>
        <aside className="board-detail-aside-cards">
          <div className="card">
            <h3>榜单统计</h3>
            <p className="muted">对象总数：{data.boardItems.length}</p>
            <p className="muted">总评分次数：{totalReviews}</p>
            <p className="board-stat-score">综合均分：{weightedScore > 0 ? weightedScore.toFixed(1) : "--"}</p>
          </div>
          <div className="card">
            <h3>当前 Top 3</h3>
            {topRated.map((item, idx) => (
              <div className="hot-board-top-item" key={item.id}>
                <span className={`rank-badge rank-${idx + 1}`}>TOP {idx + 1}</span>
                <span className="hot-board-top-name">{item.name}</span>
                <span className="hot-board-top-score">{item.avgRating > 0 ? item.avgRating.toFixed(1) : "--"}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
