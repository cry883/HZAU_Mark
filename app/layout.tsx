import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { getAuthUserFromCookie } from "@/lib/auth";
import { UserPill } from "@/components/UserPill";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthUserFromCookie();
  const isAdmin = auth?.role === "ADMIN";

  return (
    <html lang="zh-CN">
      <body>
        <div className="container">
          <header className="site-header">
            <nav className="top-nav" aria-label="主导航">
              <div className="top-nav-left">
                <Link className="brand-link" href="/">
                  校内评分社区
                </Link>
                <div className="nav-links desktop-only">
                  <Link className="nav-link" href="/">首页</Link>
                  <Link className="nav-link" href="/boards">榜单</Link>
                  <Link className="nav-link" href="/boards/new">创建榜单</Link>
                  {isAdmin && (
                    <>
                      <Link className="nav-link" href="/admin/boards">审核榜单</Link>
                      <Link className="nav-link" href="/admin/items">审核对象</Link>
                    </>
                  )}
                </div>
              </div>

              <div className="nav-right desktop-only">
                {!auth && (
                  <>
                    <Link className="nav-link" href="/auth/login">登录</Link>
                    <Link className="nav-link" href="/auth/register">注册</Link>
                  </>
                )}
                {auth && <UserPill fallbackRole={auth.role} />}
                {auth && (
                  <form action="/api/auth/logout" method="post">
                    <button className="secondary" type="submit">退出</button>
                  </form>
                )}
              </div>

              <details className="mobile-nav mobile-only">
                <summary>菜单</summary>
                <div className="mobile-nav-panel">
                  <Link className="nav-link" href="/">首页</Link>
                  <Link className="nav-link" href="/boards">榜单</Link>
                  <Link className="nav-link" href="/boards/new">创建榜单</Link>
                  {isAdmin && (
                    <>
                      <Link className="nav-link" href="/admin/boards">审核榜单</Link>
                      <Link className="nav-link" href="/admin/items">审核对象</Link>
                    </>
                  )}
                  {!auth && (
                    <>
                      <Link className="nav-link" href="/auth/login">登录</Link>
                      <Link className="nav-link" href="/auth/register">注册</Link>
                    </>
                  )}
                  {auth && <UserPill fallbackRole={auth.role} />}
                  {auth && (
                    <form action="/api/auth/logout" method="post">
                      <button className="secondary mobile-logout" type="submit">退出</button>
                    </form>
                  )}
                </div>
              </details>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
