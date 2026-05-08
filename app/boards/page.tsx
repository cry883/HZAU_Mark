"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HotBoardCard } from "@/components/HotBoardCard";

type Board = {
  id: string;
  title: string;
  description?: string | null;
  approvedItemCount: number;
  participantCount?: number;
  avgRating: number;
  topItems: Array<{
    id: string;
    name: string;
    quoteSnippet?: string;
    imageUrl: string;
    avgRating: number;
    reviewCount: number;
  }>;
};

export default function BoardsPage() {
  const searchParams = useSearchParams();
  const query = useMemo(() => (searchParams.get("q") ?? "").trim(), [searchParams]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/boards${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then((r) => r.json())
      .then((d) => setBoards(d.boards ?? []))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <main>
      <h1 className="page-title">榜单广场</h1>
      <p className="page-subtitle">像虎扑评分一样先看热榜，再进入详情评分。</p>
      <p className="muted">搜索结果：{query || "全部"} / 共 {boards.length} 条</p>
      {loading && <p className="card muted">加载中...</p>}
      {!loading && boards.length === 0 && <p className="card muted">未找到相关榜单，请更换关键词</p>}
      <div className="hot-board-grid">
        {boards.map((board, idx) => {
          return (
            <div key={board.id}>
              <div className="board-order-tag">#{idx + 1} 推荐</div>
              <HotBoardCard
                id={board.id}
                title={board.title}
                description={board.description}
                participantCount={board.participantCount ?? board.approvedItemCount}
                topItems={board.topItems}
                tone={idx}
              />
              <div className="board-avg-line">
                榜单均分：<span className="score-star">★</span>{board.avgRating ? board.avgRating.toFixed(1) : "--"}
              </div>
              <div className="board-detail-link">
                <Link href={`/boards/${board.id}`}>进入详情评分</Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
