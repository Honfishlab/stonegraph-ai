import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protected route prefixes — require authentication.
 * Everything else (except `/api/`) is public.
 */
const PROTECTED_PREFIXES = [
  "/vault",
  "/upload",
  "/family",
  "/settings",
  "/billing",
  "/usage",
  "/myslate",
  "/agent",
  "/memorials",
  "/collection",
  "/permanent-viewer",
  "/onboarding",
];

/**
 * Routes that should redirect away from if already authenticated.
 */
const AUTH_ROUTES = ["/auth/signin", "/auth/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Static assets and special Next.js routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  // Create server-side Supabase client that reads cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          // Write refreshed tokens into request cookies (for downstream code)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create the response to pick up cookie changes
          supabaseResponse = NextResponse.next({ request });
          // Set cookie headers on the outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is the critical step.
  // Without this, the JWT can expire mid-session and cause 401s.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Protected route — redirect to signin if not authenticated ──────

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ── Auth routes — redirect to vault if already authenticated ───────

  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/vault";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - sitemap.xml, robots.txt
     * - images, files (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
