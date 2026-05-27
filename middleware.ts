import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

const PUBLIC_API_PREFIXES = ["/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/api") && !PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p)));

  if (!isProtectedPath) return NextResponse.next();

  const session = await auth();
  if (session?.user?.id) return NextResponse.next();

  // Browser nav → redirect to sign-in. API call → 401 JSON.
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const signIn = new URL("/api/auth/signin", req.url);
  signIn.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
