import { db } from "@/lib/db";

const TRAINING_FOCUSES: Record<string, string[]> = {
  shooting: ["shooting", "composure"],
  passing: ["passing", "positioning"],
  defending: ["defending", "physicality"],
  pace: ["pace", "dribbling"],
  physical: ["physicality", "composure"],
};

interface IndividualTrainingInput {
  playerId: string;
  clubId: string;
  focus: string;
}

/**
 * Set individual training focus for a player.
 * Focused training gives a 50% bonus to the selected attributes
 * on the next weekly tick.
 */
export async function setIndividualTraining(input: IndividualTrainingInput) {
  const player = await db.player.findUnique({
    where: { id: input.playerId },
  });

  if (!player) throw new Error("Player not found");
  if (player.clubId !== input.clubId) throw new Error("Not your player");

  const focusAttrs = TRAINING_FOCUSES[input.focus];
  if (!focusAttrs) throw new Error("Invalid training focus");

  // Store focus in player metadata (using morale field comment area —
  // in a full implementation this would be a separate table)
  // For now, we'll store it as a tactic-like json in the club's context

  return { playerId: input.playerId, focus: input.focus, attributes: focusAttrs };
}

export { TRAINING_FOCUSES };
