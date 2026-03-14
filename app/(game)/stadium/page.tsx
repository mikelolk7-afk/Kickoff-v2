"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Building, Clock, Wrench } from "lucide-react";

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
