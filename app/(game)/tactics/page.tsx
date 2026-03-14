"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Save, RotateCcw, Users } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  position: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physicality: number;
  morale: number;
  form: number;
  injuredUntil: string | null;
}

interface Tactic {
  id: string;
  formation: string;
  mentality: number;
  pressingLevel: number;
  positions: Record<string, string>; // slotKey -> playerId
}

// ─── Formation Definitions ───────────────────────────────────

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

/**
 * Each formation slot: position type + x/y on the pitch (0-100 percentage).
 * Y: 0 = bottom (GK), 100 = top (FWD attacking end).
 */
interface FormationSlot {
  key: string;
  label: string;
  posType: string; // GK, DEF, MID, FWD
  x: number;
  y: number;
}

function getFormationSlots(formation: string): FormationSlot[] {
  const slots: FormationSlot[] = [
    { key: "gk", label: "GK", posType: "GK", x: 50, y: 5 },
  ];

  const lines = formation.split("-").map(Number);
  // Positions map: line 0 = DEF, last = FWD, middle = MID
  const posTypes = lines.map((_, i) => {
    if (i === 0) return "DEF";
    if (i === lines.length - 1) return "FWD";
    return "MID";
  });

  // Y positions for each line
  const lineCount = lines.length;
  const yStart = 18;
  const yEnd = 88;
  const yStep = (yEnd - yStart) / (lineCount - 1);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const count = lines[lineIdx];
    const yPos = yStart + lineIdx * yStep;
    const posType = posTypes[lineIdx];

    for (let i = 0; i < count; i++) {
      const xSpacing = 80 / (count + 1);
      const xPos = 10 + xSpacing * (i + 1);
      const slotNum = slots.length;
      slots.push({
        key: `${posType.toLowerCase()}_${lineIdx}_${i}`,
        label: `${posType}`,
        posType,
        x: xPos,
        y: yPos,
      });
    }
  }

  return slots;
}

// ─── Mentality & Pressing Labels ─────────────────────────────

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

// ─── Position Badge Color ────────────────────────────────────

function posColor(pos: string): string {
  switch (pos) {
    case "GK": return "bg-yellow-600";
    case "DEF": return "bg-blue-600";
    case "MID": return "bg-green-600";
    case "FWD": return "bg-red-600";
    default: return "bg-gray-600";
  }
}

// ─── Pitch Component with Lineup ─────────────────────────────

