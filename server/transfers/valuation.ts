import type { Position } from "@prisma/client";

interface PlayerForValuation {
  overall: number;
  potential: number;
  age: number;
  position: Position;
  form: number;
}

/**
 * Calculate market value of a player.
 * Formula from blueprint:
 *   baseValue = overall^2 * 150
 *   ageMultiplier: ≤21=1.4, 22-26=1.2, 27-30=1.0, 31-33=0.70, 34+=0.40
 *   positionMult: FWD=1.15, MID=1.05, DEF=1.00, GK=0.90
 *   formMult: player.form / 70
 *   potentialBonus: +20% if (potential - overall) > 15
 *   marketValue = baseValue * ageMultiplier * positionMult * formMult * (1 + potentialBonus)
 */
export function calculateMarketValue(player: PlayerForValuation): number {
  const baseValue = player.overall * player.overall * 150;

  let ageMultiplier: number;
  if (player.age <= 21) ageMultiplier = 1.4;
  else if (player.age <= 26) ageMultiplier = 1.2;
  else if (player.age <= 30) ageMultiplier = 1.0;
  else if (player.age <= 33) ageMultiplier = 0.7;
  else ageMultiplier = 0.4;

  const positionMult: Record<Position, number> = {
    FWD: 1.15,
    MID: 1.05,
    DEF: 1.0,
    GK: 0.9,
  };

  const formMult = player.form / 70;

  const potentialGap = player.potential - player.overall;
  const potentialBonus = potentialGap > 15 ? 0.2 : 0;

  const marketValue =
    baseValue *
    ageMultiplier *
    positionMult[player.position] *
    formMult *
    (1 + potentialBonus);

  return Math.round(marketValue);
}

/**
 * Calculate a reasonable asking price range for AI clubs.
 * Adds 10-30% markup to market value.
 */
export function calculateAskingPrice(marketValue: number): number {
  const markup = 1.1 + Math.random() * 0.2;
  return Math.round(marketValue * markup);
}

/**
 * Check if an offer is reasonable compared to market value.
 * AI clubs accept offers >= 85% of market value.
 */
export function isOfferAcceptable(offerFee: number, marketValue: number): boolean {
  return offerFee >= marketValue * 0.85;
}

/**
 * Check if wage offer is acceptable to the player.
 * Player accepts if wage >= 110% of current wage.
 */
export function isWageAcceptable(offerWage: number, currentWage: number): boolean {
  return offerWage >= currentWage * 1.1;
}
