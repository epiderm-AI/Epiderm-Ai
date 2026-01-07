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
