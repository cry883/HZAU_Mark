import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url));
  clearAuthCookie(res);
  return res;
}
