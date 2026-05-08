"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = searchParams.get("invite");
    if (!raw) return;
    const v = raw.trim().toUpperCase();
    setInviteCode((prev) => (prev ? prev : v));
  }, [searchParams]);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          inviteCode: inviteCode.trim().toUpperCase()
        })
      });
      const json = await res.json();
      if (res.ok) {
        const returnTo = searchParams.get("returnTo");
        router.replace(returnTo || "/");
        router.refresh();
        return;
      }
      setMsg(json.error ?? "注册失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1 className="page-title">注册</h1>
      <p className="page-subtitle">
        使用邀请码完成注册，成功后会自动登录。分享链接可带参数：/auth/register?invite=你的码
      </p>
      <div className="card auth-card">
        <div className="form-grid">
          <input placeholder="用户名（至少3位）" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input
            placeholder="密码（至少6位）"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input placeholder="邀请码（如 HZAU2026）" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          <button
            type="button"
            disabled={!username || !password || !inviteCode || submitting}
            onClick={submit}
          >
            {submitting ? "注册中..." : "注册"}
          </button>
        </div>
        <div className="form-error-slot">
          {!!msg && <p className={`message ${msg.includes("成功") ? "success" : "error"}`}>{msg}</p>}
        </div>
      </div>
    </main>
  );
}