function LineupPitch({
  formation,
  assignments,
  players,
  selectedSlot,
  onSlotClick,
}: {
  formation: string;
  assignments: Record<string, string>;
  players: Player[];
  selectedSlot: string | null;
  onSlotClick: (slotKey: string) => void;
}) {
  const slots = useMemo(() => getFormationSlots(formation), [formation]);
  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  return (
    <div className="relative w-full aspect-[2/3] bg-green-900/30 rounded-xl border border-green-800/40 overflow-hidden">
      {/* Pitch markings */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-green-700/30" />
      </div>
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-32 h-16 border border-green-700/30 rounded-sm" />
      <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-32 h-16 border border-green-700/30 rounded-sm" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-green-700/30 rounded-full" />

      {/* Player slots */}
      {slots.map((slot) => {
        const assignedPlayerId = assignments[slot.key];
        const player = assignedPlayerId ? playerMap.get(assignedPlayerId) : undefined;
        const isSelected = selectedSlot === slot.key;
        const isEmpty = !player;
        const isWrongPos = player && player.position !== slot.posType;

        return (
          <button
            key={slot.key}
            onClick={() => onSlotClick(slot.key)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{
              left: `${slot.x}%`,
              // Invert Y since CSS top=0 is top of screen but our y=0 is bottom
              bottom: `${slot.y}%`,
            }}
          >
            {/* Circle */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                isSelected
                  ? "ring-2 ring-accent scale-110"
                  : isEmpty
                  ? "border-dashed border-gray-500 bg-gray-800/50"
                  : isWrongPos
                  ? "border-orange-400 " + posColor(slot.posType)
                  : "border-white/30 " + posColor(slot.posType)
              )}
            >
              {player ? (
                <span className="text-white text-[10px] leading-tight text-center truncate px-0.5">
                  {player.overall}
                </span>
              ) : (
                <span className="text-gray-500">+</span>
              )}
            </div>
            {/* Name label */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 whitespace-nowrap">
              <span className={cn(
                "text-[9px] font-medium px-1 py-0.5 rounded",
                player ? "text-white bg-black/50" : "text-gray-600"
              )}>
                {player ? player.name.split(" ").pop() : slot.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Player Picker Panel ─────────────────────────────────────

function PlayerPicker({
  players,
  assignedIds,
  slotPosType,
  onSelect,
  onClose,
}: {
  players: Player[];
  assignedIds: Set<string>;
  slotPosType: string;
  onSelect: (playerId: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = players
    .filter((p) => !p.injuredUntil)
    .filter((p) => filter === "all" || p.position === filter)
    .sort((a, b) => {
      // Prioritize matching position, then by overall
      const aMatch = a.position === slotPosType ? 1 : 0;
      const bMatch = b.position === slotPosType ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.overall - a.overall;
    });

  return (
    <div className="card border-accent/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-accent">
          Select Player ({slotPosType} slot)
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">
          Cancel
        </button>
      </div>

      {/* Position filter */}
      <div className="flex gap-1 mb-3">
        {["all", "GK", "DEF", "MID", "FWD"].map((pos) => (
          <button
            key={pos}
            onClick={() => setFilter(pos)}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              filter === pos ? "bg-primary text-white" : "bg-bg text-gray-400"
            )}
          >
            {pos === "all" ? "All" : pos}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
        {filtered.map((player) => {
          const isAssigned = assignedIds.has(player.id);
          return (
            <button
              key={player.id}
              onClick={() => !isAssigned && onSelect(player.id)}
              disabled={isAssigned}
              className={cn(
                "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
                isAssigned
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-white/5"
              )}
            >
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                posColor(player.position)
              )}>
                {player.position.charAt(0)}
              </span>
              <span className="flex-1 truncate">
                {player.name}
                {player.position !== slotPosType && (
                  <span className="text-orange-400 text-xs ml-1">(out of position)</span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                F:{player.form} M:{player.morale}
              </span>
              <span className="font-bold text-primary w-6 text-right">{player.overall}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function TacticsPage() {
  const queryClient = useQueryClient();

  const { data: tactic, isLoading: loadingTactic } = useQuery<Tactic>({
    queryKey: ["tactics"],
    queryFn: () => fetch("/api/tactics").then((r) => r.json()),
  });

  const { data: players, isLoading: loadingPlayers } = useQuery<Player[]>({
    queryKey: ["squad-players"],
    queryFn: () => fetch("/api/players").then((r) => r.json()),
  });

  const [formation, setFormation] = useState("4-4-2");
  const [mentality, setMentality] = useState(3);
  const [pressingLevel, setPressingLevel] = useState(3);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load from server
  useEffect(() => {
    if (tactic) {
      setFormation(tactic.formation);
      setMentality(tactic.mentality);
      setPressingLevel(tactic.pressingLevel);
      if (tactic.positions && typeof tactic.positions === "object") {
        setAssignments(tactic.positions as Record<string, string>);
      }
    }
  }, [tactic]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tactics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation,
          mentality,
          pressingLevel,
          positions: assignments,
        }),
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

  const slots = useMemo(() => getFormationSlots(formation), [formation]);
  const assignedPlayerIds = useMemo(
    () => new Set(Object.values(assignments)),
    [assignments]
  );

  // Count filled positions
  const filledCount = Object.keys(assignments).length;
  const totalSlots = slots.length; // 11

  // Auto-fill handler
  function autoFill() {
    if (!players) return;

    const available = players.filter((p) => !p.injuredUntil);
    const used = new Set<string>();
    const newAssignments: Record<string, string> = {};

    for (const slot of slots) {
      // Best available player for this position type
      const best = available
        .filter((p) => !used.has(p.id))
        .sort((a, b) => {
          const aMatch = a.position === slot.posType ? 100 : 0;
          const bMatch = b.position === slot.posType ? 100 : 0;
          return (b.overall + bMatch) - (a.overall + aMatch);
        })[0];

      if (best) {
        newAssignments[slot.key] = best.id;
        used.add(best.id);
      }
    }

    setAssignments(newAssignments);
  }

  function handleSlotClick(slotKey: string) {
    if (selectedSlot === slotKey) {
      // Deselect / remove player
      setSelectedSlot(null);
    } else if (assignments[slotKey]) {
      // If clicking an assigned slot, select it to allow reassignment or removal
      setSelectedSlot(slotKey);
    } else {
      // Empty slot — open picker
      setSelectedSlot(slotKey);
    }
  }

  function handlePlayerSelect(playerId: string) {
    if (!selectedSlot) return;
    // Remove this player from any other slot
    const newAssignments = { ...assignments };
    for (const [key, pid] of Object.entries(newAssignments)) {
      if (pid === playerId) delete newAssignments[key];
    }
    newAssignments[selectedSlot] = playerId;
    setAssignments(newAssignments);
    setSelectedSlot(null);
  }

  function handleRemoveFromSlot() {
    if (!selectedSlot) return;
    const newAssignments = { ...assignments };
    delete newAssignments[selectedSlot];
    setAssignments(newAssignments);
    setSelectedSlot(null);
  }

  // When formation changes, clear assignments that don't map to new slots
  function handleFormationChange(newFormation: string) {
    const newSlots = getFormationSlots(newFormation);
    const newSlotKeys = new Set(newSlots.map((s) => s.key));
    const cleaned: Record<string, string> = {};
    for (const [key, val] of Object.entries(assignments)) {
      if (newSlotKeys.has(key)) cleaned[key] = val;
    }
    setAssignments(cleaned);
    setFormation(newFormation);
    setSelectedSlot(null);
  }

  const isLoading = loadingTactic || loadingPlayers;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-panel rounded w-32" />
        <div className="h-96 bg-panel rounded-xl" />
      </div>
    );
  }

  const selectedSlotInfo = selectedSlot
    ? slots.find((s) => s.key === selectedSlot)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tactics & Lineup</h1>
          <p className="text-sm text-gray-400">
            {filledCount}/{totalSlots} positions filled
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={autoFill}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Users size={14} />
            Auto-fill
          </button>
          <button
            onClick={() => {
              setAssignments({});
              setSelectedSlot(null);
            }}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RotateCcw size={14} />
            Clear
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={cn(
              "btn-primary flex items-center gap-1.5",
              saved && "bg-green-600 hover:bg-green-600"
            )}
          >
            <Save size={14} />
            {saved ? "Saved!" : mutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pitch view with lineup — takes 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-400">Starting XI</h2>
              {selectedSlot && assignments[selectedSlot] && (
                <button
                  onClick={handleRemoveFromSlot}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove player from slot
                </button>
              )}
            </div>
            <LineupPitch
              formation={formation}
              assignments={assignments}
              players={players ?? []}
              selectedSlot={selectedSlot}
              onSlotClick={handleSlotClick}
            />
          </div>

          {/* Player picker when slot selected */}
          {selectedSlot && selectedSlotInfo && (
            <PlayerPicker
              players={players ?? []}
              assignedIds={assignedPlayerIds}
              slotPosType={selectedSlotInfo.posType}
              onSelect={handlePlayerSelect}
              onClose={() => setSelectedSlot(null)}
            />
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Formation */}
          <div className="card">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Formation</h2>
            <div className="grid grid-cols-2 gap-2">
              {FORMATIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => handleFormationChange(f)}
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

          {/* Lineup summary */}
          <div className="card">
            <h2 className="text-sm font-medium text-gray-400 mb-2">Lineup Summary</h2>
            <div className="space-y-1">
              {slots.map((slot) => {
                const player = assignments[slot.key]
                  ? (players ?? []).find((p) => p.id === assignments[slot.key])
                  : undefined;
                return (
                  <div
                    key={slot.key}
                    className={cn(
                      "flex items-center gap-2 text-sm px-2 py-1 rounded cursor-pointer hover:bg-white/5",
                      selectedSlot === slot.key && "bg-accent/10 border border-accent/20"
                    )}
                    onClick={() => handleSlotClick(slot.key)}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white",
                      posColor(slot.posType)
                    )}>
                      {slot.posType.charAt(0)}
                    </span>
                    {player ? (
                      <>
                        <span className="flex-1 truncate">{player.name}</span>
                        <span className="text-primary font-bold text-xs">{player.overall}</span>
                      </>
                    ) : (
                      <span className="flex-1 text-gray-600 italic">Empty</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
