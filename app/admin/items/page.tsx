"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  status: string;
  relatedBoards: Array<{ id: string; title: string; status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED" }>;
};
type BoardStatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [boardStatusFilter, setBoardStatusFilter] = useState<BoardStatusFilter>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const query = new URLSearchParams({ status: "PENDING" });
    if (boardStatusFilter !== "ALL") query.set("relatedBoardStatus", boardStatusFilter);
    const res = await fetch(`/api/admin/items?${query.toString()}`);
    const json = await res.json();
    setItems(json.items ?? []);
    setSelectedIds([]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [boardStatusFilter]);

  async function moderate(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/admin/items/${id}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: action === "reject" ? "内容不完整" : undefined })
    });
    const json = await res.json();
    if (res.ok) {
      setMsg(
        action === "approve"
          ? "对象审核通过：会进入全局可复用对象；仅当关联榜单也通过时，才会显示在该榜单详情。"
          : "对象已驳回：不会出现在全局可复用对象，可由创建者修改后重新提交。"
      );
    } else {
      setMsg(json.error ?? "操作失败");
    }
    load();
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? items.map((item) => item.id) : []);
  }

  async function moderateBulk(action: "approve" | "reject") {
    if (!selectedIds.length || bulkSubmitting) return;
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/admin/items/moderate-bulk", {
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

  const allChecked = items.length > 0 && selectedIds.length === items.length;

  return (
    <main>
      <h1 className="page-title">管理员 - 对象审核</h1>
      <p className="page-subtitle">先通过对象，再通过榜单，前台才能完整展示。</p>
      <div className="card admin-filter-bar">
        <label className="inline-row">
          <span>关联榜单状态筛选</span>
          <select value={boardStatusFilter} onChange={(e) => setBoardStatusFilter(e.target.value as BoardStatusFilter)}>
            <option value="ALL">全部</option>
            <option value="PENDING">仅关联待审核榜单</option>
            <option value="APPROVED">仅关联已通过榜单</option>
            <option value="REJECTED">仅关联已驳回榜单</option>
            <option value="ARCHIVED">仅关联已归档榜单</option>
          </select>
        </label>
        <div className="admin-bulk-bar">
          <label className="check-row">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => toggleAll(e.target.checked)}
              disabled={loading || bulkSubmitting || items.length === 0}
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
      {!loading && items.length === 0 && <p className="card muted">暂无待审核对象</p>}
      {items.map((item) => (
        <article className="card admin-row-card" key={item.id}>
          <div className="admin-row-main">
            <div className="admin-item-preview-row">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={(e) =>
                  setSelectedIds((prev) =>
                    e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                  )
                }
                disabled={bulkSubmitting}
              />
              <img src={item.imageUrl} alt={item.name} className="admin-item-preview" />
              <div>
                <h3>{item.name}</h3>
                <p className="muted">{item.description}</p>
                <p className="muted">状态：{item.status}</p>
                <div className="admin-related-boards">
                  {item.relatedBoards.length === 0 && <span className="muted">未关联任何榜单</span>}
                  {item.relatedBoards.map((board) => (
                    <span key={board.id} className={`board-state-pill state-${board.status.toLowerCase()}`}>
                      {board.title} · {board.status}
                    </span>
                  ))}
                </div>
                {item.relatedBoards.some((board) => board.status === "REJECTED") && (
                  <p className="muted admin-hint">已关联被驳回榜单不影响该对象的单独审核。</p>
                )}
              </div>
            </div>
          </div>
          <div className="admin-row-actions">
            <button type="button" onClick={() => moderate(item.id, "approve")}>通过</button>
            <button className="danger" type="button" onClick={() => moderate(item.id, "reject")}>
              驳回
            </button>
          </div>
        </article>
      ))}
      {!!msg && <p className={`message ${msg.includes("成功") ? "success" : "error"}`}>{msg}</p>}
    </main>
  );
}
