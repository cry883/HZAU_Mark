"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json();
      if (res.ok) {
        const returnTo = searchParams.get("returnTo");
        router.replace(returnTo || "/");
        router.refresh();
        return;
      }
      setMsg(json.error ?? "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1 className="page-title">登录</h1>
      <p className="page-subtitle">登录后可创建榜单、审核内容或提交评分。</p>
      <div className="card auth-card">
        <div className="form-grid">
          <input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input
            placeholder="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" disabled={!username || !password || submitting} onClick={submit}>
            {submitting ? "登录中..." : "登录"}
          </button>
        </div>
        <div className="form-error-slot">
          {!!msg && <p className={`message ${msg.includes("成功") ? "success" : "error"}`}>{msg}</p>}
        </div>
      </div>
    </main>
  );
}
