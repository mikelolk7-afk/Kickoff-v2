"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipForward,
  ChevronLeft,
  Radio,
  Star,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────

interface MatchEvent {
  id: string;
  minute: number;
  type: string;
  team: string;
  playerId: string | null;
  assistId?: string | null;
  assistName?: string | null;
  detail: string | null;
  xPos: number | null;
  yPos: number | null;
}

interface PlayerRating {
  playerId: string;
  playerName: string;
  team: "home" | "away";
  position: string;
  rating: number;
  goals: number;
  assists: number;
  shotsOnTarget: number;
  shotsOff: number;
  tackles: number;
  fouls: number;
  saves: number;
  minutesPlayed: number;
  substitutedOff?: number;
  substitutedOn?: number;
}

interface MatchData {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  homePoss: number | null;
  awayPoss: number | null;
  homeShots: number | null;
  awayShots: number | null;
  homeShotsOnTarget: number | null;
  awayShotsOnTarget: number | null;
  homeFouls: number | null;
  awayFouls: number | null;
  homeCorners: number | null;
  awayCorners: number | null;
  homeYellows: number | null;
  awayYellows: number | null;
  homeReds: number | null;
  awayReds: number | null;
  extraTime: boolean;
  penalties: boolean;
  homePenScore: number | null;
  awayPenScore: number | null;
  status: string;
  homeClub: { id: string; name: string; kitHome: string };
  awayClub: { id: string; name: string; kitHome: string };
  events: MatchEvent[];
  playerRatings: Record<string, PlayerRating> | null;
  heatMapData: Record<
    string,
    Array<{ minute: number; x: number; y: number }>
  > | null;
}

// ─── Constants ───────────────────────────────────────────────

const EVENT_ICONS: Record<string, string> = {
  GOAL: "⚽",
  SHOT_ON: "🎯",
  SHOT_OFF: "💨",
  SAVE: "🧤",
  TACKLE: "💪",
  FOUL: "⚠️",
  YELLOW_CARD: "🟨",
  RED_CARD: "🟥",
  SECOND_YELLOW: "🟨🟥",
  KICKOFF: "🏁",
  HALFTIME: "⏸",
  FULLTIME: "🏁",
  SUBSTITUTION: "🔄",
  CORNER: "📐",
  FREE_KICK: "🎯",
  PENALTY_GOAL: "⚽",
  PENALTY_MISS: "❌",
  EXTRA_TIME_START: "⏱️",
  PENALTY_SHOOTOUT_START: "🥅",
};

// ─── Pitch Viewer ────────────────────────────────────────────

