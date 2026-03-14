"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Users,
  Crosshair,
  TrendingUp,
} from "lucide-react";

interface DashboardData {
  club: { id: string; name: string; budget: number; reputation: number };
  division: { name: string; tier: number };
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
  leaguePosition: number;
  leagueStats: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    points: number;
  } | null;
  totalTeams: number;
}

function CountdownTimer({ target }: { target: string }) {
  const targetDate = new Date(target);
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return <span className="text-accent">Match day!</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <span className="text-accent font-mono text-lg">
      {days > 0 && `${days}d `}
      {hours}h {minutes}m
    </span>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/club/dashboard").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-panel rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-panel rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.club) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">No club found. Please register first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{data.club.name}</h1>
        <p className="text-gray-400">{data.division.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Next Match */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Calendar size={16} />
            Next Match
          </div>
          {data.nextFixture ? (
            <Link href={`/match/${data.nextFixture.id}`} className="block">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: data.nextFixture.homeClub.kitHome }}
                  />
                  <p className="text-sm font-medium truncate">
                    {data.nextFixture.homeClub.name}
                  </p>
                </div>
                <div className="px-4 text-gray-500 text-lg font-bold">vs</div>
                <div className="text-center flex-1">
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: data.nextFixture.awayClub.kitHome }}
                  />
                  <p className="text-sm font-medium truncate">
                    {data.nextFixture.awayClub.name}
                  </p>
                </div>
              </div>
              <div className="text-center mt-3">
                <CountdownTimer target={data.nextFixture.scheduledAt} />
              </div>
            </Link>
          ) : (
            <p className="text-gray-500">No upcoming match</p>
          )}
        </div>

        {/* Last Result */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Trophy size={16} />
            Last Result
          </div>
          {data.lastResult ? (
            <Link href={`/match/${data.lastResult.id}`} className="block">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate flex-1">
                  {data.lastResult.homeClub.name}
                </span>
                <span className="text-xl font-bold px-3 text-accent">
                  {data.lastResult.homeScore} – {data.lastResult.awayScore}
                </span>
                <span className="text-sm font-medium truncate flex-1 text-right">
                  {data.lastResult.awayClub.name}
                </span>
              </div>
            </Link>
          ) : (
            <p className="text-gray-500">No results yet</p>
          )}
        </div>

        {/* League Position */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <TrendingUp size={16} />
            League Position
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">
              {data.leaguePosition || "–"}
            </span>
            <span className="text-gray-500">/ {data.totalTeams}</span>
          </div>
          {data.leagueStats && (
            <div className="flex gap-4 text-sm text-gray-400">
              <span>P {data.leagueStats.played}</span>
              <span className="text-green-400">W {data.leagueStats.won}</span>
              <span className="text-gray-300">D {data.leagueStats.drawn}</span>
              <span className="text-red-400">L {data.leagueStats.lost}</span>
              <span className="text-accent font-medium">
                {data.leagueStats.points} pts
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/squad"
          className="card flex items-center gap-3 hover:border-primary/50 transition-colors"
        >
          <Users size={20} className="text-primary" />
          <span className="text-sm font-medium">Squad</span>
        </Link>
        <Link
          href="/tactics"
          className="card flex items-center gap-3 hover:border-primary/50 transition-colors"
        >
          <Crosshair size={20} className="text-primary" />
          <span className="text-sm font-medium">Tactics</span>
        </Link>
        <Link
          href="/league"
          className="card flex items-center gap-3 hover:border-primary/50 transition-colors"
        >
          <Trophy size={20} className="text-primary" />
          <span className="text-sm font-medium">League Table</span>
        </Link>
        <Link
          href="/league"
          className="card flex items-center gap-3 hover:border-primary/50 transition-colors"
        >
          <Calendar size={20} className="text-primary" />
          <span className="text-sm font-medium">Fixtures</span>
        </Link>
      </div>
    </div>
  );
}
