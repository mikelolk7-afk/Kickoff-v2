"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  position: string;
  overall: number;
  potential: number;
  age: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physicality: number;
}

interface TrainingFocus {
  id: string;
  name: string;
  attributes: string[];
}

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const { data: players } = useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: () => fetch("/api/players").then((r) => r.json()),
  });

  const { data: training } = useQuery<{ focuses: TrainingFocus[] }>({
    queryKey: ["training"],
    queryFn: () => fetch("/api/training").then((r) => r.json()),
  });

  const setFocus = useMutation({
    mutationFn: async (focus: string) => {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selectedPlayer, focus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["training"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Training</h1>
        <p className="text-muted text-sm">
          Set individual focus for each player. Development applies every Monday.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player List */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted">Select Player</h2>
          {players?.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlayer(p.id)}
              className={cn(
                "card w-full text-left flex items-center gap-3 transition-colors",
                selectedPlayer === p.id
                  ? "border-primary"
                  : "hover:border-border"
              )}
            >
              <span className="text-lg font-bold text-primary w-8">{p.overall}</span>
              <span className="text-xs bg-surface px-1.5 py-0.5 rounded">{p.position}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-subtle">
                  Age {p.age} · Potential {p.potential}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-xs",
                  p.potential - p.overall > 10 ? "text-green-400" : "text-subtle"
                )}>
                  +{p.potential - p.overall} growth
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Training Focus */}
        <div className="lg:sticky lg:top-6 h-fit">
          {selectedPlayer ? (
            <div className="card space-y-4">
              <h2 className="text-sm font-medium text-muted">Training Focus</h2>
              <div className="space-y-2">
                {training?.focuses?.map((focus) => (
                  <button
                    key={focus.id}
                    onClick={() => setFocus.mutate(focus.id)}
                    className="card w-full text-left hover:border-primary/50 transition-colors"
                  >
                    <p className="font-medium text-sm">{focus.name}</p>
                    <p className="text-xs text-subtle">
                      Boosts: {focus.attributes.join(", ")}
                    </p>
                  </button>
                ))}
              </div>
              {setFocus.isSuccess && (
                <p className="text-green-400 text-sm">Training focus set!</p>
              )}
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-subtle">Select a player to set training focus</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
