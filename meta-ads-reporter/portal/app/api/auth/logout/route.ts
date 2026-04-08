import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.redirect(new URL("/admin/login", process.env.CLIENT_PORTAL_URL ?? "http://localhost:3000"));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
