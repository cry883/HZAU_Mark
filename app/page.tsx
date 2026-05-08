import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ModerationStatus } from "@prisma/client";
import { HotBoardCard } from "@/components/HotBoardCard";
import { HomeBoardSearch } from "@/components/HomeBoardSearch";
import { pickTopLikedCommentSnippet } from "@/lib/reviewQuote";

async function getFeaturedBoards() {
  return prisma.board.findMany({
    where: { status: ModerationStatus.APPROVED },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: {
      boardItems: {
        where: { boardItem: { status: ModerationStatus.APPROVED } },
        include: {
          boardItem: {
            include: {
              reviews: { include: { _count: { select: { likes: true } } } }
            }
          }
        }
      }
    }
  });
}

export default async function HomePage() {
  const boards = await getFeaturedBoards();

  return (
    <main>
      <section className="hero">
        <h1>校园热榜评分站</h1>
        <p>学生主用、老师参与。先看热门榜单，再快速评分。</p>
        <HomeBoardSearch />
      </section>

      <h2 className="section-title">热门榜单</h2>
      <div className="hot-board-grid">
        {boards.map((board, idx) => {
          const scores = board.boardItems.flatMap((x) => x.boardItem.reviews.map((r) => r.rating));
          const avg = scores.length ? scores.reduce((a, c) => a + c, 0) / scores.length : 0;
          const rankedItems = board.boardItems
            .map((x) => {
              const itemScores = x.boardItem.reviews.map((r) => r.rating);
              const itemAvg = itemScores.length
                ? itemScores.reduce((a, c) => a + c, 0) / itemScores.length
                : 0;
              return {
                id: x.boardItem.id,
                name: x.boardItem.name,
                quoteSnippet: pickTopLikedCommentSnippet(x.boardItem.reviews),
                avgRating: itemAvg,
                imageUrl: x.boardItem.imageUrl,
                reviewCount: x.boardItem.reviews.length
              };
            })
            .sort((a, b) => b.avgRating - a.avgRating);

          return (
            <div key={board.id}>
              <div className="board-order-tag">#{idx + 1} 热门</div>
              <HotBoardCard
                id={board.id}
                title={board.title}
                description={board.description}
                participantCount={scores.length}
                topItems={rankedItems}
                tone={idx}
              />
              <div className="board-avg-line">
                榜单均分：<span className="score-star">★</span>{avg ? avg.toFixed(1) : "--"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <span className="tag">探索</span>
          <h3>查看更多榜单</h3>
          <p className="muted">按榜单查看对象评分，快速找到校园高分地点。</p>
          <Link href="/boards">进入榜单页</Link>
        </div>
        <div className="card">
          <span className="tag">参与</span>
          <h3>创建你的榜单</h3>
          <p className="muted">支持新增对象或拼接已有对象，至少 3 个即可发起。</p>
          <Link href="/boards/new">去创建</Link>
        </div>
      </div>
    </main>
  );
}
