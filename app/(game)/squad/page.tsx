"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  nationality: string;
  age: number;
  position: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physicality: number;
  composure: number;
  positioning: number;
  overall: number;
  potential: number;
  morale: number;
  form: number;
  injuredUntil: string | null;
  wage: number;
}

const POSITION_COLORS: Record<string, string> = {
  GK: "bg-yellow-600",
  DEF: "bg-blue-600",
  MID: "bg-green-600",
  FWD: "bg-red-600",
};

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted w-20">{label}</span>
      <div className="flex-1 bg-surface rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full",
            value >= 70 ? "bg-green-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono w-6 text-right">{value}</span>
    </div>
  );
}

function PlayerCard({ player, onClick }: { player: Player; onClick: () => void }) {
  const isInjured = player.injuredUntil && new Date(player.injuredUntil) > new Date();

  return (
    <button
      onClick={onClick}
      className="card w-full text-left hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-primary">{player.overall}</span>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded font-medium text-white",
              POSITION_COLORS[player.position]
            )}
          >
            {player.position}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{player.name}</p>
            {isInjured && (
              <span className="text-xs bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">
                INJ
              </span>
            )}
          </div>
          <p className="text-xs text-muted">
            {player.nationality} · {player.age}y ·{" "}
            {(player.wage / 1000).toFixed(1)}k/w
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Form</div>
          <div
            className={cn(
              "text-sm font-medium",
              player.form >= 70
                ? "text-green-400"
                : player.form >= 50
                ? "text-yellow-400"
                : "text-red-400"
            )}
          >
            {player.form}
          </div>
        </div>
      </div>
    </button>
  );
}

function PlayerDetail({ player }: { player: Player }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <span className="text-4xl font-bold text-primary">{player.overall}</span>
          <div
            className={cn(
              "text-sm px-3 py-1 rounded font-medium text-white mt-1",
              POSITION_COLORS[player.position]
            )}
          >
            {player.position}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold">{player.name}</h2>
          <p className="text-muted">
            {player.nationality} · {player.age} years
          </p>
          <p className="text-subtle text-sm">
            Potential: {player.potential} · Wage: €{player.wage.toLocaleString()}/w
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <StatBar label="Pace" value={player.pace} />
        <StatBar label="Shooting" value={player.shooting} />
        <StatBar label="Passing" value={player.passing} />
        <StatBar label="Dribbling" value={player.dribbling} />
        <StatBar label="Defending" value={player.defending} />
        <StatBar label="Physical" value={player.physicality} />
        <StatBar label="Composure" value={player.composure} />
        <StatBar label="Position" value={player.positioning} />
      </div>

      <div className="flex gap-4 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-xs text-muted">Morale</div>
          <div
            className={cn(
              "text-lg font-bold",
              player.morale >= 70
                ? "text-green-400"
                : player.morale >= 50
                ? "text-yellow-400"
                : "text-red-400"
            )}
          >
            {player.morale}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted">Form</div>
          <div
            className={cn(
              "text-lg font-bold",
              player.form >= 70
                ? "text-green-400"
                : player.form >= 50
                ? "text-yellow-400"
                : "text-red-400"
            )}
          >
            {player.form}
          </div>
        </div>
        {player.injuredUntil && new Date(player.injuredUntil) > new Date() && (
          <div className="text-center">
            <div className="text-xs text-muted">Injured Until</div>
            <div className="text-lg font-bold text-red-400">
              {new Date(player.injuredUntil).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SquadPage() {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [posFilter, setPosFilter] = useState<string | null>(null);

  const { data: players, isLoading } = useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: () => fetch("/api/players").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-panel rounded w-32" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-panel rounded-xl" />
        ))}
      </div>
    );
  }

  const filtered = posFilter
    ? players?.filter((p) => p.position === posFilter)
    : players;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Squad</h1>
        <span className="text-muted text-sm">{players?.length} players</span>
      </div>

      {/* Position filter */}
      <div className="flex gap-2">
        {[null, "GK", "DEF", "MID", "FWD"].map((pos) => (
          <button
            key={pos ?? "all"}
            onClick={() => setPosFilter(pos)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              posFilter === pos
                ? "bg-primary text-white"
                : "bg-panel text-muted hover:text-foreground"
            )}
          >
            {pos ?? "All"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {filtered?.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => setSelectedPlayer(player)}
            />
          ))}
        </div>

        {selectedPlayer && (
          <div className="lg:sticky lg:top-6 h-fit">
            <PlayerDetail player={selectedPlayer} />
          </div>
        )}
      </div>
    </div>
  );
}
