"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Calendar,
  Users,
  Crosshair,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Building,
  Heart,
  AlertTriangle,
  Star,
  ChevronRight,
  Shield,
  Zap,
  Activity,
  Target,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface DashboardData {
  club: {
    id: string;
    name: string;
    budget: number;
    reputation: number;
    stadiumCapacity: number;
    trainingLevel: number;
    medicalLevel: number;
    academyLevel: number;
  };
  division: { name: string; tier: number };
  season: { id: string; number: number } | null;
  nextFixture: {
    id: string;
    scheduledAt: string;
    homeClub: { id: string; name: string; kitHome: string };
    awayClub: { id: string; name: string; kitHome: string };
  } | null;
  lastResult: {
    id: string;
    homeScore: number;
    awayScore: number;
    homeClub: { id: string; name: string };
    awayClub: { id: string; name: string };
  } | null;
  recentFixtures: Array<{
    id: string;
    homeScore: number;
    awayScore: number;
    homeClubId: string;
    awayClubId: string;
    homeClub: { id: string; name: string };
    awayClub: { id: string; name: string };
  }>;
  form: string[];
  leaguePosition: number | null;
  leagueStats: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  } | null;
  totalTeams: number;
  miniTable: Array<{
    position: number;
    clubId: string;
    clubName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    isUser: boolean;
  }>;
  squad: {
    size: number;
    avgOverall: number;
    avgAge: number;
    avgMorale: number;
    injuredCount: number;
    weeklyWages: number;
    topPlayers: Array<{
      id: string;
      name: string;
      position: string;
      overall: number;
      age: number;
      morale: number;
      form: number;
    }>;
    positionCounts: { GK: number; DEF: number; MID: number; FWD: number };
  };
  transfers: {
    pendingOffers: number;
    sentOffers: number;
  };
  facilities: {
    activeUpgrades: number;
    stadiumUpgrade: { toLevel: number; completesAt: string } | null;
  };
}

