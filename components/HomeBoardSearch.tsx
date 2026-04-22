"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function HomeBoardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/boards?q=${encodeURIComponent(q)}` : "/boards");
  }

  return (
    <form className="hero-search" onSubmit={onSubmit}>
      <div className="home-search-row">
        <input
          type="search"
          placeholder="搜索榜单关键词（如：食堂、课程、景点）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">搜索</button>
      </div>
    </form>
  );
}
