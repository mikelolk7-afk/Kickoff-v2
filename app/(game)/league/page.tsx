"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TableRow {
  id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  club: {
    id: string;
    name: string;
    kitHome: string;
    isAi: boolean;
  };
}

interface FixtureData {
  id: string;
  matchWeek: number;
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  homeClub: { id: string; name: string };
  awayClub: { id: string; name: string };
}

interface LeagueData {
  division: { name: string; tier: number };
  season: { number: number };
  table: TableRow[];
  fixtures: FixtureData[];
  clubId: string;
}

export default function LeaguePage() {
  const [tab, setTab] = useState<"table" | "fixtures">("table");

  const { data, isLoading } = useQuery<LeagueData>({
    queryKey: ["league"],
    queryFn: () => fetch("/api/league").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-panel rounded w-48" />
        <div className="h-96 bg-panel rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  // Group fixtures by match week
  const fixturesByWeek = data.fixtures.reduce(
    (acc, f) => {
      const week = f.matchWeek;
      if (!acc[week]) acc[week] = [];
      acc[week].push(f);
      return acc;
    },
    {} as Record<number, FixtureData[]>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{data.division.name}</h1>
        <p className="text-gray-400">Season {data.season.number}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("table")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            tab === "table" ? "bg-primary text-white" : "bg-panel text-gray-400"
          )}
        >
          Table
        </button>
        <button
          onClick={() => setTab("fixtures")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            tab === "fixtures" ? "bg-primary text-white" : "bg-panel text-gray-400"
          )}
        >
          Fixtures
        </button>
      </div>

      {tab === "table" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 px-2 w-8">#</th>
                <th className="text-left py-3 px-2">Club</th>
                <th className="text-center py-3 px-2">P</th>
                <th className="text-center py-3 px-2">W</th>
                <th className="text-center py-3 px-2">D</th>
                <th className="text-center py-3 px-2">L</th>
                <th className="text-center py-3 px-2">GF</th>
                <th className="text-center py-3 px-2">GA</th>
                <th className="text-center py-3 px-2">GD</th>
                <th className="text-center py-3 px-2 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.table.map((row, i) => {
                const isMyClub = row.club.id === data.clubId;
                const gd = row.goalsFor - row.goalsAgainst;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-gray-800/50 transition-colors",
                      isMyClub && "bg-primary/10",
                      i < 2 && "border-l-2 border-l-green-500",
                      i >= data.table.length - 2 && "border-l-2 border-l-red-500"
                    )}
                  >
                    <td className="py-2.5 px-2 text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.club.kitHome }}
                        />
                        <span
                          className={cn(
                            "font-medium truncate",
                            isMyClub && "text-primary"
                          )}
                        >
                          {row.club.name}
                        </span>
                        {!row.club.isAi && (
                          <span className="text-xs text-accent">●</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-2.5 px-2 text-gray-400">{row.played}</td>
                    <td className="text-center py-2.5 px-2 text-green-400">{row.won}</td>
                    <td className="text-center py-2.5 px-2 text-gray-300">{row.drawn}</td>
                    <td className="text-center py-2.5 px-2 text-red-400">{row.lost}</td>
                    <td className="text-center py-2.5 px-2 text-gray-400">{row.goalsFor}</td>
                    <td className="text-center py-2.5 px-2 text-gray-400">{row.goalsAgainst}</td>
                    <td
                      className={cn(
                        "text-center py-2.5 px-2",
                        gd > 0 ? "text-green-400" : gd < 0 ? "text-red-400" : "text-gray-400"
                      )}
                    >
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                    <td className="text-center py-2.5 px-2 font-bold text-accent">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex gap-4 text-xs text-gray-500 mt-3 px-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded" /> Promotion
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded" /> Relegation
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full" /> Human player
            </span>
          </div>
        </div>
      )}

      {tab === "fixtures" && (
        <div className="space-y-6">
          {Object.entries(fixturesByWeek).map(([week, fixtures]) => (
            <div key={week}>
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Match Week {week}
              </h3>
              <div className="space-y-1">
                {fixtures.map((f) => {
                  const isMyMatch =
                    f.homeClub.id === data.clubId || f.awayClub.id === data.clubId;
                  return (
                    <Link
                      key={f.id}
                      href={f.status === "COMPLETED" ? `/match/${f.id}` : "#"}
                      className={cn(
                        "card flex items-center py-2 px-3",
                        isMyMatch && "border-primary/30",
                        f.status === "COMPLETED" && "hover:border-primary/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex-1 text-sm text-right truncate",
                          f.homeClub.id === data.clubId && "text-primary font-medium"
                        )}
                      >
                        {f.homeClub.name}
                      </span>
                      <span className="px-4 text-center min-w-[80px]">
                        {f.status === "COMPLETED" ? (
                          <span className="font-bold text-accent">
                            {f.homeScore} – {f.awayScore}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {new Date(f.scheduledAt).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-sm truncate",
                          f.awayClub.id === data.clubId && "text-primary font-medium"
                        )}
                      >
                        {f.awayClub.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