// ─── Helpers ────────────────────────────────────────────────

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(0)}K`;
  return `€${amount}`;
}

const POS_COLORS: Record<string, string> = {
  GK: "bg-amber-600",
  DEF: "bg-blue-600",
  MID: "bg-emerald-600",
  FWD: "bg-red-600",
};

function FormBadge({ result }: { result: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold text-white",
        result === "W" && "bg-green-600",
        result === "D" && "bg-yellow-600",
        result === "L" && "bg-red-600"
      )}
    >
      {result}
    </span>
  );
}

// ─── Countdown ──────────────────────────────────────────────

function CountdownTimer({ target }: { target: string }) {
  const [diff, setDiff] = useState(new Date(target).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setDiff(new Date(target).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (diff <= 0) return <span className="text-accent font-bold animate-pulse">Match day!</span>;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex items-center gap-1 font-mono">
      {days > 0 && (
        <div className="text-center">
          <span className="text-2xl font-bold text-accent">{days}</span>
          <p className="text-[9px] text-subtle uppercase">days</p>
        </div>
      )}
      {days > 0 && <span className="text-subtle text-lg">:</span>}
      <div className="text-center">
        <span className="text-2xl font-bold text-accent">{String(hours).padStart(2, "0")}</span>
        <p className="text-[9px] text-subtle uppercase">hrs</p>
      </div>
      <span className="text-subtle text-lg">:</span>
      <div className="text-center">
        <span className="text-2xl font-bold text-accent">{String(minutes).padStart(2, "0")}</span>
        <p className="text-[9px] text-subtle uppercase">min</p>
      </div>
      <span className="text-subtle text-lg">:</span>
      <div className="text-center">
        <span className="text-2xl font-bold text-accent">{String(seconds).padStart(2, "0")}</span>
        <p className="text-[9px] text-subtle uppercase">sec</p>
      </div>
    </div>
  );
}

// ─── Stat Bar ───────────────────────────────────────────────

function StatBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-full bg-surface rounded-full h-1.5">
      <div
        className={cn("h-1.5 rounded-full transition-all", color)}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}

// ─── Kit Colors ──────────────────────────────────────────────

const KIT_COLORS = [
  { name: "Red", value: "#e63946" },
  { name: "Blue", value: "#457b9d" },
  { name: "Green", value: "#2a9d8f" },
  { name: "Yellow", value: "#e9c46a" },
  { name: "Orange", value: "#f4a261" },
  { name: "Navy", value: "#264653" },
  { name: "Purple", value: "#6a0572" },
  { name: "Forest", value: "#1a7a3c" },
  { name: "Crimson", value: "#d53a3a" },
  { name: "Sky", value: "#3a7bd5" },
  { name: "White", value: "#f1faee" },
  { name: "Black", value: "#1d1d1d" },
];

// ─── No Club State ──────────────────────────────────────────

function NoClubState({ errorMessage }: { errorMessage?: string }) {
  const queryClient = useQueryClient();
  const [clubName, setClubName] = useState("");
  const [kitHome, setKitHome] = useState("#e63946");
  const [kitAway, setKitAway] = useState("#f1faee");

  const createClub = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/club/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubName, kitHome, kitAway }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create club");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="card text-center">
        <div className="text-5xl mb-4">&#9917;</div>
        <h2 className="text-2xl font-bold mb-2">Create Your Club</h2>
        <p className="text-muted text-sm mb-6">
          {errorMessage === "No club found"
            ? "You don't have a club yet. Set one up to start playing!"
            : errorMessage ?? "Set up your club to get started."}
        </p>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm text-foreground mb-1">Club Name</label>
            <input
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="input-field"
              placeholder="e.g. Ironclad FC"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm text-foreground mb-2">Home Kit</label>
            <div className="grid grid-cols-6 gap-2">
              {KIT_COLORS.map((c) => (
                <button
                  key={`home-${c.value}`}
                  type="button"
                  onClick={() => setKitHome(c.value)}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 transition-all",
                    kitHome === c.value ? "border-accent scale-110" : "border-border"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-foreground mb-2">Away Kit</label>
            <div className="grid grid-cols-6 gap-2">
              {KIT_COLORS.map((c) => (
                <button
                  key={`away-${c.value}`}
                  type="button"
                  onClick={() => setKitAway(c.value)}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 transition-all",
                    kitAway === c.value ? "border-accent scale-110" : "border-border"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {createClub.isError && (
            <p className="text-sm text-red-400 text-center">{createClub.error.message}</p>
          )}

          <button
            onClick={() => createClub.mutate()}
            disabled={!clubName || clubName.length < 2 || createClub.isPending}
            className="btn-primary w-full disabled:opacity-50"
          >
            {createClub.isPending ? "Creating..." : "Create Club & Start Playing"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/club/dashboard");
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load dashboard");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-panel rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-panel rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.club) {
    return <NoClubState errorMessage={error?.message} />;
  }

  const { club, division, squad, transfers, facilities } = data;
  const isHome = data.nextFixture?.homeClub.id === club.id;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <p className="text-muted text-sm flex items-center gap-2">
            <Shield size={14} />
            {division.name} · Tier {division.tier}
            {data.season && <span className="text-subtle">· Season {data.season.number}</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{formatMoney(club.budget)}</p>
          <p className="text-xs text-subtle">Budget</p>
        </div>
      </div>

      {/* Row 1: Next Match (wide) + Form + League Position */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next Match — hero card */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted text-sm">
              <Calendar size={14} />
              Next Match
            </div>
            {data.nextFixture && (
              <Link href={`/match/${data.nextFixture.id}`} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Match Centre <ChevronRight size={12} />
              </Link>
            )}
          </div>

          {data.nextFixture ? (
            <div className="flex items-center gap-4">
              {/* Home team */}
              <div className="flex-1 text-center">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 ring-2 ring-border"
                  style={{ backgroundColor: data.nextFixture.homeClub.kitHome }}
                />
                <p className={cn("text-sm font-medium truncate", isHome && "text-primary")}>
                  {data.nextFixture.homeClub.name}
                </p>
                {isHome && <p className="text-[10px] text-primary">HOME</p>}
              </div>

              {/* Countdown */}
              <div className="text-center px-2">
                <CountdownTimer target={data.nextFixture.scheduledAt} />
              </div>

              {/* Away team */}
              <div className="flex-1 text-center">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 ring-2 ring-border"
                  style={{ backgroundColor: data.nextFixture.awayClub.kitHome }}
                />
                <p className={cn("text-sm font-medium truncate", !isHome && "text-primary")}>
                  {data.nextFixture.awayClub.name}
                </p>
                {!isHome && <p className="text-[10px] text-primary">AWAY</p>}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar size={24} className="mx-auto text-subtle mb-2" />
              <p className="text-subtle text-sm">No upcoming fixture scheduled</p>
            </div>
          )}
        </div>

        {/* League Position */}
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-3">
            <Trophy size={14} />
            League Standing
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-5xl font-bold text-primary">
              {data.leaguePosition ?? "–"}
            </span>
            <span className="text-subtle text-lg">/ {data.totalTeams || "–"}</span>
          </div>
          {data.leagueStats && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-lg font-bold text-green-500">{data.leagueStats.won}</p>
                <p className="text-subtle">Won</p>
              </div>
              <div>
                <p className="text-lg font-bold text-muted">{data.leagueStats.drawn}</p>
                <p className="text-subtle">Drawn</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{data.leagueStats.lost}</p>
                <p className="text-subtle">Lost</p>
              </div>
            </div>
          )}
          {data.leagueStats && (
            <div className="mt-2 pt-2 border-t border-border flex justify-between text-xs text-muted">
              <span>{data.leagueStats.goalsFor} GF</span>
              <span>{data.leagueStats.goalsAgainst} GA</span>
              <span className="text-accent font-bold">{data.leagueStats.points} pts</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Form + Last Result + Recent Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Form */}
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-3">
            <Activity size={14} />
            Recent Form
          </div>
          {data.form.length > 0 ? (
            <div className="flex items-center gap-2 mb-3">
              {data.form.map((f, i) => (
                <FormBadge key={i} result={f} />
              ))}
              {data.form.length < 5 &&
                Array.from({ length: 5 - data.form.length }).map((_, i) => (
                  <span key={`empty-${i}`} className="w-6 h-6 rounded bg-surface border border-border" />
                ))}
            </div>
          ) : (
            <p className="text-subtle text-sm">No matches played yet</p>
          )}
          {data.form.length > 0 && (
            <p className="text-xs text-subtle">
              Last {data.form.length} matches: {data.form.filter((f) => f === "W").length}W{" "}
              {data.form.filter((f) => f === "D").length}D{" "}
              {data.form.filter((f) => f === "L").length}L
            </p>
          )}
        </div>

        {/* Last Result */}
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-3">
            <Target size={14} />
            Last Result
          </div>
          {data.lastResult ? (
            <Link href={`/match/${data.lastResult.id}`} className="block hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate flex-1">
                  {data.lastResult.homeClub.name}
                </span>
                <span className="text-2xl font-bold px-4 text-accent">
                  {data.lastResult.homeScore} – {data.lastResult.awayScore}
                </span>
                <span className="text-sm font-medium truncate flex-1 text-right">
                  {data.lastResult.awayClub.name}
                </span>
              </div>
            </Link>
          ) : (
            <p className="text-subtle text-sm">No results yet</p>
          )}
        </div>

        {/* Recent Results list */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted text-sm">
              <Calendar size={14} />
              Recent Matches
            </div>
            <Link href="/league" className="text-xs text-primary hover:underline">All fixtures</Link>
          </div>
          {data.recentFixtures.length > 0 ? (
            <div className="space-y-1.5">
              {data.recentFixtures.slice(0, 4).map((f) => {
                const isH = f.homeClubId === club.id;
                const myGoals = isH ? f.homeScore : f.awayScore;
                const theirGoals = isH ? f.awayScore : f.homeScore;
                const result = myGoals > theirGoals ? "W" : myGoals < theirGoals ? "L" : "D";
                const opponent = isH ? f.awayClub.name : f.homeClub.name;
                return (
                  <Link key={f.id} href={`/match/${f.id}`} className="flex items-center gap-2 text-xs hover:bg-surface rounded px-1 py-0.5 -mx-1 transition-colors">
                    <FormBadge result={result} />
                    <span className="truncate flex-1">{isH ? "vs" : "@"} {opponent}</span>
                    <span className="font-mono font-bold text-muted">{f.homeScore}–{f.awayScore}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-subtle text-sm">No matches played</p>
          )}
        </div>
      </div>

      {/* Row 3: Mini League Table */}
      {data.miniTable.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted text-sm">
              <Trophy size={14} />
              League Table
            </div>
            <Link href="/league" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Full table <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="py-1.5 px-2 text-left w-8">#</th>
                  <th className="py-1.5 px-2 text-left">Club</th>
                  <th className="py-1.5 px-1 text-center">P</th>
                  <th className="py-1.5 px-1 text-center">W</th>
                  <th className="py-1.5 px-1 text-center">D</th>
                  <th className="py-1.5 px-1 text-center">L</th>
                  <th className="py-1.5 px-1 text-center">GD</th>
                  <th className="py-1.5 px-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {data.miniTable.map((row, i) => (
                  <tr
                    key={row.clubId}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      row.isUser && "bg-primary/10 font-medium",
                      i > 0 && data.miniTable[i - 1].position !== row.position - 1 && "border-t-2 border-border"
                    )}
                  >
                    <td className="py-1.5 px-2 text-muted">{row.position}</td>
                    <td className="py-1.5 px-2 truncate max-w-[150px]">
                      {row.isUser ? <span className="text-primary">{row.clubName}</span> : row.clubName}
                    </td>
                    <td className="py-1.5 px-1 text-center text-muted">{row.played}</td>
                    <td className="py-1.5 px-1 text-center text-green-500">{row.won}</td>
                    <td className="py-1.5 px-1 text-center text-muted">{row.drawn}</td>
                    <td className="py-1.5 px-1 text-center text-red-500">{row.lost}</td>
                    <td className="py-1.5 px-1 text-center text-muted">{row.goalsFor - row.goalsAgainst}</td>
                    <td className="py-1.5 px-2 text-right font-bold text-accent">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 4: Squad + Finances + Transfers + Facilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Squad Summary */}
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-3">
            <Users size={14} />
            Squad
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Players</span>
              <span className="font-medium">{squad.size}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Avg Overall</span>
              <span className="font-medium">{squad.avgOverall}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Avg Age</span>
              <span className="font-medium">{squad.avgAge}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Morale</span>
              <span className={cn("font-medium", squad.avgMorale >= 70 ? "text-green-500" : squad.avgMorale >= 50 ? "text-yellow-500" : "text-red-500")}>
                {squad.avgMorale}%
              </span>
            </div>
            <StatBar value={squad.avgMorale} color={squad.avgMorale >= 70 ? "bg-green-500" : squad.avgMorale >= 50 ? "bg-yellow-500" : "bg-red-500"} />
            {squad.injuredCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                <AlertTriangle size={12} />
                {squad.injuredCount} injured
              </div>
            )}
          </div>

          {/* Position breakdown */}
          <div className="flex gap-1.5 mt-3 pt-2 border-t border-border">
            {(Object.entries(squad.positionCounts) as [string, number][]).map(([pos, count]) => (
              <div key={pos} className="flex-1 text-center">
                <span className={cn("inline-block w-full py-0.5 rounded text-[10px] font-bold text-white", POS_COLORS[pos])}>
                  {pos}
                </span>
                <p className="text-xs font-medium mt-0.5">{count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Players */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted text-sm">
              <Star size={14} />
              Top Players
            </div>
            <Link href="/squad" className="text-xs text-primary hover:underline">Squad</Link>
          </div>
          <div className="space-y-2.5">
            {squad.topPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className={cn("w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white", POS_COLORS[p.position])}>
                  {p.overall}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-subtle">{p.position} · {p.age}y</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-0.5">
                    <Heart size={10} className={cn(p.morale >= 70 ? "text-green-500" : p.morale >= 50 ? "text-yellow-500" : "text-red-500")} />
                    <span className="text-[10px] text-subtle">{p.morale}</span>
                  </div>
                </div>
              </div>
            ))}
            {squad.topPlayers.length === 0 && (
              <p className="text-subtle text-sm">No players in squad</p>
            )}
          </div>
        </div>

        {/* Finances */}
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-3">
            <Wallet size={14} />
            Finances
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Budget</span>
              <span className="font-bold text-primary">{formatMoney(club.budget)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Weekly Wages</span>
              <span className="font-medium text-red-400">{formatMoney(squad.weeklyWages)}/w</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Stadium</span>
              <span className="font-medium">{club.stadiumCapacity.toLocaleString()} seats</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Reputation</span>
              <span className="font-medium">{club.reputation}</span>
            </div>
            <StatBar value={club.reputation} color="bg-accent" />
          </div>
          <Link href="/finances" className="block mt-3 pt-2 border-t border-border text-xs text-primary hover:underline text-center">
            View Finances
          </Link>
        </div>

        {/* Transfer & Facilities Activity */}
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-3">
            <Zap size={14} />
            Activity
          </div>
          <div className="space-y-3">
            {/* Transfer offers */}
            <Link href="/transfers" className="flex items-center gap-3 hover:bg-surface rounded-lg p-2 -m-2 transition-colors">
              <ArrowRightLeft size={16} className="text-accent" />
              <div className="flex-1">
                <p className="text-sm font-medium">Transfers</p>
                <p className="text-[10px] text-subtle">
                  {transfers.pendingOffers} received · {transfers.sentOffers} sent
                </p>
              </div>
              {(transfers.pendingOffers > 0) && (
                <span className="bg-accent text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {transfers.pendingOffers}
                </span>
              )}
            </Link>

            {/* Facilities */}
            <Link href="/stadium" className="flex items-center gap-3 hover:bg-surface rounded-lg p-2 -m-2 transition-colors">
              <Building size={16} className="text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Facilities</p>
                <p className="text-[10px] text-subtle">
                  {facilities.activeUpgrades > 0
                    ? `${facilities.activeUpgrades} upgrade${facilities.activeUpgrades > 1 ? "s" : ""} in progress`
                    : "No active upgrades"}
                </p>
              </div>
              {facilities.activeUpgrades > 0 && (
                <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {facilities.activeUpgrades}
                </span>
              )}
            </Link>

            {/* Facility levels */}
            <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-subtle">Training</span>
                <span className="font-medium">Lv{club.trainingLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">Medical</span>
                <span className="font-medium">Lv{club.medicalLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">Academy</span>
                <span className="font-medium">Lv{club.academyLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">Analytics</span>
                <span className="font-medium">Lv{club.academyLevel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { href: "/squad", icon: Users, label: "Squad" },
          { href: "/tactics", icon: Crosshair, label: "Tactics" },
          { href: "/transfers", icon: ArrowRightLeft, label: "Transfers" },
          { href: "/training", icon: TrendingUp, label: "Training" },
          { href: "/stadium", icon: Building, label: "Stadium" },
          { href: "/league", icon: Trophy, label: "League" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-2.5 py-3 hover:border-primary/50 transition-colors"
          >
            <Icon size={18} className="text-primary" />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
