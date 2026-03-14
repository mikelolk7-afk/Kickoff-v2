import type { MatchEventData, MatchResult, PlayerMatchRating, TeamRatings } from "@/types/game";

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

interface PlayerInfo {
  id: string;
  name: string;
  position: string;
  overall: number;
  shooting: number;
  composure: number;
}

export interface EventGenConfig {
  homeRatings: TeamRatings;
  awayRatings: TeamRatings;
  homePlayers: PlayerInfo[];
  awayPlayers: PlayerInfo[];
  seed: number;
  /** If true, play extra time + penalties if drawn at 90 min (cup matches). */
  isCupMatch?: boolean;
  homeFormation?: string;
  awayFormation?: string;
  homeSubs?: PlayerInfo[];
  awaySubs?: PlayerInfo[];
}

interface MatchStats {
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeFouls: number;
  awayFouls: number;
  homeCorners: number;
  awayCorners: number;
  homeYellows: number;
  awayYellows: number;
  homeReds: number;
  awayReds: number;
}

interface PlayerTracker {
  goals: number;
  assists: number;
  shotsOnTarget: number;
  shotsOff: number;
  tackles: number;
  fouls: number;
  saves: number;
  involvements: number;
  minuteOn: number;
  minuteOff: number;
  positions: Array<{ minute: number; x: number; y: number }>;
}

/**
 * Generate all match events minute-by-minute.
 * Pure function — no side effects, no DB calls.
 * Supports: assists, set pieces (corners, free kicks, penalties),
 * substitutions, formation effects, extra time, penalty shootouts,
 * player ratings, and heat map tracking.
 */
