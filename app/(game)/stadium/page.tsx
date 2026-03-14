"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Building, Clock, Wrench, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import StadiumView from "@/components/shared/stadium-view";
import { getStadiumLevel, STADIUM_LEVELS } from "@/lib/stadium-levels";

interface StadiumData {
  club: {
    stadiumCapacity: number;
    trainingLevel: number;
    medicalLevel: number;
    academyLevel: number;
    analyticsLevel: number;
    budget: number;
  };
  standLevels: Record<string, number>;
  stadiumUpgrades: Array<{
    id: string;
    stand: string;
    toLevel: number;
    completesAt: string;
  }>;
  facilityUpgrades: Array<{
    id: string;
    facility: string;
    toLevel: number;
    completesAt: string;
  }>;
  stands: Record<string, { capacityPerLevel: number; hoursPerLevel: number; baseCost: number }>;
  facilities: Record<string, { hoursPerLevel: number; baseCost: number; maxLevel: number; clubField: string }>;
}

export default function StadiumPage() {
  const queryClient = useQueryClient();
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);

  const { data, isLoading } = useQuery<StadiumData>({
    queryKey: ["stadium"],
    queryFn: () => fetch("/api/stadium").then((r) => r.json()),
  });

  const upgrade = useMutation({
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
        <p className="text-gray-400 text-sm">
          Capacity: {data.club.stadiumCapacity.toLocaleString()} · Budget: €{data.club.budget.toLocaleString()}
        </p>
      </div>

      {/* Stadium Visualization */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-accent">{displayLevel.name}</h2>
            <p className="text-sm text-gray-400">{displayLevel.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">Lvl {displayLevel.level}</p>
            <p className="text-xs text-gray-500">{displayLevel.capacity.toLocaleString()} seats</p>
          </div>
        </div>

        <div className="flex justify-center">
          <StadiumView level={displayLevel} />
        </div>

        {/* Level browser */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPreviewLevel(Math.max(1, (previewLevel ?? currentLevel.level) - 1))}
            disabled={(previewLevel ?? currentLevel.level) <= 1}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-20"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-1">
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
                    : "bg-gray-800 text-gray-600"
                )}
              >
                {sl.level}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPreviewLevel(Math.min(20, (previewLevel ?? currentLevel.level) + 1))}
            disabled={(previewLevel ?? currentLevel.level) >= 20}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-20"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {previewLevel !== null && previewLevel !== currentLevel.level && (
          <p className="text-center text-xs text-gray-500 mt-2">
            Previewing Level {previewLevel} — your stadium is Level {currentLevel.level}
          </p>
        )}

        {/* Progress to next level */}
        {nextLevel && (
          <div className="mt-4 p-3 bg-bg rounded-lg">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-400">Next: {nextLevel.name}</span>
              <span className="text-accent font-medium">{nextLevel.capacity.toLocaleString()} seats</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((data.club.stadiumCapacity - currentLevel.capacity) / (nextLevel.capacity - currentLevel.capacity)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(nextLevel.capacity - data.club.stadiumCapacity).toLocaleString()} more seats needed
            </p>
          </div>
        )}
      </div>

      {/* Active Upgrades */}
      {(data.stadiumUpgrades.length > 0 || data.facilityUpgrades.length > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Clock size={14} /> In Progress
          </h2>
          {data.stadiumUpgrades.map((u) => {
            const hours = Math.max(0, Math.ceil((new Date(u.completesAt).getTime() - Date.now()) / 3600000));
            return (
              <div key={u.id} className="card flex items-center gap-3">
                <Building size={16} className="text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{u.stand} Stand → Level {u.toLevel}</p>
                  <p className="text-xs text-gray-500">{hours}h remaining</p>
                </div>
              </div>
            );
          })}
          {data.facilityUpgrades.map((u) => {
            const hours = Math.max(0, Math.ceil((new Date(u.completesAt).getTime() - Date.now()) / 3600000));
            return (
              <div key={u.id} className="card flex items-center gap-3">
                <Wrench size={16} className="text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{u.facility} → Level {u.toLevel}</p>
                  <p className="text-xs text-gray-500">{hours}h remaining</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stands */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-2">Stadium Stands</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(data.stands).map(([stand, config]) => {
            const level = data.standLevels[stand] ?? 0;
            const isMaxed = level >= 5;
            const cost = config.baseCost * (level + 1);
            const isUpgrading = data.stadiumUpgrades.some((u) => u.stand === stand);

            return (
              <div key={stand} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize">{stand} Stand</h3>
                  <span className="text-sm text-gray-400">Level {level}/5</span>
                </div>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-2 flex-1 rounded",
                        i < level ? "bg-primary" : "bg-gray-800"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  +{config.capacityPerLevel} capacity/level · {config.hoursPerLevel}h build time
                </p>
                <button
                  onClick={() => upgrade.mutate({ stand })}
                  disabled={isMaxed || isUpgrading || data.club.budget < cost}
                  className="btn-primary text-xs w-full disabled:opacity-40"
                >
                  {isMaxed ? "Max Level" : isUpgrading ? "Upgrading..." : `Upgrade — €${(cost / 1000).toFixed(0)}k`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Facilities */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-2">Facilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(data.facilities).map(([facility, config]) => {
            const level = facilityLevels[facility] ?? 0;
            const isMaxed = level >= config.maxLevel;
            const cost = config.baseCost * (level + 1);
            const isUpgrading = data.facilityUpgrades.some((u) => u.facility === facility);

            return (
              <div key={facility} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize">{facility}</h3>
                  <span className="text-sm text-gray-400">Level {level}/{config.maxLevel}</span>
                </div>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: config.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-2 flex-1 rounded",
                        i < level ? "bg-accent" : "bg-gray-800"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-2">{config.hoursPerLevel}h build time</p>
                <button
                  onClick={() => upgrade.mutate({ type: "facility", facility })}
                  disabled={isMaxed || isUpgrading || data.club.budget < cost}
                  className="btn-primary text-xs w-full disabled:opacity-40"
                >
                  {isMaxed ? "Max Level" : isUpgrading ? "Upgrading..." : `Upgrade — €${(cost / 1000).toFixed(0)}k`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
