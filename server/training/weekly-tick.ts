import { db } from "@/lib/db";

/**
 * Training development tick — runs Monday 00:00 UTC.
 *
 * Formula from blueprint:
 *   ageFactor: ≤21=1.5, ≤24=1.2, ≤28=0.8, ≤32=0.3, 33+=-0.5 (decline)
 *   coachBonus = coachStars * 0.1
 *   facilityBonus = trainingLevel * 0.05
 *   growth/attr = random(0.2–1.0) * ageFactor * coachBonus * facilityBonus
 */

function getAgeFactor(age: number): number {
  if (age <= 21) return 1.5;
  if (age <= 24) return 1.2;
  if (age <= 28) return 0.8;
  if (age <= 32) return 0.3;
  return -0.5; // Decline
}

const TRAINABLE_ATTRS = [
  "pace", "shooting", "passing", "dribbling",
  "defending", "physicality", "composure", "positioning",
] as const;

/**
 * Process weekly training for all clubs.
 */
export async function processWeeklyTraining() {
  const clubs = await db.club.findMany({
    include: {
      players: { where: { injuredUntil: null } },
      staff: { where: { role: "coach" } },
    },
  });

  let playersUpdated = 0;

  for (const club of clubs) {
    const bestCoach = club.staff.reduce(
      (best, s) => (s.stars > best ? s.stars : best),
      1
    );

    const coachBonus = bestCoach * 0.1;
    const facilityBonus = club.trainingLevel * 0.05;

    for (const player of club.players) {
      const ageFactor = getAgeFactor(player.age);

      const updates: Record<string, number> = {};
      let totalGrowth = 0;

      for (const attr of TRAINABLE_ATTRS) {
        const current = player[attr];
        const growth = (0.2 + Math.random() * 0.8) * ageFactor * coachBonus * facilityBonus;
        const rounded = Math.round(growth * 10) / 10;

        if (rounded !== 0) {
          const newVal = Math.max(1, Math.min(99, current + rounded));
          if (Math.round(newVal) !== current) {
            updates[attr] = Math.round(newVal);
            totalGrowth += rounded;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        // Recalculate overall
        const attrs = { ...player, ...updates };
        const overall = Math.round(
          (attrs.pace + attrs.shooting + attrs.passing + attrs.dribbling +
           attrs.defending + attrs.physicality + attrs.composure + attrs.positioning) / 8
        );

        await db.player.update({
          where: { id: player.id },
          data: {
            ...updates,
            overall,
            age: player.age, // Age doesn't change weekly — handled by season end
          },
        });
        playersUpdated++;
      }
    }
  }

  return playersUpdated;
}
