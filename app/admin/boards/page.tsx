"use client";

import { useEffect, useState } from "react";

type Board = {
  id: string;
  title: string;
  status: string;
  items: Array<{ id: string; name: string; description: string; imageUrl: string; status: string }>;
};

export default function AdminBoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/boards?status=PENDING");
    const json = await res.json();
    setBoards(json.boards ?? []);
    setSelectedIds([]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function moderate(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/admin/boards/${id}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: action === "reject" ? "内容不完整" : undefined })
    });
    const json = await res.json();
    setMsg(res.ok ? "操作成功" : json.error ?? "操作失败");
    load();
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? boards.map((board) => board.id) : []);
  }

  async function moderateBulk(action: "approve" | "reject") {
    if (!selectedIds.length || bulkSubmitting) return;
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/admin/boards/moderate-bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          action
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? "批量操作失败");
        return;
      }
      setMsg(`批量${action === "approve" ? "通过" : "驳回"}成功，共 ${json.count} 条`);
      await load();
    } finally {
      setBulkSubmitting(false);
    }
  }

  const allChecked = boards.length > 0 && selectedIds.length === boards.length;

  return (
    <main>
      <h1 className="page-title">管理员 - 榜单审核</h1>
      <p className="page-subtitle">审核通过后榜单会出现在前台列表。</p>
      <div className="card admin-filter-bar">
        <div className="admin-bulk-bar">
          <label className="check-row">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => toggleAll(e.target.checked)}
              disabled={loading || bulkSubmitting || boards.length === 0}
            />
            <span>全选</span>
          </label>
          <button
            type="button"
            disabled={!selectedIds.length || bulkSubmitting}
            onClick={() => moderateBulk("approve")}
          >
            {bulkSubmitting ? "批量处理中..." : "批量通过"}
          </button>
          <button
            type="button"
            className="danger"
            disabled={!selectedIds.length || bulkSubmitting}
            onClick={() => moderateBulk("reject")}
          >
            {bulkSubmitting ? "批量处理中..." : "批量驳回"}
          </button>
        </div>
      </div>
      {loading && <p className="muted">加载中...</p>}
      {!loading && boards.length === 0 && <p className="card muted">暂无待审核榜单</p>}
      {boards.map((board) => (
        <article className="card admin-row-card" key={board.id}>
          <div className="admin-row-main">
            <div className="admin-board-head">
              <input
                type="checkbox"
                checked={selectedIds.includes(board.id)}
                onChange={(e) =>
                  setSelectedIds((prev) =>
                    e.target.checked ? [...prev, board.id] : prev.filter((id) => id !== board.id)
                  )
                }
                disabled={bulkSubmitting}
              />
              <h3>{board.title}</h3>
            </div>
            <p className="muted">状态：{board.status}</p>
            <div className="admin-board-items">
              {board.items.length === 0 && <p className="muted">该榜单当前未关联对象</p>}
              {board.items.map((item) => (
                <div key={item.id} className="admin-board-item-row">
                  <img src={item.imageUrl} alt={item.name} className="admin-board-item-thumb" />
                  <div>
                    <p className="admin-board-item-name">{item.name}</p>
                    <p className="muted">{item.description}</p>
                    <p className="muted">对象状态：{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="admin-row-actions">
            <button type="button" onClick={() => moderate(board.id, "approve")}>通过</button>
            <button className="danger" type="button" onClick={() => moderate(board.id, "reject")}>
              驳回
            </button>
          </div>
        </article>
      ))}
      {!!msg && <p className={`message ${msg.includes("成功") ? "success" : "error"}`}>{msg}</p>}
    </main>
  );
}
