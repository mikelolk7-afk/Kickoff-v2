export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/squad/:path*",
    "/tactics/:path*",
    "/league/:path*",
    "/transfers/:path*",
    "/scouting/:path*",
    "/training/:path*",
    "/stadium/:path*",
    "/finances/:path*",
    "/store/:path*",
    "/cup/:path*",
    "/continental/:path*",
    "/manager/:path*",
    "/notifications/:path*",
    "/chat/:path*",
    "/match/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
  ],
};
