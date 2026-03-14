"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Play, Pause, SkipForward, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface MatchEvent {
  id: string;
  minute: number;
  type: string;
  team: string;
  playerId: string | null;
  detail: string | null;
  xPos: number | null;
  yPos: number | null;
}

interface MatchData {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  homePoss: number | null;
  awayPoss: number | null;
  homeShots: number | null;
  awayShots: number | null;
  status: string;
  homeClub: { id: string; name: string; kitHome: string };
  awayClub: { id: string; name: string; kitHome: string };
  events: MatchEvent[];
}

const EVENT_ICONS: Record<string, string> = {
  GOAL: "⚽",
  SHOT_ON: "🎯",
  SHOT_OFF: "💨",
  SAVE: "🧤",
  TACKLE: "💪",
  FOUL: "⚠️",
  YELLOW_CARD: "🟨",
  RED_CARD: "🟥",
  KICKOFF: "🏁",
  HALFTIME: "⏸",
  FULLTIME: "🏁",
};

function PitchViewer({
  events,
  currentMinute,
}: {
  events: MatchEvent[];
  currentMinute: number;
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

    // Draw events at current minute
    const currentEvents = events.filter(
      (e) => e.minute <= currentMinute && e.xPos != null && e.yPos != null
    );

    // Show last few events as fading dots
    const recentEvents = currentEvents.slice(-8);
    recentEvents.forEach((event, i) => {
      const x = 20 + ((event.xPos ?? 50) / 100) * (w - 40);
      const y = 20 + ((event.yPos ?? 50) / 100) * (h - 40);
      const alpha = 0.3 + (i / recentEvents.length) * 0.7;

      ctx.beginPath();
      ctx.arc(x, y, event.type === "GOAL" ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle =
        event.type === "GOAL"
          ? `rgba(240, 192, 64, ${alpha})`
          : event.team === "home"
          ? `rgba(58, 123, 213, ${alpha})`
          : `rgba(213, 58, 58, ${alpha})`;
      ctx.fill();

      if (event.type === "GOAL") {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [events, currentMinute]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="w-full max-w-[600px] rounded-lg border border-gray-800"
    />
  );
}

export default function MatchPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: match, isLoading } = useQuery<MatchData>({
    queryKey: ["match", id],
    queryFn: () => fetch(`/api/match/${id}`).then((r) => r.json()),
  });

  const [currentMinute, setCurrentMinute] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const eventFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing || !match) return;

    const interval = setInterval(() => {
      setCurrentMinute((prev) => {
        if (prev >= 90) {
          setPlaying(false);
          return 90;
        }
        return prev + 1;
      });
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [playing, speed, match]);

  // Auto-scroll event feed
  useEffect(() => {
    if (eventFeedRef.current) {
      eventFeedRef.current.scrollTop = eventFeedRef.current.scrollHeight;
    }
  }, [currentMinute]);

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

  const visibleEvents = match.events.filter((e) => e.minute <= currentMinute);
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
              {isCompleted ? `${match.homeScore} – ${match.awayScore}` : "vs"}
            </div>
            {isCompleted && (
              <p className="text-xs text-gray-500 mt-1">Full Time</p>
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

      {isCompleted && (
        <>
          {/* Match Stats */}
          <div className="card">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center text-home font-medium">
                {match.homePoss}%
              </div>
              <div className="text-center text-gray-400">Possession</div>
              <div className="text-center text-away font-medium">
                {match.awayPoss}%
              </div>
              <div className="text-center text-home font-medium">
                {match.homeShots}
              </div>
              <div className="text-center text-gray-400">Shots</div>
              <div className="text-center text-away font-medium">
                {match.awayShots}
              </div>
              <div className="text-center text-home font-medium">
                {match.events.filter((e) => e.type === "GOAL" && e.team === "home").length}
              </div>
              <div className="text-center text-gray-400">Goals</div>
              <div className="text-center text-away font-medium">
                {match.events.filter((e) => e.type === "GOAL" && e.team === "away").length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pitch viewer */}
            <div className="card">
              <PitchViewer events={match.events} currentMinute={currentMinute} />

              {/* Playback controls */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setPlaying(!playing)}
                  className="btn-primary p-2"
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  onClick={() => {
                    setCurrentMinute(90);
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
                  max={90}
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
            </div>

            {/* Event feed */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Match Events
              </h3>
              <div
                ref={eventFeedRef}
                className="space-y-1 max-h-[420px] overflow-y-auto pr-2"
              >
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-2 py-1.5 px-2 rounded text-sm",
                      event.type === "GOAL" &&
                        "bg-accent/10 border border-accent/20"
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
                        event.type === "GOAL"
                          ? "text-accent font-medium"
                          : "text-gray-300"
                      )}
                    >
                      {event.detail}
                    </span>
                  </div>
                ))}
                {visibleEvents.length === 0 && (
                  <p className="text-gray-500 text-sm">
                    Press play to start the replay
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {!isCompleted && (
        <div className="card text-center py-12">
          <p className="text-gray-400">
            This match hasn&apos;t been played yet. Check back after match day.
          </p>
        </div>
      )}
    </div>
  );
}
