import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  const allowedRoles = (process.env.NEXT_PUBLIC_ALLOWED_ROLES ?? "practitioner")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

  const roleValue =
    user.app_metadata?.role ??
    user.user_metadata?.role ??
    user.app_metadata?.roles ??
    user.user_metadata?.roles ??
    null;

  const hasAllowedRole = Array.isArray(roleValue)
    ? roleValue.some((role) => allowedRoles.includes(role))
    : typeof roleValue === "string"
      ? allowedRoles.includes(roleValue)
      : false;

  if (!hasAllowedRole) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/unauthorized";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/patients/:path*",
    "/sessions/:path*",
    "/capture/:path*",
    "/analysis/:path*",
    "/calibration/:path*",
    "/mask-fit/:path*",
  ],
};