export function generateMatchEvents(config: EventGenConfig): MatchResult {
  const {
    homeRatings,
    awayRatings,
    homePlayers,
    awayPlayers,
    seed,
    isCupMatch = false,
    homeSubs = [],
    awaySubs = [],
  } = config;

  const rng = createRng(seed);
  const events: MatchEventData[] = [];

  let homeScore = 0;
  let awayScore = 0;
  let homePossCount = 0;
  let totalPossCount = 0;
  let momentum = 0;

  const stats: MatchStats = {
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeCorners: 0,
    awayCorners: 0,
    homeYellows: 0,
    awayYellows: 0,
    homeReds: 0,
    awayReds: 0,
  };

  // Active rosters (can change via substitutions)
  const homeActive = [...homePlayers];
  const awayActive = [...awayPlayers];
  const homeSubsAvail = [...homeSubs];
  const awaySubsAvail = [...awaySubs];
  let homeSubsUsed = 0;
  let awaySubsUsed = 0;
  const MAX_SUBS = 3;

  // Yellow card tracking for second yellows
  const yellowCards = new Set<string>();

  // Player tracking for ratings/heat maps
  const playerTrackers = new Map<string, PlayerTracker>();

  function initTracker(player: PlayerInfo, minuteOn: number) {
    if (!playerTrackers.has(player.id)) {
      playerTrackers.set(player.id, {
        goals: 0,
        assists: 0,
        shotsOnTarget: 0,
        shotsOff: 0,
        tackles: 0,
        fouls: 0,
        saves: 0,
        involvements: 0,
        minuteOn,
        minuteOff: -1,
        positions: [],
      });
    }
  }

  // Init trackers for all starters
  for (const p of [...homePlayers, ...awayPlayers]) {
    initTracker(p, 0);
  }

  function trackPosition(player: PlayerInfo, minute: number, x: number, y: number) {
    const t = playerTrackers.get(player.id);
    if (t) {
      t.positions.push({ minute, x, y });
      t.involvements++;
    }
  }

  function pickPlayer(
    roster: PlayerInfo[],
    preferredPositions: string[]
  ): PlayerInfo | undefined {
    const preferred = roster.filter((p) => preferredPositions.includes(p.position));
    const pool = preferred.length > 0 ? preferred : roster;
    return pool[Math.floor(rng() * pool.length)];
  }

  function pickAssist(
    roster: PlayerInfo[],
    scorerId: string | undefined
  ): PlayerInfo | undefined {
    // ~70% of goals have an assist
    if (rng() > 0.70) return undefined;
    const candidates = roster.filter((p) => p.id !== scorerId);
    if (candidates.length === 0) return undefined;
    // Prefer midfielders and forwards as assist providers
    const preferred = candidates.filter((p) => p.position === "MID" || p.position === "FWD");
    const pool = preferred.length > 0 ? preferred : candidates;
    return pool[Math.floor(rng() * pool.length)];
  }

  function randomPitchPos(team: "home" | "away"): { x: number; y: number } {
    const x = team === "home" ? 50 + rng() * 50 : rng() * 50;
    const y = 10 + rng() * 80;
    return { x, y };
  }

  function attackingThirdPos(team: "home" | "away"): { x: number; y: number } {
    const x = team === "home" ? 70 + rng() * 28 : 2 + rng() * 28;
    const y = 15 + rng() * 70;
    return { x, y };
  }

  function handleCard(
    team: "home" | "away",
    player: PlayerInfo,
    minute: number,
    pos: { x: number; y: number }
  ) {
    if (yellowCards.has(player.id)) {
      // Second yellow → red
      events.push({
        minute,
        type: "SECOND_YELLOW",
        team,
        playerId: player.id,
        playerName: player.name,
        detail: `Second yellow for ${player.name} — sent off!`,
        xPos: pos.x,
        yPos: pos.y,
      });
      if (team === "home") {
        stats.homeYellows++;
        stats.homeReds++;
        const idx = homeActive.findIndex((p) => p.id === player.id);
        if (idx >= 0) homeActive.splice(idx, 1);
      } else {
        stats.awayYellows++;
        stats.awayReds++;
        const idx = awayActive.findIndex((p) => p.id === player.id);
        if (idx >= 0) awayActive.splice(idx, 1);
      }
    } else if (rng() < 0.9) {
      // Yellow card
      yellowCards.add(player.id);
      if (team === "home") stats.homeYellows++;
      else stats.awayYellows++;
      events.push({
        minute,
        type: "YELLOW_CARD",
        team,
        playerId: player.id,
        playerName: player.name,
        detail: `Yellow card for ${player.name}`,
        xPos: pos.x,
        yPos: pos.y,
      });
    } else {
      // Straight red
      if (team === "home") stats.homeReds++;
      else stats.awayReds++;
      events.push({
        minute,
        type: "RED_CARD",
        team,
        playerId: player.id,
        playerName: player.name,
        detail: `Red card! ${player.name} is sent off!`,
        xPos: pos.x,
        yPos: pos.y,
      });
      const roster = team === "home" ? homeActive : awayActive;
      const idx = roster.findIndex((p) => p.id === player.id);
      if (idx >= 0) roster.splice(idx, 1);
    }
  }

  function trySubstitution(
    team: "home" | "away",
    minute: number
  ) {
    const subsUsed = team === "home" ? homeSubsUsed : awaySubsUsed;
    const subsAvail = team === "home" ? homeSubsAvail : awaySubsAvail;
    const active = team === "home" ? homeActive : awayActive;

    if (subsUsed >= MAX_SUBS || subsAvail.length === 0) return;

    // Substitution windows: 46+ minute, 60+, 75+
    const subWindows = [46, 60, 75];
    const isWindow = subWindows.some((w) => minute >= w && minute <= w + 2);
    if (!isWindow && rng() > 0.02) return; // Small chance outside windows

    // Pick a player to sub off (prefer lowest overall among outfield)
    const outfield = active.filter((p) => p.position !== "GK");
    if (outfield.length === 0) return;
    outfield.sort((a, b) => a.overall - b.overall);
    const subOff = outfield[0];

    // Pick a sub with same or similar position
    const samePos = subsAvail.filter((p) => p.position === subOff.position);
    const subOn = samePos.length > 0 ? samePos[0] : subsAvail[0];

    // Execute substitution
    const idx = active.findIndex((p) => p.id === subOff.id);
    if (idx >= 0) active[idx] = subOn;

    const subIdx = subsAvail.findIndex((p) => p.id === subOn.id);
    if (subIdx >= 0) subsAvail.splice(subIdx, 1);

    if (team === "home") homeSubsUsed++;
    else awaySubsUsed++;

    // Track sub off/on minutes
    const offTracker = playerTrackers.get(subOff.id);
    if (offTracker) offTracker.minuteOff = minute;
    initTracker(subOn, minute);

    events.push({
      minute,
      type: "SUBSTITUTION",
      team,
      playerId: subOn.id,
      playerName: subOn.name,
      detail: `${subOn.name} replaces ${subOff.name}`,
    });
  }

  function simulateAttack(
    attackTeam: "home" | "away",
    defendTeam: "home" | "away",
    atkRatings: TeamRatings,
    defRatings: TeamRatings,
    atkRoster: PlayerInfo[],
    defRoster: PlayerInfo[],
    minute: number,
    chance: number
  ): boolean {
    if (rng() >= chance * 0.12) return false;

    const isHome = attackTeam === "home";

    // Tackle check
    const tackleChance = defRatings.defence / (defRatings.defence + atkRatings.attack) * 0.5;
    if (rng() < tackleChance) {
      const tackler = pickPlayer(defRoster, ["DEF"]);
      const pos = randomPitchPos(defendTeam);
      if (tackler) {
        trackPosition(tackler, minute, pos.x, pos.y);
        const t = playerTrackers.get(tackler.id);
        if (t) t.tackles++;
      }
      events.push({
        minute,
        type: "TACKLE",
        team: defendTeam,
        playerId: tackler?.id,
        playerName: tackler?.name,
        detail: `${tackler?.name} wins the ball`,
        xPos: pos.x,
        yPos: pos.y,
      });

      // Foul chance on tackle
      if (rng() < 0.25) {
        if (isHome) stats.awayFouls++;
        else stats.homeFouls++;

        if (tackler) {
          const ft = playerTrackers.get(tackler.id);
          if (ft) ft.fouls++;
        }

        events.push({
          minute,
          type: "FOUL",
          team: defendTeam,
          playerId: tackler?.id,
          playerName: tackler?.name,
          detail: `Foul by ${tackler?.name}`,
          xPos: pos.x,
          yPos: pos.y,
        });

        // Free kick in attacking third → set piece chance
        if (pos.x > 65 || pos.x < 35) {
          const fkPos = attackingThirdPos(attackTeam);
          events.push({
            minute,
            type: "FREE_KICK",
            team: attackTeam,
            detail: `Free kick in a dangerous position`,
            xPos: fkPos.x,
            yPos: fkPos.y,
          });

          // Free kick goal chance (~8%)
          if (rng() < 0.08) {
            const fkShooter = pickPlayer(atkRoster, ["MID", "FWD"]);
            if (isHome) {
              homeScore++;
              stats.homeShotsOnTarget++;
              stats.homeShots++;
            } else {
              awayScore++;
              stats.awayShotsOnTarget++;
              stats.awayShots++;
            }
            if (fkShooter) {
              trackPosition(fkShooter, minute, fkPos.x, fkPos.y);
              const pt = playerTrackers.get(fkShooter.id);
              if (pt) {
                pt.goals++;
                pt.shotsOnTarget++;
              }
            }
            events.push({
              minute,
              type: "GOAL",
              team: attackTeam,
              playerId: fkShooter?.id,
              playerName: fkShooter?.name,
              detail: `GOAL! ${fkShooter?.name} scores from the free kick! (${homeScore}–${awayScore})`,
              xPos: fkPos.x,
              yPos: fkPos.y,
            });
            momentum = isHome ? 0.04 : -0.04;
          }
        }

        // Penalty check: foul very close to goal
        const inBox = isHome ? pos.x > 82 : pos.x < 18;
        if (inBox && rng() < 0.6) {
          const penTaker = pickPlayer(atkRoster, ["FWD", "MID"]);
          if (isHome) stats.homeShots++;
          else stats.awayShots++;

          // Penalty conversion ~78%
          if (rng() < 0.78) {
            if (isHome) {
              homeScore++;
              stats.homeShotsOnTarget++;
            } else {
              awayScore++;
              stats.awayShotsOnTarget++;
            }
            if (penTaker) {
              const pt = playerTrackers.get(penTaker.id);
              if (pt) {
                pt.goals++;
                pt.shotsOnTarget++;
              }
            }
            events.push({
              minute,
              type: "PENALTY_GOAL",
              team: attackTeam,
              playerId: penTaker?.id,
              playerName: penTaker?.name,
              detail: `PENALTY SCORED! ${penTaker?.name} converts! (${homeScore}–${awayScore})`,
              xPos: isHome ? 88 : 12,
              yPos: 50,
            });
            momentum = isHome ? 0.04 : -0.04;
          } else {
            events.push({
              minute,
              type: "PENALTY_MISS",
              team: attackTeam,
              playerId: penTaker?.id,
              playerName: penTaker?.name,
              detail: `Penalty missed by ${penTaker?.name}!`,
              xPos: isHome ? 88 : 12,
              yPos: 50,
            });
          }
        }

        // Card chance
        if (tackler && rng() < 0.15) {
          handleCard(defendTeam, tackler, minute, pos);
        }
      }
      return true; // Attack was stopped
    }

    // Shot generated
    if (isHome) stats.homeShots++;
    else stats.awayShots++;

    const shooter = pickPlayer(atkRoster, ["FWD", "MID"]);
    const pos = attackingThirdPos(attackTeam);
    if (shooter) trackPosition(shooter, minute, pos.x, pos.y);

    // On target check
    const onTargetChance = 0.35 + atkRatings.attack * 0.002;
    if (rng() < onTargetChance) {
      if (isHome) stats.homeShotsOnTarget++;
      else stats.awayShotsOnTarget++;

      // Goal check
      const goalChance = 0.30 + (atkRatings.attack - defRatings.defence) * 0.003;
      if (rng() < goalChance) {
        if (isHome) homeScore++;
        else awayScore++;

        // Assist tracking
        const assister = pickAssist(atkRoster, shooter?.id);
        if (assister) {
          const at = playerTrackers.get(assister.id);
          if (at) at.assists++;
        }

        if (shooter) {
          const st = playerTrackers.get(shooter.id);
          if (st) {
            st.goals++;
            st.shotsOnTarget++;
          }
        }

        events.push({
          minute,
          type: "GOAL",
          team: attackTeam,
          playerId: shooter?.id,
          playerName: shooter?.name,
          assistId: assister?.id,
          assistName: assister?.name,
          detail: assister
            ? `GOAL! ${shooter?.name} scores! Assisted by ${assister.name}. (${homeScore}–${awayScore})`
            : `GOAL! ${shooter?.name} scores! (${homeScore}–${awayScore})`,
          xPos: pos.x,
          yPos: pos.y,
        });
        momentum = isHome ? 0.04 : -0.04;
      } else {
        // Save
        const keeper = pickPlayer(defRoster, ["GK"]);
        if (keeper) {
          trackPosition(keeper, minute, isHome ? 98 : 2, 50);
          const kt = playerTrackers.get(keeper.id);
          if (kt) kt.saves++;
        }
        if (shooter) {
          const st = playerTrackers.get(shooter.id);
          if (st) st.shotsOnTarget++;
        }
        events.push({
          minute,
          type: "SAVE",
          team: defendTeam,
          playerId: keeper?.id,
          playerName: keeper?.name,
          detail: `Save by ${keeper?.name}`,
          xPos: pos.x,
          yPos: pos.y,
        });

        // Corner from save (~40%)
        if (rng() < 0.40) {
          if (isHome) stats.homeCorners++;
          else stats.awayCorners++;

          events.push({
            minute,
            type: "CORNER",
            team: attackTeam,
            detail: `Corner kick for ${attackTeam}`,
            xPos: isHome ? 98 : 2,
            yPos: rng() > 0.5 ? 5 : 95,
          });

          // Corner goal chance (~5%)
          if (rng() < 0.05) {
            const header = pickPlayer(atkRoster, ["DEF", "FWD"]);
            const cornerTaker = pickPlayer(atkRoster, ["MID"]);
            if (isHome) {
              homeScore++;
              stats.homeShotsOnTarget++;
              stats.homeShots++;
            } else {
              awayScore++;
              stats.awayShotsOnTarget++;
              stats.awayShots++;
            }
            if (header) {
              const ht = playerTrackers.get(header.id);
              if (ht) {
                ht.goals++;
                ht.shotsOnTarget++;
              }
            }
            if (cornerTaker) {
              const ct = playerTrackers.get(cornerTaker.id);
              if (ct) ct.assists++;
            }
            events.push({
              minute,
              type: "GOAL",
              team: attackTeam,
              playerId: header?.id,
              playerName: header?.name,
              assistId: cornerTaker?.id,
              assistName: cornerTaker?.name,
              detail: `GOAL! ${header?.name} heads it in from the corner! Assisted by ${cornerTaker?.name}. (${homeScore}–${awayScore})`,
              xPos: isHome ? 92 : 8,
              yPos: 50,
            });
            momentum = isHome ? 0.06 : -0.06;
          }
        }
      }
    } else {
      if (shooter) {
        const st = playerTrackers.get(shooter.id);
        if (st) st.shotsOff++;
      }
      events.push({
        minute,
        type: "SHOT_OFF",
        team: attackTeam,
        playerId: shooter?.id,
        playerName: shooter?.name,
        detail: `${shooter?.name} shoots wide`,
        xPos: pos.x,
        yPos: pos.y,
      });

      // Corner from wide shot (~20%)
      if (rng() < 0.20) {
        if (isHome) stats.homeCorners++;
        else stats.awayCorners++;
        events.push({
          minute,
          type: "CORNER",
          team: attackTeam,
          detail: `Corner kick for ${attackTeam}`,
          xPos: isHome ? 98 : 2,
          yPos: rng() > 0.5 ? 5 : 95,
        });
      }
    }

    return false;
  }

  /** Simulate a range of minutes. */
  function simulateMinutes(startMin: number, endMin: number, halfLabel: string) {
    if (startMin === 1) {
      events.push({
        minute: 0,
        type: "KICKOFF",
        team: "home",
        detail: `${halfLabel} kicks off`,
      });
    }

    for (let minute = startMin; minute <= endMin; minute++) {
      // Half time at 45
      if (minute === 46 && startMin <= 46) {
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

      // Red card penalty: reduce ratings slightly for team with fewer players
      const homeManPenalty = Math.max(0, 11 - homeActive.length) * 0.04;
      const awayManPenalty = Math.max(0, 11 - awayActive.length) * 0.04;

      // Chance calculation per blueprint
      const homeChance =
        0.28 +
        (homeRatings.attack / (homeRatings.attack + awayRatings.defence)) * 0.24 +
        momentum -
        homeManPenalty;
      const awayChance =
        0.24 +
        (awayRatings.attack / (awayRatings.attack + homeRatings.defence)) * 0.24 -
        momentum -
        awayManPenalty;

      // Possession tracking
      const homePossPct =
        homeRatings.midfield / (homeRatings.midfield + awayRatings.midfield);
      if (rng() < homePossPct) homePossCount++;
      totalPossCount++;

      // Substitution checks (second half only for regular time)
      if (minute >= 46) {
        trySubstitution("home", minute);
        trySubstitution("away", minute);
      }

      // Home attack
      const homeBlocked = simulateAttack(
        "home", "away",
        homeRatings, awayRatings,
        homeActive, awayActive,
        minute, homeChance
      );

      // Away attack (skip if home had a tackle that continued)
      if (!homeBlocked) {
        simulateAttack(
          "away", "home",
          awayRatings, homeRatings,
          awayActive, homeActive,
          minute, awayChance
        );
      }
    }
  }

  // ─── Regular time (90 minutes) ─────────────────────────────
  simulateMinutes(1, 90, "First half");

  let extraTime = false;
  let penalties = false;
  let homePenScore: number | undefined;
  let awayPenScore: number | undefined;

  // ─── Extra time (cup matches only) ─────────────────────────
  if (isCupMatch && homeScore === awayScore) {
    extraTime = true;
    events.push({
      minute: 90,
      type: "EXTRA_TIME_START",
      team: "home",
      detail: `Extra time begins. Score: ${homeScore}–${awayScore}`,
    });

    // Reset substitution allowance: 1 extra sub per team in ET
    homeSubsUsed = Math.max(0, homeSubsUsed - 1);
    awaySubsUsed = Math.max(0, awaySubsUsed - 1);

    simulateMinutes(91, 120, "Extra time");

    // ─── Penalty shootout ──────────────────────────────────
    if (homeScore === awayScore) {
      penalties = true;
      homePenScore = 0;
      awayPenScore = 0;

      events.push({
        minute: 120,
        type: "PENALTY_SHOOTOUT_START",
        team: "home",
        detail: `Penalty shootout! Score: ${homeScore}–${awayScore}`,
      });

      // 5 rounds + sudden death
      for (let round = 1; round <= 10; round++) {
        const roundMinute = 120 + round;

        // Home pen
        const homePenTaker = pickPlayer(homeActive, ["FWD", "MID", "DEF"]);
        const homeConversionChance = 0.75 + (homePenTaker?.composure ?? 70) * 0.001;
        if (rng() < homeConversionChance) {
          homePenScore++;
          events.push({
            minute: roundMinute,
            type: "PENALTY_GOAL",
            team: "home",
            playerId: homePenTaker?.id,
            playerName: homePenTaker?.name,
            detail: `Penalty scored by ${homePenTaker?.name}! (${homePenScore}–${awayPenScore})`,
            xPos: 88,
            yPos: 50,
          });
        } else {
          events.push({
            minute: roundMinute,
            type: "PENALTY_MISS",
            team: "home",
            playerId: homePenTaker?.id,
            playerName: homePenTaker?.name,
            detail: `Penalty missed by ${homePenTaker?.name}! (${homePenScore}–${awayPenScore})`,
            xPos: 88,
            yPos: 50,
          });
        }

        // Away pen
        const awayPenTaker = pickPlayer(awayActive, ["FWD", "MID", "DEF"]);
        const awayConversionChance = 0.75 + (awayPenTaker?.composure ?? 70) * 0.001;
        if (rng() < awayConversionChance) {
          awayPenScore++;
          events.push({
            minute: roundMinute,
            type: "PENALTY_GOAL",
            team: "away",
            playerId: awayPenTaker?.id,
            playerName: awayPenTaker?.name,
            detail: `Penalty scored by ${awayPenTaker?.name}! (${homePenScore}–${awayPenScore})`,
            xPos: 12,
            yPos: 50,
          });
        } else {
          events.push({
            minute: roundMinute,
            type: "PENALTY_MISS",
            team: "away",
            playerId: awayPenTaker?.id,
            playerName: awayPenTaker?.name,
            detail: `Penalty missed by ${awayPenTaker?.name}! (${homePenScore}–${awayPenScore})`,
            xPos: 12,
            yPos: 50,
          });
        }

        // Check if shootout decided after round 5+
        if (round >= 5 && homePenScore !== awayPenScore) break;

        // Check if mathematically decided before round 5
        if (round < 5) {
          const remainingRounds = 5 - round;
          if (homePenScore > awayPenScore + remainingRounds) break;
          if (awayPenScore > homePenScore + remainingRounds) break;
        }
      }
    }
  }

  // Full time
  const finalMinute = extraTime ? (penalties ? 121 : 120) : 90;
  let ftDetail = `Full time: ${homeScore}–${awayScore}`;
  if (penalties) {
    ftDetail += ` (Penalties: ${homePenScore}–${awayPenScore})`;
  } else if (extraTime) {
    ftDetail += ` (After Extra Time)`;
  }

  events.push({
    minute: finalMinute,
    type: "FULLTIME",
    team: "home",
    detail: ftDetail,
  });

  // ─── Calculate player ratings ──────────────────────────────
  const playerRatings: Record<string, PlayerMatchRating> = {};
  const allPlayers = [...homePlayers, ...awayPlayers, ...homeSubs, ...awaySubs];

  for (const player of allPlayers) {
    const tracker = playerTrackers.get(player.id);
    if (!tracker) continue;

    const minutesPlayed =
      tracker.minuteOff >= 0
        ? tracker.minuteOff - tracker.minuteOn
        : finalMinute - tracker.minuteOn;

    if (minutesPlayed <= 0) continue;

    // Base rating 6.0, modified by performance
    let rating = 6.0;
    rating += tracker.goals * 1.0;
    rating += tracker.assists * 0.6;
    rating += tracker.saves * 0.3;
    rating += tracker.tackles * 0.15;
    rating += tracker.shotsOnTarget * 0.1;
    rating -= tracker.fouls * 0.2;
    rating -= tracker.shotsOff * 0.05;

    // Involvement bonus (active participation)
    const involvementRate = tracker.involvements / (minutesPlayed || 1);
    rating += Math.min(involvementRate * 2, 0.5);

    // Clamp to 1.0-10.0
    rating = Math.max(1.0, Math.min(10.0, Math.round(rating * 10) / 10));

    const team = homePlayers.some((p) => p.id === player.id) || homeSubs.some((p) => p.id === player.id)
      ? "home" as const
      : "away" as const;

    playerRatings[player.id] = {
      playerId: player.id,
      playerName: player.name,
      team,
      position: player.position,
      rating,
      goals: tracker.goals,
      assists: tracker.assists,
      shotsOnTarget: tracker.shotsOnTarget,
      shotsOff: tracker.shotsOff,
      tackles: tracker.tackles,
      fouls: tracker.fouls,
      saves: tracker.saves,
      minutesPlayed,
      substitutedOff: tracker.minuteOff >= 0 ? tracker.minuteOff : undefined,
      substitutedOn: tracker.minuteOn > 0 ? tracker.minuteOn : undefined,
    };
  }

  // ─── Build heat map data ───────────────────────────────────
  const heatMap: Record<string, Array<{ minute: number; x: number; y: number }>> = {};
  for (const [playerId, tracker] of Array.from(playerTrackers.entries())) {
    if (tracker.positions.length > 0) {
      heatMap[playerId] = tracker.positions;
    }
  }

  const homePossession =
    totalPossCount > 0 ? Math.round((homePossCount / totalPossCount) * 100) : 50;

  return {
    events,
    homeScore,
    awayScore,
    homePossession,
    awayPossession: 100 - homePossession,
    homeShots: stats.homeShots,
    awayShots: stats.awayShots,
    homeShotsOnTarget: stats.homeShotsOnTarget,
    awayShotsOnTarget: stats.awayShotsOnTarget,
    homeFouls: stats.homeFouls,
    awayFouls: stats.awayFouls,
    homeCorners: stats.homeCorners,
    awayCorners: stats.awayCorners,
    homeYellows: stats.homeYellows,
    awayYellows: stats.awayYellows,
    homeReds: stats.homeReds,
    awayReds: stats.awayReds,
    playerRatings,
    heatMap,
    extraTime,
    penalties,
    homePenScore: penalties ? homePenScore : undefined,
    awayPenScore: penalties ? awayPenScore : undefined,
  };
}
