"use client";

import { useCallback, useEffect, useState } from "react";

type InviteRow = {
  id: string;
  code: string;
  isActive: boolean;
  usedCount: number;
  maxUses: number;
  expiresAt: string;
  createdAt: string;
  issuer: { id: string; username: string };
};

export default function AdminInviteCodesPage() {
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [maxUses, setMaxUses] = useState(10);
  const [validDays, setValidDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/invite-codes");
    const json = await res.json();
    setRows(json.inviteCodes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createCode() {
    if (creating) return;
    setCreating(true);
    setMsg("");
    try {
      const body: Record<string, unknown> = { maxUses, validDays };
      if (manualCode.trim()) body.code = manualCode.trim().toUpperCase();
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? "创建失败");
        return;
      }
      setMsg("已创建邀请码");
      setManualCode("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(row: InviteRow) {
    setMsg("");
    const res = await fetch(`/api/admin/invite-codes/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive })
    });
    const json = await res.json();
    setMsg(res.ok ? "已更新" : json.error ?? "更新失败");
    if (res.ok) load();
  }

  return (
    <main>
      <h1 className="page-title">管理员 - 邀请码</h1>
      <p className="page-subtitle">创建、停用邀请码；用户码默认最多 10 人、30 天有效。</p>

      <div className="card admin-filter-bar">
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          新建（留空「指定码」则随机生成；默认挂在当前管理员名下）
        </p>
        <div className="form-grid" style={{ maxWidth: "32rem" }}>
          <input
            placeholder="指定码（可选，大写）"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <input
            type="number"
            min={1}
            max={100000}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value) || 10)}
            placeholder="maxUses"
          />
          <input
            type="number"
            min={1}
            max={3650}
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value) || 30)}
            placeholder="有效天数"
          />
          <button type="button" disabled={creating} onClick={createCode}>
            {creating ? "创建中..." : "创建邀请码"}
          </button>
        </div>
      </div>

      {loading && <p className="muted">加载中...</p>}
      {!loading && rows.length === 0 && <p className="card muted">暂无邀请码</p>}

      {rows.map((row) => (
        <article className="card admin-row-card" key={row.id}>
          <div className="admin-row-main">
            <h3 style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>{row.code}</h3>
            <p className="muted">
              发行人：{row.issuer.username}；已用 {row.usedCount}/{row.maxUses}；到期{" "}
              {new Date(row.expiresAt).toLocaleString("zh-CN")}
            </p>
            <p className="muted">状态：{row.isActive ? "启用" : "停用"}</p>
          </div>
          <div className="admin-row-actions">
            <button type="button" onClick={() => toggleActive(row)}>
              {row.isActive ? "停用" : "启用"}
            </button>
          </div>
        </article>
      ))}

      {!!msg && <p className={`message ${msg.includes("失败") ? "error" : "success"}`}>{msg}</p>}
    </main>
  );
}
