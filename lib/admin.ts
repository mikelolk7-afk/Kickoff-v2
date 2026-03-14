import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Check if current user is admin. Returns userId if admin, null otherwise.
 */
export async function requireAdmin(): Promise<
  { userId: string } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: session.user.id };
}
