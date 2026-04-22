"use client";

import { useEffect, useState } from "react";

type Me = {
  username: string;
  role: "USER" | "ADMIN";
};

export function UserPill({ fallbackRole }: { fallbackRole?: string }) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.username) setMe({ username: d.username, role: d.role });
      })
      .catch(() => {});
  }, []);

  return (
    <span className="user-pill">
      <span className="user-icon" aria-hidden="true">👤</span>
      {me?.username ?? `已登录用户${fallbackRole ? ` (${fallbackRole})` : ""}`}
    </span>
  );
}
