"use client";

import { useQuery } from "@tanstack/react-query";

interface Trophy {
  type: string;
  season: number;
  clubId: string;
}

interface Badge {
  badgeId: string;
  earnedAt: string;
}

interface ManagerProfile {
  id: string;
  reputation: number;
  level: number;
  xp: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  trophies: Trophy[];
  history: { clubId: string; season: number; position: number }[];
  badges: Badge[];
}

interface Rival {
  id: string;
  rival: { id: string; name: string; badgeId: string };
  intensity: number;
}

const BADGE_NAMES: Record<string, string> = {
  first_win: "First Victory",
  ten_wins: "10 Wins",
  fifty_wins: "50 Wins",
  promoted: "Promoted",
  triple_promotion: "Triple Promotion",
  league_winner: "League Champion",
  cup_winner: "Cup Winner",
  continental_winner: "Continental Champion",
  level_10: "Veteran Manager",
  level_25: "Elite Manager",
};

export default function ManagerPage() {
  const { data, isLoading } = useQuery<{
    profile: ManagerProfile;
    user: {
      id: string;
      name: string;
      club: { id: string; name: string; division: { name: string; tier: number } } | null;
    };
    rivalries: Rival[];
  }>({
    queryKey: ["manager"],
    queryFn: () => fetch("/api/manager").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Manager Profile</h1>
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!data?.profile) return null;

  const { profile, user, rivalries } = data;
  const totalGames = profile.totalWins + profile.totalDraws + profile.totalLosses;
  const winRate = totalGames > 0 ? ((profile.totalWins / totalGames) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manager Profile</h1>

      {/* Overview */}
      <div className="bg-panel rounded-lg border border-border p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center text-2xl font-bold text-primary">
            {(user?.name?.[0] ?? "M").toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.name ?? "Manager"}</h2>
            {user?.club && (
              <p className="text-muted">
                {user.club.name} — {user.club.division.name}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{profile.level}</div>
            <div className="text-xs text-muted">Level</div>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{profile.reputation}</div>
            <div className="text-xs text-muted">Reputation</div>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{winRate}%</div>
            <div className="text-xs text-muted">Win Rate</div>
          </div>
          <div className="bg-surface/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{profile.xp}</div>
            <div className="text-xs text-muted">XP</div>
          </div>
        </div>
      </div>

      {/* Career Stats */}
      <div className="bg-panel rounded-lg border border-border p-6">
        <h3 className="font-semibold mb-4">Career Record</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xl font-bold">{totalGames}</div>
            <div className="text-xs text-muted">Played</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">{profile.totalWins}</div>
            <div className="text-xs text-muted">Won</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">{profile.totalDraws}</div>
            <div className="text-xs text-muted">Drawn</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{profile.totalLosses}</div>
            <div className="text-xs text-muted">Lost</div>
          </div>
        </div>
      </div>

      {/* Badges */}
      {profile.badges && profile.badges.length > 0 && (
        <div className="bg-panel rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4">Badges</h3>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-primary/15 text-primary rounded-full text-sm font-medium"
              >
                {BADGE_NAMES[badge.badgeId] ?? badge.badgeId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trophies */}
      {profile.trophies && profile.trophies.length > 0 && (
        <div className="bg-panel rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4">Trophies</h3>
          <div className="space-y-2">
            {profile.trophies.map((trophy, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-accent">
                  {trophy.type === "league" ? "League" : trophy.type === "cup" ? "Cup" : "Continental"}
                </span>
                <span className="text-muted">Season {trophy.season}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rivalries */}
      {rivalries && rivalries.length > 0 && (
        <div className="bg-panel rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4">Rivalries</h3>
          <div className="space-y-3">
            {rivalries.map((rivalry) => (
              <div
                key={rivalry.id}
                className="flex items-center justify-between"
              >
                <span className="font-medium">{rivalry.rival.name}</span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < rivalry.intensity ? "bg-red-500" : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
