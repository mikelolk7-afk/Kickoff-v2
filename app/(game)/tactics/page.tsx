"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const FORMATIONS = [
  "4-4-2",
  "4-3-3",
  "4-2-3-1",
  "3-5-2",
  "4-5-1",
  "3-4-3",
  "5-3-2",
  "4-1-4-1",
];

const MENTALITY_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: "Defensive", desc: "Sit deep, stay compact" },
  2: { label: "Cautious", desc: "Solid defensive shape" },
  3: { label: "Balanced", desc: "Equal attack and defence" },
  4: { label: "Progressive", desc: "Push forward more" },
  5: { label: "Attacking", desc: "All-out attack" },
};

const PRESSING_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: "Drop Deep", desc: "Minimal pressing, hold position" },
  2: { label: "Low Block", desc: "Press in own half only" },
  3: { label: "Medium", desc: "Press in middle third" },
  4: { label: "High Press", desc: "Press in opponent half" },
  5: { label: "Gegenpress", desc: "Immediate counter-press" },
};

interface Tactic {
  id: string;
  formation: string;
  mentality: number;
  pressingLevel: number;
}

/** Visual formation on a pitch */
function FormationPitch({ formation }: { formation: string }) {
  const lines = formation.split("-").map(Number);
  // Always have GK line
  const allLines = [1, ...lines];

  return (
    <div className="relative w-full aspect-[2/3] bg-green-900/30 rounded-xl border border-green-800/40 overflow-hidden">
      {/* Pitch markings */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-green-700/30" />
      </div>
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-32 h-16 border border-green-700/30 rounded-sm" />
      <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-32 h-16 border border-green-700/30 rounded-sm" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-green-700/30 rounded-full" />

      {/* Players */}
      <div className="absolute inset-0 flex flex-col justify-between py-6">
        {allLines.map((count, lineIdx) => (
          <div key={lineIdx} className="flex justify-center gap-4">
            {Array.from({ length: count }).map((_, playerIdx) => (
              <div
                key={playerIdx}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white/20",
                  lineIdx === 0
                    ? "bg-yellow-600"
                    : lineIdx <= Math.ceil(allLines.length * 0.4)
                    ? "bg-blue-600"
                    : lineIdx <= Math.ceil(allLines.length * 0.7)
                    ? "bg-green-600"
                    : "bg-red-600"
                )}
              >
                {lineIdx === 0 ? "GK" : ""}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TacticsPage() {
  const queryClient = useQueryClient();

  const { data: tactic, isLoading } = useQuery<Tactic>({
    queryKey: ["tactics"],
    queryFn: () => fetch("/api/tactics").then((r) => r.json()),
  });

  const [formation, setFormation] = useState("4-4-2");
  const [mentality, setMentality] = useState(3);
  const [pressingLevel, setPressingLevel] = useState(3);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tactic) {
      setFormation(tactic.formation);
      setMentality(tactic.mentality);
      setPressingLevel(tactic.pressingLevel);
    }
  }, [tactic]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tactics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formation, mentality, pressingLevel }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tactics"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-panel rounded w-32" />
        <div className="h-96 bg-panel rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tactics</h1>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={cn(
            "btn-primary",
            saved && "bg-green-600 hover:bg-green-600"
          )}
        >
          {saved ? "Saved!" : mutation.isPending ? "Saving..." : "Save Tactics"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pitch view */}
        <div className="card">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Formation Preview</h2>
          <FormationPitch formation={formation} />
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Formation */}
          <div className="card">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Formation</h2>
            <div className="grid grid-cols-4 gap-2">
              {FORMATIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormation(f)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    formation === f
                      ? "bg-primary text-white"
                      : "bg-bg text-gray-400 hover:text-gray-200"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Mentality */}
          <div className="card">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Mentality</h2>
            <input
              type="range"
              min={1}
              max={5}
              value={mentality}
              onChange={(e) => setMentality(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between mt-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  mentality <= 2
                    ? "text-blue-400"
                    : mentality === 3
                    ? "text-gray-300"
                    : "text-red-400"
                )}
              >
                {MENTALITY_LABELS[mentality].label}
              </span>
              <span className="text-xs text-gray-500">
                {MENTALITY_LABELS[mentality].desc}
              </span>
            </div>
          </div>

          {/* Pressing */}
          <div className="card">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Pressing</h2>
            <input
              type="range"
              min={1}
              max={5}
              value={pressingLevel}
              onChange={(e) => setPressingLevel(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between mt-2">
              <span className="text-sm font-medium text-gray-300">
                {PRESSING_LABELS[pressingLevel].label}
              </span>
              <span className="text-xs text-gray-500">
                {PRESSING_LABELS[pressingLevel].desc}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
