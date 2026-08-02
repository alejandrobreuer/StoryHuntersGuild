import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  cookies().set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return NextResponse.json({ ok: true });
}
