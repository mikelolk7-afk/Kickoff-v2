"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Building, Clock, Wrench, ChevronLeft, ChevronRight, Zap, ArrowUp, Sun, Moon } from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { getStadiumLevel, STADIUM_LEVELS } from "@/lib/stadium-levels";

const Stadium3D = dynamic(() => import("@/components/shared/stadium-3d"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[16/10] max-w-[720px] rounded-xl border border-border bg-bg flex items-center justify-center">
      <p className="text-subtle text-sm">Loading 3D stadium...</p>
    </div>
  ),
});

interface StadiumData {
  club: {
    stadiumCapacity: number;
    stadiumLevel: number;
    trainingLevel: number;
    medicalLevel: number;
    academyLevel: number;
    analyticsLevel: number;
    budget: number;
  };
  stadiumUpgrade: {
    id: string;
    toLevel: number;
    completesAt: string;
  } | null;
  facilityUpgrades: Array<{
    id: string;
    facility: string;
    toLevel: number;
    completesAt: string;
  }>;
  upgradeCost: number | null;
  instantBuildCost: number | null;
  facilities: Record<string, { hoursPerLevel: number; baseCost: number; maxLevel: number; clubField: string }>;
}

export default function StadiumPage() {
  const queryClient = useQueryClient();
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [stadiumTheme, setStadiumTheme] = useState<"dark" | "light">("dark");

  const { data, isLoading } = useQuery<StadiumData>({
    queryKey: ["stadium"],
    queryFn: () => fetch("/api/stadium").then((r) => r.json()),
  });

  const action = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await fetch("/api/stadium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stadium"] }),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-panel rounded w-32" />
        <div className="h-64 bg-panel rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const currentLevel = getStadiumLevel(data.club.stadiumCapacity);
  const displayLevel = previewLevel !== null
    ? STADIUM_LEVELS[previewLevel - 1]
    : currentLevel;
  const nextLevel = currentLevel.level < 20
    ? STADIUM_LEVELS[currentLevel.level]
    : null;
  const isMaxed = currentLevel.level >= 20;
  const isUpgrading = !!data.stadiumUpgrade;

  const facilityLevels: Record<string, number> = {
    training: data.club.trainingLevel,
    medical: data.club.medicalLevel,
    academy: data.club.academyLevel,
    analytics: data.club.analyticsLevel,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stadium & Facilities</h1>
        <p className="text-muted text-sm">
          Capacity: {data.club.stadiumCapacity.toLocaleString()} · Budget: €{data.club.budget.toLocaleString()}
        </p>
      </div>

      {/* Stadium 3D Visualization */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-accent">{displayLevel.name}</h2>
            <p className="text-sm text-muted">{displayLevel.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStadiumTheme(stadiumTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
              title={stadiumTheme === "dark" ? "Switch to day view" : "Switch to night view"}
            >
              {stadiumTheme === "dark" ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-blue-300" />}
            </button>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">Lvl {displayLevel.level}</p>
              <p className="text-xs text-subtle">{displayLevel.capacity.toLocaleString()} seats</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Stadium3D level={displayLevel} theme={stadiumTheme} />
        </div>

        {/* Level browser */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPreviewLevel(Math.max(1, (previewLevel ?? currentLevel.level) - 1))}
            disabled={(previewLevel ?? currentLevel.level) <= 1}
            className="p-1 text-muted hover:text-white disabled:opacity-20"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-1 flex-wrap justify-center">
            {STADIUM_LEVELS.map((sl) => (
              <button
                key={sl.level}
                onClick={() => setPreviewLevel(sl.level === currentLevel.level ? null : sl.level)}
                className={cn(
                  "w-6 h-6 rounded text-xs font-bold transition-all",
                  sl.level === currentLevel.level
                    ? "bg-primary text-white ring-2 ring-primary/50"
                    : sl.level === previewLevel
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : sl.level <= currentLevel.level
                    ? "bg-primary/20 text-primary"
                    : "bg-surface text-subtle"
                )}
              >
                {sl.level}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPreviewLevel(Math.min(20, (previewLevel ?? currentLevel.level) + 1))}
            disabled={(previewLevel ?? currentLevel.level) >= 20}
            className="p-1 text-muted hover:text-white disabled:opacity-20"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {previewLevel !== null && previewLevel !== currentLevel.level && (
          <p className="text-center text-xs text-subtle mt-2">
            Previewing Level {previewLevel} — your stadium is Level {currentLevel.level}
          </p>
        )}
      </div>

      {/* Stadium Upgrade Card */}
      <div className="card">
        <h2 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
          <Building size={14} /> Stadium Upgrade
        </h2>

        {isUpgrading && data.stadiumUpgrade ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Upgrading to Level {data.stadiumUpgrade.toLevel}
              </p>
              <div className="flex items-center gap-2 text-xs text-subtle">
                <Clock size={12} />
                {Math.max(
                  0,
                  Math.ceil(
                    (new Date(data.stadiumUpgrade.completesAt).getTime() - Date.now()) / 3600000
                  )
                )}h remaining
              </div>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all animate-pulse"
                style={{
                  width: `${Math.max(
                    5,
                    100 -
                      ((new Date(data.stadiumUpgrade.completesAt).getTime() - Date.now()) /
                        (24 * 3600000)) *
                        100
                  )}%`,
                }}
              />
            </div>
            <button
              onClick={() =>
                action.mutate({ action: "speedup", upgradeId: data.stadiumUpgrade!.id })
              }
              disabled={action.isPending}
              className="btn-accent text-xs w-full flex items-center justify-center gap-1"
            >
              <Zap size={12} /> Complete Now (Credits)
            </button>
          </div>
        ) : isMaxed ? (
          <div className="text-center py-4">
            <p className="text-accent font-bold text-lg">Max Level Reached</p>
            <p className="text-xs text-subtle">
              {currentLevel.name} — {currentLevel.capacity.toLocaleString()} seats
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nextLevel && (
              <div className="flex items-center justify-between p-3 bg-bg rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    Level {currentLevel.level} → {nextLevel.level}
                  </p>
                  <p className="text-xs text-subtle">
                    {currentLevel.name} → {nextLevel.name}
                  </p>
                  <p className="text-xs text-subtle">
                    {currentLevel.capacity.toLocaleString()} → {nextLevel.capacity.toLocaleString()} seats
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {/* Normal upgrade — 24h */}
              <button
                onClick={() => action.mutate({ action: "upgrade" })}
                disabled={
                  action.isPending ||
                  !data.upgradeCost ||
                  data.club.budget < data.upgradeCost
                }
                className="btn-primary text-xs flex flex-col items-center gap-1 py-3 disabled:opacity-40"
              >
                <ArrowUp size={14} />
                <span>Upgrade (24h)</span>
                <span className="text-[10px] opacity-70">
                  €{data.upgradeCost ? (data.upgradeCost / 1000).toFixed(0) + "k" : "—"}
                </span>
              </button>

              {/* Instant build */}
              <button
                onClick={() => action.mutate({ action: "instant" })}
                disabled={
                  action.isPending ||
                  !data.upgradeCost ||
                  data.club.budget < data.upgradeCost
                }
                className="btn-accent text-xs flex flex-col items-center gap-1 py-3 disabled:opacity-40"
              >
                <Zap size={14} />
                <span>Instant Build</span>
                <span className="text-[10px] opacity-70">
                  €{data.upgradeCost ? (data.upgradeCost / 1000).toFixed(0) + "k" : "—"} +{" "}
                  {data.instantBuildCost ?? "—"} credits
                </span>
              </button>
            </div>

            {action.isError && (
              <p className="text-xs text-red-400 text-center">{action.error.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Active Facility Upgrades */}
      {data.facilityUpgrades.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted flex items-center gap-2">
            <Clock size={14} /> In Progress
          </h2>
          {data.facilityUpgrades.map((u) => {
            const hours = Math.max(0, Math.ceil((new Date(u.completesAt).getTime() - Date.now()) / 3600000));
            return (
              <div key={u.id} className="card flex items-center gap-3">
                <Wrench size={16} className="text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{u.facility} → Level {u.toLevel}</p>
                  <p className="text-xs text-subtle">{hours}h remaining</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Facilities */}
      <div>
        <h2 className="text-sm font-medium text-muted mb-2">Facilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(data.facilities).map(([facility, config]) => {
            const level = facilityLevels[facility] ?? 0;
            const isFacilityMaxed = level >= config.maxLevel;
            const cost = config.baseCost * (level + 1);
            const isFacilityUpgrading = data.facilityUpgrades.some((u) => u.facility === facility);

            return (
              <div key={facility} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize">{facility}</h3>
                  <span className="text-sm text-muted">Level {level}/{config.maxLevel}</span>
                </div>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: config.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-2 flex-1 rounded",
                        i < level ? "bg-accent" : "bg-surface"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-subtle mb-2">{config.hoursPerLevel}h build time</p>
                <button
                  onClick={() => action.mutate({ action: "facility", facility })}
                  disabled={isFacilityMaxed || isFacilityUpgrading || data.club.budget < cost}
                  className="btn-primary text-xs w-full disabled:opacity-40"
                >
                  {isFacilityMaxed
                    ? "Max Level"
                    : isFacilityUpgrading
                    ? "Upgrading..."
                    : `Upgrade — €${(cost / 1000).toFixed(0)}k`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
