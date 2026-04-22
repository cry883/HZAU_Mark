"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string; description: string; imageUrl: string };
type NewItemDraft = { name: string; description: string; imageUrl: string; imagePreview: string };

export default function NewBoardPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [existingItems, setExistingItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemQuery, setItemQuery] = useState("");
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newItems, setNewItems] = useState<NewItemDraft[]>([
    { name: "", description: "", imageUrl: "", imagePreview: "" }
  ]);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function appendEmptyDraft() {
    setNewItems((prev) => [...prev, { name: "", description: "", imageUrl: "", imagePreview: "" }]);
  }

  function removeDraft(idx: number) {
    setNewItems((prev) => {
      if (prev.length === 1) return [{ name: "", description: "", imageUrl: "", imagePreview: "" }];
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function onPickImage(idx: number, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setNewItems((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, imageUrl: result, imagePreview: result } : item))
      );
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setItemsLoading(true);
      const query = itemQuery.trim();
      fetch(`/api/items${query ? `?q=${encodeURIComponent(query)}` : ""}`)
        .then((r) => r.json())
        .then((d) => setExistingItems(d.items ?? []))
        .finally(() => setItemsLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [itemQuery]);

  async function submit() {
    if (submitting) return;
    setMsg("");
    const validNew = newItems.filter((i) => i.name && i.description && i.imageUrl);
    if (validNew.length + selectedIds.length < 3) {
      setMsg("至少需要3个对象（新增+已选）");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, newItems: validNew, existingItemIds: selectedIds })
      });
      const json = await res.json();
      setMsg(res.ok ? `创建成功，boardId: ${json.boardId}` : json.error ?? "失败");
    } finally {
      setSubmitting(false);
    }
  }

  const validNew = newItems.filter((i) => i.name && i.description && i.imageUrl).length;
  const totalItemCount = validNew + selectedIds.length;
  const canSubmit = title.trim().length >= 2 && totalItemCount >= 3 && !submitting;

  return (
    <main>
      <h1 className="page-title">创建榜单</h1>
      <p className="page-subtitle">可新增对象或引用已有对象，合计至少 3 个才能提交审核。</p>
      <div className="board-create-grid">
      <section className="card">
        <div className="form-grid">
          <input placeholder="榜单标题" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="榜单描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </section>

      <section className="card">
        <h3>选择已有对象</h3>
        <p className="muted">勾选可复用对象（全局已通过池）；对象通过不代表会出现在所有榜单详情。</p>
        <div className="board-item-search-bar">
          <input
            placeholder="搜索可复用对象（名称）"
            value={itemQuery}
            onChange={(e) => setItemQuery(e.target.value)}
          />
          <button type="button" className="secondary" onClick={() => setItemQuery("")} disabled={!itemQuery}>
            清空搜索
          </button>
        </div>
        <div className="select-list">
        {existingItems.map((item) => (
          <label key={item.id} className="check-row check-row-item">
            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={(e) =>
                setSelectedIds((prev) =>
                  e.target.checked ? [...prev, item.id] : prev.filter((x) => x !== item.id)
                )
              }
            />
            <img src={item.imageUrl} alt={item.name} className="check-row-thumb" />
            <span className="check-row-text">
              <strong>{item.name}</strong>
              <span className="muted">{item.description}</span>
            </span>
          </label>
        ))}
        </div>
        {itemsLoading && <p className="muted">搜索中...</p>}
        {!itemsLoading && existingItems.length === 0 && (
          <p className="muted">{itemQuery ? "暂无匹配对象，请尝试其他关键词" : "暂无可复用对象"}</p>
        )}
      </section>

      <section className="card">
        <h3>新增对象（与榜单内添加对象一致：名称/描述/上传图片）</h3>
        <div className="new-item-list">
          {newItems.map((item, idx) => (
            <div key={idx} className="new-item-block">
              <div className="new-item-head">
                <p className="new-item-title">对象 {idx + 1}</p>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => removeDraft(idx)}
                  disabled={submitting}
                >
                  删除此行
                </button>
              </div>
              <div className="form-grid">
                <input
                  placeholder="名称"
                  value={item.name}
                  onChange={(e) =>
                    setNewItems((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                  }
                />
                <input
                  placeholder="描述"
                  value={item.description}
                  onChange={(e) =>
                    setNewItems((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                    )
                  }
                />
                <input type="file" accept="image/*" onChange={(e) => onPickImage(idx, e.target.files?.[0])} />
                {item.imagePreview && <img src={item.imagePreview} alt="预览" className="new-item-preview" />}
              </div>
            </div>
          ))}
        </div>
        <button
          className="secondary"
          type="button"
          onClick={appendEmptyDraft}
        >
          + 新增一行
        </button>
      </section>

      <aside className="card board-create-summary">
        <h3>提交前检查</h3>
        <p className="muted">已选已有对象：{selectedIds.length}</p>
        <p className="muted">新增有效对象：{validNew}</p>
        <p className={`summary-count ${totalItemCount >= 3 ? "ok" : "warn"}`}>当前合计：{totalItemCount} / 3</p>
        <button type="button" disabled={!canSubmit} onClick={submit}>
          {submitting ? "提交中..." : "提交审核"}
        </button>
        <div className="form-error-slot">
          {!!msg && <p className={`message ${msg.includes("成功") ? "success" : "error"}`}>{msg}</p>}
        </div>
      </aside>
      </div>
    </main>
  );
}