function PitchViewer({
  events,
  currentMinute,
  heatMapData,
  selectedPlayerId,
}: {
  events: MatchEvent[];
  currentMinute: number;
  heatMapData: Record<
    string,
    Array<{ minute: number; x: number; y: number }>
  > | null;
  selectedPlayerId: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Draw pitch
    ctx.fillStyle = "#1a472a";
    ctx.fillRect(0, 0, w, h);

    // Pitch outline
    ctx.strokeStyle = "#2d6b3f";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Center line
    ctx.beginPath();
    ctx.moveTo(w / 2, 20);
    ctx.lineTo(w / 2, h - 20);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Penalty boxes
    ctx.strokeRect(20, h / 2 - 60, 80, 120);
    ctx.strokeRect(w - 100, h / 2 - 60, 80, 120);

    // Goal boxes
    ctx.strokeRect(20, h / 2 - 30, 35, 60);
    ctx.strokeRect(w - 55, h / 2 - 30, 35, 60);

    // Draw heat map if a player is selected
    if (selectedPlayerId && heatMapData?.[selectedPlayerId]) {
      const positions = heatMapData[selectedPlayerId].filter(
        (p) => p.minute <= currentMinute
      );
      if (positions.length > 0) {
        // Create heat map gradient
        for (const pos of positions) {
          const x = 20 + (pos.x / 100) * (w - 40);
          const y = 20 + (pos.y / 100) * (h - 40);
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
          gradient.addColorStop(0, "rgba(255, 100, 0, 0.3)");
          gradient.addColorStop(0.5, "rgba(255, 200, 0, 0.15)");
          gradient.addColorStop(1, "rgba(255, 200, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, 25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw events at current minute
    const currentEvents = events.filter(
      (e) => e.minute <= currentMinute && e.xPos != null && e.yPos != null
    );
    const recentEvents = currentEvents.slice(-8);
    recentEvents.forEach((event, i) => {
      const x = 20 + ((event.xPos ?? 50) / 100) * (w - 40);
      const y = 20 + ((event.yPos ?? 50) / 100) * (h - 40);
      const alpha = 0.3 + (i / recentEvents.length) * 0.7;

      ctx.beginPath();
      const radius =
        event.type === "GOAL" || event.type === "PENALTY_GOAL" ? 8 : 5;
      ctx.arc(x, y, radius, 0, Math.PI * 2);

      if (event.type === "GOAL" || event.type === "PENALTY_GOAL") {
        ctx.fillStyle = `rgba(240, 192, 64, ${alpha})`;
      } else if (event.type === "CORNER") {
        ctx.fillStyle = `rgba(100, 200, 100, ${alpha})`;
      } else if (event.type === "FREE_KICK") {
        ctx.fillStyle = `rgba(200, 200, 100, ${alpha})`;
      } else if (event.type === "RED_CARD" || event.type === "SECOND_YELLOW") {
        ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      } else {
        ctx.fillStyle =
          event.team === "home"
            ? `rgba(58, 123, 213, ${alpha})`
            : `rgba(213, 58, 58, ${alpha})`;
      }
      ctx.fill();

      if (event.type === "GOAL" || event.type === "PENALTY_GOAL") {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [events, currentMinute, heatMapData, selectedPlayerId]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="w-full max-w-[600px] rounded-lg border border-gray-800"
    />
  );
}

// ─── Player Ratings Panel ────────────────────────────────────

function PlayerRatingsPanel({
  ratings,
  homeClubName,
  awayClubName,
  onPlayerSelect,
  selectedPlayerId,
}: {
  ratings: Record<string, PlayerRating>;
  homeClubName: string;
  awayClubName: string;
  onPlayerSelect: (id: string | null) => void;
  selectedPlayerId: string | null;
}) {
  const allRatings = Object.values(ratings);
  const homeRatings = allRatings
    .filter((r) => r.team === "home")
    .sort((a, b) => b.rating - a.rating);
  const awayRatings = allRatings
    .filter((r) => r.team === "away")
    .sort((a, b) => b.rating - a.rating);

  function ratingColor(rating: number): string {
    if (rating >= 8.0) return "text-green-400";
    if (rating >= 7.0) return "text-lime-400";
    if (rating >= 6.0) return "text-yellow-400";
    if (rating >= 5.0) return "text-orange-400";
    return "text-red-400";
  }

  function RatingRow({ r }: { r: PlayerRating }) {
    const isSelected = selectedPlayerId === r.playerId;
    return (
      <button
        onClick={() => onPlayerSelect(isSelected ? null : r.playerId)}
        className={cn(
          "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm hover:bg-white/5 transition-colors",
          isSelected && "bg-white/10 ring-1 ring-primary"
        )}
      >
        <span className="text-xs text-gray-500 w-8">{r.position}</span>
        <span className="flex-1 text-gray-300 truncate">
          {r.playerName}
          {r.substitutedOn !== undefined && (
            <span className="text-gray-600 text-xs ml-1">
              ↑{r.substitutedOn}&apos;
            </span>
          )}
          {r.substitutedOff !== undefined && (
            <span className="text-gray-600 text-xs ml-1">
              ↓{r.substitutedOff}&apos;
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          {r.goals > 0 && <span>⚽{r.goals}</span>}
          {r.assists > 0 && <span>🅰️{r.assists}</span>}
        </span>
        <span
          className={cn(
            "font-bold text-sm w-8 text-right",
            ratingColor(r.rating)
          )}
        >
          {r.rating.toFixed(1)}
        </span>
      </button>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Star size={16} className="text-accent" />
        <h3 className="text-sm font-medium text-gray-400">Player Ratings</h3>
      </div>
      <p className="text-xs text-gray-600 mb-2">
        Click a player to view their heat map
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-home mb-1">{homeClubName}</p>
          <div className="space-y-0.5">
            {homeRatings.map((r) => (
              <RatingRow key={r.playerId} r={r} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-away mb-1">{awayClubName}</p>
          <div className="space-y-0.5">
            {awayRatings.map((r) => (
              <RatingRow key={r.playerId} r={r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Row ───────────────────────────────────────────────

function StatRow({
  home,
  label,
  away,
}: {
  home: number | null;
  label: string;
  away: number | null;
}) {
  return (
    <>
      <div className="text-center text-home font-medium">{home ?? 0}</div>
      <div className="text-center text-gray-400">{label}</div>
      <div className="text-center text-away font-medium">{away ?? 0}</div>
    </>
  );
}

// ─── Live Match Hook ─────────────────────────────────────────

function useLiveMatch(matchId: string, isLive: boolean) {
  const [liveEvents, setLiveEvents] = useState<MatchEvent[]>([]);
  const [liveMinute, setLiveMinute] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isLive) return;

    const es = new EventSource(`/api/match/${matchId}/live`);
    setConnected(true);

    es.addEventListener("match-event", (e) => {
      const event = JSON.parse(e.data) as MatchEvent;
      setLiveEvents((prev) => [...prev, { ...event, id: `live-${prev.length}` }]);
      setLiveMinute(event.minute);
    });

    es.addEventListener("done", () => {
      es.close();
      setConnected(false);
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [matchId, isLive]);

  return { liveEvents, liveMinute, connected };
}

// ─── Main Page ───────────────────────────────────────────────

export default function MatchPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: match, isLoading } = useQuery<MatchData>({
    queryKey: ["match", id],
    queryFn: () => fetch(`/api/match/${id}`).then((r) => r.json()),
    refetchInterval: (query) =>
      query.state.data?.status === "LIVE" ? 10000 : false,
  });

  const isLive = match?.status === "LIVE";
  const { liveEvents, liveMinute, connected } = useLiveMatch(id, isLive);

  const [currentMinute, setCurrentMinute] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "ratings">("events");
  const eventFeedRef = useRef<HTMLDivElement>(null);

  const maxMinute = match?.extraTime
    ? match?.penalties
      ? 121
      : 120
    : 90;

  useEffect(() => {
    if (!playing || !match) return;

    const interval = setInterval(() => {
      setCurrentMinute((prev) => {
        if (prev >= maxMinute) {
          setPlaying(false);
          return maxMinute;
        }
        return prev + 1;
      });
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [playing, speed, match, maxMinute]);

  // Auto-scroll event feed
  useEffect(() => {
    if (eventFeedRef.current) {
      eventFeedRef.current.scrollTop = eventFeedRef.current.scrollHeight;
    }
  }, [currentMinute, liveMinute]);

  const handlePlayerSelect = useCallback(
    (playerId: string | null) => {
      setSelectedPlayerId(playerId);
    },
    []
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-panel rounded w-48" />
        <div className="h-96 bg-panel rounded-xl" />
      </div>
    );
  }

  if (!match) {
    return <p className="text-gray-400">Match not found</p>;
  }

  const displayEvents = isLive ? liveEvents : match.events;
  const displayMinute = isLive ? liveMinute : currentMinute;
  const visibleEvents = displayEvents.filter(
    (e) => e.minute <= displayMinute
  );
  const isCompleted = match.status === "COMPLETED";

  return (
    <div className="space-y-4">
      <Link
        href="/league"
        className="flex items-center gap-1 text-gray-400 hover:text-gray-200 text-sm"
      >
        <ChevronLeft size={16} />
        Back to League
      </Link>

      {/* Scoreboard */}
      <div className="card">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-2"
              style={{ backgroundColor: match.homeClub.kitHome }}
            />
            <p className="font-medium">{match.homeClub.name}</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent">
              {isCompleted || isLive
                ? `${match.homeScore ?? 0} – ${match.awayScore ?? 0}`
                : "vs"}
            </div>
            {isLive && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <Radio size={12} className="text-red-500 animate-pulse" />
                <p className="text-xs text-red-400 font-medium">
                  LIVE {liveMinute}&apos;
                </p>
              </div>
            )}
            {isCompleted && (
              <p className="text-xs text-gray-500 mt-1">
                Full Time
                {match.extraTime && !match.penalties && " (AET)"}
                {match.penalties &&
                  ` (${match.homePenScore}–${match.awayPenScore} pens)`}
              </p>
            )}
          </div>
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-2"
              style={{ backgroundColor: match.awayClub.kitHome }}
            />
            <p className="font-medium">{match.awayClub.name}</p>
          </div>
        </div>
      </div>

      {(isCompleted || isLive) && (
        <>
          {/* Match Stats */}
          <div className="card">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <StatRow
                home={match.homePoss}
                label="Possession %"
                away={match.awayPoss}
              />
              <StatRow
                home={match.homeShots}
                label="Shots"
                away={match.awayShots}
              />
              <StatRow
                home={match.homeShotsOnTarget}
                label="On Target"
                away={match.awayShotsOnTarget}
              />
              <StatRow
                home={match.homeCorners}
                label="Corners"
                away={match.awayCorners}
              />
              <StatRow
                home={match.homeFouls}
                label="Fouls"
                away={match.awayFouls}
              />
              <StatRow
                home={match.homeYellows}
                label="Yellows"
                away={match.awayYellows}
              />
              <StatRow
                home={match.homeReds}
                label="Reds"
                away={match.awayReds}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pitch viewer */}
            <div className="card">
              <PitchViewer
                events={displayEvents}
                currentMinute={displayMinute}
                heatMapData={match.heatMapData}
                selectedPlayerId={selectedPlayerId}
              />

              {/* Playback controls (replay mode only, not live) */}
              {!isLive && (
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="btn-primary p-2"
                  >
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    onClick={() => {
                      setCurrentMinute(maxMinute);
                      setPlaying(false);
                    }}
                    className="btn-secondary p-2"
                  >
                    <SkipForward size={18} />
                  </button>

                  {/* Speed controls */}
                  <div className="flex gap-1 ml-2">
                    {[1, 2, 4].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          speed === s
                            ? "bg-primary text-white"
                            : "bg-bg text-gray-400"
                        )}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  {/* Minute slider */}
                  <input
                    type="range"
                    min={0}
                    max={maxMinute}
                    value={currentMinute}
                    onChange={(e) => {
                      setCurrentMinute(Number(e.target.value));
                      setPlaying(false);
                    }}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-sm font-mono text-gray-400 w-12 text-right">
                    {currentMinute}&apos;
                  </span>
                </div>
              )}

              {/* Live indicator */}
              {isLive && connected && (
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                  <Radio size={14} className="text-red-500 animate-pulse" />
                  Streaming live — minute {liveMinute}&apos;
                </div>
              )}
            </div>

            {/* Tabbed panel: Events / Ratings */}
            <div className="card">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveTab("events")}
                  className={cn(
                    "px-3 py-1 rounded text-sm font-medium transition-colors",
                    activeTab === "events"
                      ? "bg-primary text-white"
                      : "bg-bg text-gray-400 hover:text-gray-200"
                  )}
                >
                  Events
                </button>
                {match.playerRatings && (
                  <button
                    onClick={() => setActiveTab("ratings")}
                    className={cn(
                      "px-3 py-1 rounded text-sm font-medium transition-colors",
                      activeTab === "ratings"
                        ? "bg-primary text-white"
                        : "bg-bg text-gray-400 hover:text-gray-200"
                    )}
                  >
                    Ratings
                  </button>
                )}
              </div>

              {activeTab === "events" && (
                <div
                  ref={eventFeedRef}
                  className="space-y-1 max-h-[420px] overflow-y-auto pr-2"
                >
                  {visibleEvents.map((event, idx) => (
                    <div
                      key={event.id ?? `evt-${idx}`}
                      className={cn(
                        "flex items-start gap-2 py-1.5 px-2 rounded text-sm",
                        (event.type === "GOAL" ||
                          event.type === "PENALTY_GOAL") &&
                          "bg-accent/10 border border-accent/20",
                        event.type === "RED_CARD" &&
                          "bg-red-500/10 border border-red-500/20",
                        event.type === "SECOND_YELLOW" &&
                          "bg-red-500/10 border border-red-500/20",
                        event.type === "SUBSTITUTION" &&
                          "bg-blue-500/5 border border-blue-500/10"
                      )}
                    >
                      <span className="text-gray-500 font-mono w-8 flex-shrink-0">
                        {event.minute}&apos;
                      </span>
                      <span className="w-5 flex-shrink-0">
                        {EVENT_ICONS[event.type] ?? "•"}
                      </span>
                      <span
                        className={cn(
                          event.type === "GOAL" || event.type === "PENALTY_GOAL"
                            ? "text-accent font-medium"
                            : event.type === "RED_CARD" ||
                              event.type === "SECOND_YELLOW"
                            ? "text-red-400 font-medium"
                            : "text-gray-300"
                        )}
                      >
                        {event.detail}
                      </span>
                    </div>
                  ))}
                  {visibleEvents.length === 0 && !isLive && (
                    <p className="text-gray-500 text-sm">
                      Press play to start the replay
                    </p>
                  )}
                  {visibleEvents.length === 0 && isLive && (
                    <p className="text-gray-500 text-sm">
                      Waiting for match to begin...
                    </p>
                  )}
                </div>
              )}

              {activeTab === "ratings" && match.playerRatings && (
                <div className="max-h-[420px] overflow-y-auto pr-2">
                  <PlayerRatingsPanel
                    ratings={match.playerRatings}
                    homeClubName={match.homeClub.name}
                    awayClubName={match.awayClub.name}
                    onPlayerSelect={handlePlayerSelect}
                    selectedPlayerId={selectedPlayerId}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Player ratings panel below on wider screens */}
          {match.playerRatings && activeTab !== "ratings" && (
            <PlayerRatingsPanel
              ratings={match.playerRatings}
              homeClubName={match.homeClub.name}
              awayClubName={match.awayClub.name}
              onPlayerSelect={handlePlayerSelect}
              selectedPlayerId={selectedPlayerId}
            />
          )}
        </>
      )}

      {!isCompleted && !isLive && (
        <div className="card text-center py-12">
          <p className="text-gray-400">
            This match hasn&apos;t been played yet. Check back after match day.
          </p>
        </div>
      )}
    </div>
  );
}
