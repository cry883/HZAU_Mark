"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CodeRow = {
  id: string;
  code: string;
  isActive: boolean;
  usedCount: number;
  maxUses: number;
  remainingUses: number;
  expiresAt: string;
  expired: boolean;
  createdAt: string;
};

type StatsJson = {
  summary?: { codeCount: number; totalSignupsViaMyCodes: number };
  codes?: CodeRow[];
  error?: string;
  detail?: string;
};

export default function InviteAnalyticsPage() {
  const [data, setData] = useState<StatsJson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/invite/stats", { cache: "no-store" });
        const text = await r.text();
        let j: StatsJson = {};
        try {
          j = text ? (JSON.parse(text) as StatsJson) : {};
        } catch {
          if (!cancelled) {
            setData({ error: `加载失败（服务器返回非 JSON，HTTP ${r.status}）` });
          }
          return;
        }
        if (cancelled) return;
        if (r.status === 401) {
          setData({ error: "Unauthorized" });
          return;
        }
        if (!r.ok) {
          setData({
            error: j.error ?? `请求失败（HTTP ${r.status}）`,
            detail: j.detail
          });
          return;
        }
        setData(j);
      } catch {
        if (!cancelled) setData({ error: "网络异常，请稍后重试" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main>
        <h1 className="page-title">邀请分析</h1>
        <p className="muted">加载中...</p>
      </main>
    );
  }

  if (data?.error === "Unauthorized") {
    return (
      <main>
        <h1 className="page-title">邀请分析</h1>
        <p className="card muted">
          请先 <Link href="/auth/login">登录</Link> 后查看你的邀请数据。
        </p>
      </main>
    );
  }

  if (data?.error) {
    const detail = data.detail;
    return (
      <main>
        <h1 className="page-title">邀请分析</h1>
        <p className="message error">{data.error}</p>
        {detail && (
          <p className="muted" style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
            {detail}
          </p>
        )}
      </main>
    );
  }

  const codes = data?.codes ?? [];
  const summary = data?.summary;

  return (
    <main>
      <h1 className="page-title">邀请分析</h1>
      <p className="page-subtitle">查看你发出的邀请码使用情况（人数上限与到期时间）。</p>

      {summary && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p>
            当前共 <strong>{summary.codeCount}</strong> 张邀请码；通过你的码完成注册累计{" "}
            <strong>{summary.totalSignupsViaMyCodes}</strong> 人次。
          </p>
        </div>
      )}

      {codes.length === 0 && <p className="card muted">暂无邀请码记录（注册成功后会自动生成一张）。</p>}

      {codes.map((c) => (
        <article className="card admin-row-card" key={c.id}>
          <div className="admin-row-main">
            <h3 style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>{c.code}</h3>
            <p className="muted">
              已用 {c.usedCount} / {c.maxUses}，剩余 {c.remainingUses}；到期{" "}
              {c.expiresAt ? new Date(c.expiresAt).toLocaleString("zh-CN") : "—"}
              {c.expired ? "（已过期）" : ""}
              {!c.isActive ? "（已停用）" : ""}
            </p>
            <p className="muted">创建于 {new Date(c.createdAt).toLocaleString("zh-CN")}</p>
          </div>
        </article>
      ))}
    </main>
  );
}
