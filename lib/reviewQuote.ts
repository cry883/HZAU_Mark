/** 列表/卡片上引号内展示的文案：无可用评论时用 */
export const QUOTE_PLACEHOLDER = "请大家来评论吧";

export type ReviewForQuotePick = {
  comment: string | null;
  updatedAt: Date;
  _count?: { likes: number };
};

/** 取点赞数最高的非空评论正文；并列时取较新的一条 */
export function pickTopLikedCommentSnippet(reviews: ReviewForQuotePick[]): string {
  const candidates = reviews.filter((r) => r.comment?.trim());
  if (candidates.length === 0) return QUOTE_PLACEHOLDER;

  let best = candidates[0];
  let bestLikes = best._count?.likes ?? 0;
  for (const r of candidates) {
    const likes = r._count?.likes ?? 0;
    if (likes > bestLikes) {
      best = r;
      bestLikes = likes;
    } else if (likes === bestLikes && r.updatedAt > best.updatedAt) {
      best = r;
    }
  }
  return best.comment!.trim();
}
