"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Clock, Star } from "lucide-react";

const REGIONS = ["Europe", "South America", "Africa", "Asia", "North America", "Oceania"];

interface Scout {
  id: string;
  name: string;
  stars: number;
  wage: number;
}

interface ScoutedPlayer {
  name: string;
  nationality: string;
  age: number;
  position: string;
  reportedOverall: number;
  isHiddenGem: boolean;
  estimatedValue: number;
}

interface Assignment {
  id: string;
  region: string;
  duration: number;
  status: string;
  startedAt: string;
  completesAt: string;
  scout: Scout;
  report: { id: string; players: ScoutedPlayer[] } | null;
}

export default function ScoutingPage() {
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState("Europe");

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["scouting"],
    queryFn: () => fetch("/api/scouting/assignments").then((r) => r.json()),
  });

  const { data: clubData } = useQuery({
    queryKey: ["club"],
    queryFn: () => fetch("/api/club").then((r) => r.json()),
  });

  const sendScout = useMutation({
    mutationFn: async (scoutId: string) => {
      const res = await fetch("/api/scouting/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoutId, region: selectedRegion }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scouting"] }),
  });

  const signPlayer = useMutation({
    mutationFn: async ({ reportId, playerIndex }: { reportId: string; playerIndex: number }) => {
      const res = await fetch("/api/scouting/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, playerIndex, offerWage: 3000 }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scouting"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });

  const scouts = (clubData?.staff?.filter((s: { role: string }) => s.role === "scout") ?? []) as Scout[];
  const activeAssignments = assignments?.filter((a) => a.status === "IN_PROGRESS") ?? [];
  const completedReports = assignments?.filter((a) => a.status === "COMPLETED" && a.report) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scouting</h1>

      {/* Send Scout */}
      <div className="card space-y-3">
        <h2 className="text-sm font-medium text-gray-400">Send Scout</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                selectedRegion === r ? "bg-primary text-white" : "bg-bg text-gray-400"
              )}
            >
              <MapPin size={12} />
              {r}
            </button>
          ))}
        </div>

        {scouts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {scouts.map((scout) => {
              const isBusy = activeAssignments.some((a) => a.scout.id === scout.id);
              return (
                <button
                  key={scout.id}
                  onClick={() => !isBusy && sendScout.mutate(scout.id)}
                  disabled={isBusy}
                  className={cn(
                    "card flex items-center gap-3 text-left",
                    isBusy ? "opacity-50" : "hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-1 text-accent">
                    {Array.from({ length: scout.stars }).map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" />
                    ))}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{scout.name}</p>
                    <p className="text-xs text-gray-500">
                      {isBusy ? "On assignment" : "Available"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No scouts available. Hire scouts from the staff section.</p>
        )}
      </div>

      {/* Active Assignments */}
      {activeAssignments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-400">Active Assignments</h2>
          {activeAssignments.map((a) => {
            const remaining = Math.max(0, new Date(a.completesAt).getTime() - Date.now());
            const hoursLeft = Math.ceil(remaining / (1000 * 60 * 60));
            return (
              <div key={a.id} className="card flex items-center gap-3">
                <Clock size={16} className="text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {a.scout.name} scouting {a.region}
                  </p>
                  <p className="text-xs text-gray-500">{hoursLeft}h remaining</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reports */}
      {completedReports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400">Scout Reports</h2>
          {completedReports.map((a) => (
            <div key={a.id} className="card space-y-2">
              <p className="text-sm font-medium">
                Report from {a.region} by {a.scout.name}
              </p>
              <div className="space-y-1">
                {(a.report?.players ?? []).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-bg rounded-lg p-2">
                    <span className="text-lg font-bold text-primary w-8">{p.reportedOverall}</span>
                    <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{p.position}</span>
                    <div className="flex-1">
                      <p className="text-sm">
                        {p.name}
                        {p.isHiddenGem && <span className="text-accent ml-1">★ Hidden Gem</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.nationality} · {p.age}y · ~€{(p.estimatedValue / 1000).toFixed(0)}k
                      </p>
                    </div>
                    <button
                      onClick={() => a.report && signPlayer.mutate({ reportId: a.report.id, playerIndex: i })}
                      className="btn-primary text-xs py-1 px-2"
                    >
                      Sign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
