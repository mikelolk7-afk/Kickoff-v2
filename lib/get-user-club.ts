import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Resolves the current user's club.
 * Tries userId first, then falls back to clubId from the JWT session.
 * If found by clubId but userId was missing on the club, re-links them.
 *
 * Returns { userId, club } or { userId: null, club: null } if unauthenticated.
 */
export async function getUserClub() {
  const session = await auth();
  if (!session?.user?.id) {
    return { userId: null, club: null } as const;
  }

  const userId = session.user.id;
  const clubId = (session.user as { clubId?: string | null }).clubId;

  let club = await db.club.findFirst({
    where: { userId },
  });

  if (!club && clubId) {
    club = await db.club.findFirst({
      where: { id: clubId },
    });
    // Re-link club to user if found by clubId but userId was missing
    if (club && !club.userId) {
      await db.club.update({ where: { id: club.id }, data: { userId } });
    }
  }

  return { userId, club };
}
