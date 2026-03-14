import { db } from "@/lib/db";

const REGIONS = [
  "Europe", "South America", "Africa", "Asia", "North America", "Oceania",
];

const SCOUT_DURATIONS: Record<number, number> = {
  1: 48, // hours
  2: 36,
  3: 24,
  4: 18,
  5: 12,
};

interface CreateAssignmentInput {
  clubId: string;
  scoutId: string;
  region: string;
}

/**
 * Send a scout on an assignment.
 */
export async function createAssignment(input: CreateAssignmentInput) {
  if (!REGIONS.includes(input.region)) throw new Error("Invalid region");

  const scout = await db.staff.findUnique({
    where: { id: input.scoutId },
  });
  if (!scout) throw new Error("Scout not found");
  if (scout.clubId !== input.clubId) throw new Error("Not your scout");
  if (scout.role !== "scout") throw new Error("Staff member is not a scout");

  // Check scout isn't already on assignment
  const existing = await db.scoutAssignment.findFirst({
    where: {
      scoutId: input.scoutId,
      status: "IN_PROGRESS",
    },
  });
  if (existing) throw new Error("Scout already on assignment");

  const duration = SCOUT_DURATIONS[scout.stars] ?? 48;
  const completesAt = new Date();
  completesAt.setHours(completesAt.getHours() + duration);

  return db.scoutAssignment.create({
    data: {
      clubId: input.clubId,
      scoutId: input.scoutId,
      region: input.region,
      duration,
      completesAt,
    },
  });
}

/**
 * Cancel a scout assignment.
 */
export async function cancelAssignment(assignmentId: string, clubId: string) {
  const assignment = await db.scoutAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) throw new Error("Assignment not found");
  if (assignment.clubId !== clubId) throw new Error("Not your assignment");
  if (assignment.status !== "IN_PROGRESS") throw new Error("Assignment not in progress");

  return db.scoutAssignment.update({
    where: { id: assignmentId },
    data: { status: "CANCELLED" },
  });
}

/**
 * Get all assignments for a club.
 */
export async function getAssignments(clubId: string) {
  return db.scoutAssignment.findMany({
    where: { clubId },
    include: {
      scout: true,
      report: true,
    },
    orderBy: { startedAt: "desc" },
  });
}

export { REGIONS };
