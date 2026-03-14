import type { MatchEventData, TeamRatings } from "@/types/game";

/**
 * Seeded random number generator for deterministic replays.
 */
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

interface EventGenConfig {
  homeRatings: TeamRatings;
  awayRatings: TeamRatings;
  homePlayers: Array<{ id: string; name: string; position: string }>;
  awayPlayers: Array<{ id: string; name: string; position: string }>;
  seed: number;
}

/**
 * Generate all match events minute-by-minute (90 minutes).
 * Pure function — no side effects, no DB calls.
 */
export function generateMatchEvents(config: EventGenConfig): {
  events: MatchEventData[];
  homeScore: number;
  awayScore: number;
  homePossession: number;
  homeShots: number;
  awayShots: number;
} {
  const { homeRatings, awayRatings, homePlayers, awayPlayers, seed } = config;
  const rng = createRng(seed);
  const events: MatchEventData[] = [];

  let homeScore = 0;
  let awayScore = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homePossCount = 0;
  let totalPossCount = 0;

  // Momentum tracker: positive = home momentum, negative = away
  let momentum = 0;

  // Kickoff event
  events.push({
    minute: 0,
    type: "KICKOFF",
    team: "home",
    detail: "First half kicks off",
  });

  function pickPlayer(
    team: "home" | "away",
    preferredPositions: string[]
  ): { id: string; name: string } | undefined {
    const roster = team === "home" ? homePlayers : awayPlayers;
    const preferred = roster.filter((p) =>
      preferredPositions.includes(p.position)
    );
    const pool = preferred.length > 0 ? preferred : roster;
    return pool[Math.floor(rng() * pool.length)];
  }

  function randomPitchPos(team: "home" | "away"): { x: number; y: number } {
    // x: 0-100 (left to right), y: 0-100 (top to bottom)
    const x = team === "home" ? 50 + rng() * 50 : rng() * 50;
    const y = 10 + rng() * 80;
    return { x, y };
  }

  for (let minute = 1; minute <= 90; minute++) {
    // Half time event
    if (minute === 46) {
      events.push({
        minute: 45,
        type: "HALFTIME",
        team: "home",
        detail: `Half time: ${homeScore}–${awayScore}`,
      });
    }

    // Momentum drift
    momentum += (rng() - 0.5) * 0.04;
    momentum = Math.max(-0.08, Math.min(0.08, momentum));

    // Score-based momentum: trailing team gets slight boost
    if (homeScore < awayScore) momentum += 0.01;
    if (awayScore < homeScore) momentum -= 0.01;

    // Chance calculation per blueprint
    const homeChance =
      0.28 +
      (homeRatings.attack / (homeRatings.attack + awayRatings.defence)) * 0.24 +
      momentum;
    const awayChance =
      0.24 +
      (awayRatings.attack / (awayRatings.attack + homeRatings.defence)) * 0.24 -
      momentum;

    // Possession tracking
    const homePossPct =
      homeRatings.midfield / (homeRatings.midfield + awayRatings.midfield);
    if (rng() < homePossPct) homePossCount++;
    totalPossCount++;

    // Home attack chain
    if (rng() < homeChance * 0.12) {
      // Tackle check
      const tackleChance = awayRatings.defence / (awayRatings.defence + homeRatings.attack) * 0.5;
      if (rng() < tackleChance) {
        const tackler = pickPlayer("away", ["DEF"]);
        const pos = randomPitchPos("away");
        events.push({
          minute,
          type: "TACKLE",
          team: "away",
          playerId: tackler?.id,
          playerName: tackler?.name,
          detail: `${tackler?.name} wins the ball`,
          xPos: pos.x,
          yPos: pos.y,
        });

        // Foul chance on tackle
        if (rng() < 0.25) {
          events.push({
            minute,
            type: "FOUL",
            team: "away",
            playerId: tackler?.id,
            playerName: tackler?.name,
            detail: `Foul by ${tackler?.name}`,
            xPos: pos.x,
            yPos: pos.y,
          });

          // Card chance
          if (rng() < 0.15) {
            events.push({
              minute,
              type: rng() < 0.9 ? "YELLOW_CARD" : "RED_CARD",
              team: "away",
              playerId: tackler?.id,
              playerName: tackler?.name,
              detail: `Card shown to ${tackler?.name}`,
            });
          }
        }
        continue;
      }

      // Shot generated
      homeShots++;
      const shooter = pickPlayer("home", ["FWD", "MID"]);
      const pos = randomPitchPos("home");

      // On target check
      const onTargetChance = 0.35 + homeRatings.attack * 0.002;
      if (rng() < onTargetChance) {
        // Goal check
        const goalChance = 0.30 + (homeRatings.attack - awayRatings.defence) * 0.003;
        if (rng() < goalChance) {
          homeScore++;
          events.push({
            minute,
            type: "GOAL",
            team: "home",
            playerId: shooter?.id,
            playerName: shooter?.name,
            detail: `GOAL! ${shooter?.name} scores! (${homeScore}–${awayScore})`,
            xPos: pos.x,
            yPos: pos.y,
          });
          momentum = 0.04; // Home momentum boost
        } else {
          // Save
          const keeper = pickPlayer("away", ["GK"]);
          events.push({
            minute,
            type: "SAVE",
            team: "away",
            playerId: keeper?.id,
            playerName: keeper?.name,
            detail: `Save by ${keeper?.name}`,
            xPos: pos.x,
            yPos: pos.y,
          });
        }
      } else {
        events.push({
          minute,
          type: "SHOT_OFF",
          team: "home",
          playerId: shooter?.id,
          playerName: shooter?.name,
          detail: `${shooter?.name} shoots wide`,
          xPos: pos.x,
          yPos: pos.y,
        });
      }
    }

    // Away attack chain
    if (rng() < awayChance * 0.12) {
      const tackleChance = homeRatings.defence / (homeRatings.defence + awayRatings.attack) * 0.5;
      if (rng() < tackleChance) {
        const tackler = pickPlayer("home", ["DEF"]);
        const pos = randomPitchPos("home");
        events.push({
          minute,
          type: "TACKLE",
          team: "home",
          playerId: tackler?.id,
          playerName: tackler?.name,
          detail: `${tackler?.name} wins the ball`,
          xPos: pos.x,
          yPos: pos.y,
        });

        if (rng() < 0.25) {
          events.push({
            minute,
            type: "FOUL",
            team: "home",
            playerId: tackler?.id,
            playerName: tackler?.name,
            detail: `Foul by ${tackler?.name}`,
            xPos: pos.x,
            yPos: pos.y,
          });
          if (rng() < 0.15) {
            events.push({
              minute,
              type: rng() < 0.9 ? "YELLOW_CARD" : "RED_CARD",
              team: "home",
              playerId: tackler?.id,
              playerName: tackler?.name,
              detail: `Card shown to ${tackler?.name}`,
            });
          }
        }
        continue;
      }

      awayShots++;
      const shooter = pickPlayer("away", ["FWD", "MID"]);
      const pos = randomPitchPos("away");

      const onTargetChance = 0.35 + awayRatings.attack * 0.002;
      if (rng() < onTargetChance) {
        const goalChance = 0.30 + (awayRatings.attack - homeRatings.defence) * 0.003;
        if (rng() < goalChance) {
          awayScore++;
          events.push({
            minute,
            type: "GOAL",
            team: "away",
            playerId: shooter?.id,
            playerName: shooter?.name,
            detail: `GOAL! ${shooter?.name} scores! (${homeScore}–${awayScore})`,
            xPos: pos.x,
            yPos: pos.y,
          });
          momentum = -0.04;
        } else {
          const keeper = pickPlayer("home", ["GK"]);
          events.push({
            minute,
            type: "SAVE",
            team: "home",
            playerId: keeper?.id,
            playerName: keeper?.name,
            detail: `Save by ${keeper?.name}`,
            xPos: pos.x,
            yPos: pos.y,
          });
        }
      } else {
        events.push({
          minute,
          type: "SHOT_OFF",
          team: "away",
          playerId: shooter?.id,
          playerName: shooter?.name,
          detail: `${shooter?.name} shoots wide`,
          xPos: pos.x,
          yPos: pos.y,
        });
      }
    }
  }

  // Full time
  events.push({
    minute: 90,
    type: "FULLTIME",
    team: "home",
    detail: `Full time: ${homeScore}–${awayScore}`,
  });

  const homePossession =
    totalPossCount > 0 ? Math.round((homePossCount / totalPossCount) * 100) : 50;

  return {
    events,
    homeScore,
    awayScore,
    homePossession,
    homeShots,
    awayShots,
  };
}
