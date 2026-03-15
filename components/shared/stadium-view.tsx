"use client";

import { useRef, useEffect } from "react";
import type { StadiumLevel } from "@/lib/stadium-levels";

interface StadiumViewProps {
  level: StadiumLevel;
  width?: number;
  height?: number;
}

/**
 * Canvas-based stadium visualization.
 * Renders a bird's-eye / 3D-ish view that scales with the stadium level.
 */
export default function StadiumView({
  level,
  width = 640,
  height = 420,
}: StadiumViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = width;
    const h = height;

    // Clear
    ctx.fillStyle = "#0d0d0f";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Pitch dimensions (central area)
    const pitchW = w * 0.42;
    const pitchH = h * 0.48;
    const pitchX = cx - pitchW / 2;
    const pitchY = cy - pitchH / 2;

    // Stand thickness scales with tiers
    const standThickness = 30 + level.tiers * 18;

    // ─── Draw outer stadium shell ────────────────────────────
    const outerX = pitchX - standThickness - 8;
    const outerY = pitchY - standThickness - 8;
    const outerW = pitchW + (standThickness + 8) * 2;
    const outerH = pitchH + (standThickness + 8) * 2;

    // Stadium exterior wall
    ctx.fillStyle = level.standColor;
    ctx.strokeStyle = "#ffffff10";
    ctx.lineWidth = 1;
    roundRect(ctx, outerX, outerY, outerW, outerH, 20);
    ctx.fill();
    ctx.stroke();

    // ─── Draw roof (if applicable) ───────────────────────────
    if (level.roof >= 2) {
      // Full roof — darkened overlay on stands
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      roundRect(ctx, outerX + 4, outerY + 4, outerW - 8, outerH - 8, 16);
      ctx.fill();
    }

    if (level.roof === 3) {
      // Retractable roof — subtle lines across
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const y = outerY + 10 + (i * (outerH - 20)) / 7;
        ctx.beginPath();
        ctx.moveTo(outerX + 20, y);
        ctx.lineTo(outerX + outerW - 20, y);
        ctx.stroke();
      }
    }

    // ─── Draw stands (4 sides) ───────────────────────────────
    const standGap = 4;

    // Top stand (North)
    drawStand(ctx, pitchX - standGap, pitchY - standThickness - standGap,
      pitchW + standGap * 2, standThickness, level, "north");

    // Bottom stand (South)
    drawStand(ctx, pitchX - standGap, pitchY + pitchH + standGap,
      pitchW + standGap * 2, standThickness, level, "south");

    // Left stand (West)
    drawStand(ctx, pitchX - standThickness - standGap, pitchY - standGap,
      standThickness, pitchH + standGap * 2, level, "west");

    // Right stand (East)
    drawStand(ctx, pitchX + pitchW + standGap, pitchY - standGap,
      standThickness, pitchH + standGap * 2, level, "east");

    // ─── Corner sections ─────────────────────────────────────
    if (level.level >= 5) {
      const cornerSize = standThickness * 0.7;
      const corners = [
        [pitchX - cornerSize - standGap, pitchY - cornerSize - standGap],
        [pitchX + pitchW + standGap, pitchY - cornerSize - standGap],
        [pitchX - cornerSize - standGap, pitchY + pitchH + standGap],
        [pitchX + pitchW + standGap, pitchY + pitchH + standGap],
      ];

      for (const [cx2, cy2] of corners) {
        ctx.fillStyle = level.seatColor + "80";
        ctx.fillRect(cx2, cy2, cornerSize, cornerSize);
      }
    }

    // ─── Draw corner screens ─────────────────────────────────
    if (level.screens) {
      ctx.fillStyle = "#1a1a2e";
      ctx.strokeStyle = "#4040ff40";
      ctx.lineWidth = 1;
      const screenSize = 12;
      const screenPositions = [
        [pitchX - 14, pitchY - 14],
        [pitchX + pitchW + 2, pitchY - 14],
        [pitchX - 14, pitchY + pitchH + 2],
        [pitchX + pitchW + 2, pitchY + pitchH + 2],
      ];
      for (const [sx, sy] of screenPositions) {
        ctx.fillRect(sx, sy, screenSize, screenSize);
        ctx.strokeRect(sx, sy, screenSize, screenSize);
        // Screen glow
        ctx.fillStyle = "#4060ff20";
        ctx.fillRect(sx + 2, sy + 2, screenSize - 4, screenSize - 4);
        ctx.fillStyle = "#1a1a2e";
      }
    }

    // ─── Draw pitch ──────────────────────────────────────────
    ctx.fillStyle = level.pitchColor;
    ctx.fillRect(pitchX, pitchY, pitchW, pitchH);

    // Pitch stripes (mowing pattern)
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let i = 0; i < pitchW; i += 24) {
      if (Math.floor(i / 24) % 2 === 0) {
        ctx.fillRect(pitchX + i, pitchY, 12, pitchH);
      }
    }

    // Pitch markings
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;

    // Outline
    ctx.strokeRect(pitchX + 4, pitchY + 4, pitchW - 8, pitchH - 8);

    // Center line
    ctx.beginPath();
    ctx.moveTo(pitchX + 4, cy);
    ctx.lineTo(pitchX + pitchW - 4, cy);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, pitchH * 0.12, 0, Math.PI * 2);
    ctx.stroke();

    // Center spot
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Penalty boxes
    const penW = pitchW * 0.36;
    const penH = pitchH * 0.14;
    ctx.strokeRect(cx - penW / 2, pitchY + 4, penW, penH);
    ctx.strokeRect(cx - penW / 2, pitchY + pitchH - penH - 4, penW, penH);

    // Goal boxes
    const goalW = pitchW * 0.18;
    const goalH = pitchH * 0.06;
    ctx.strokeRect(cx - goalW / 2, pitchY + 4, goalW, goalH);
    ctx.strokeRect(cx - goalW / 2, pitchY + pitchH - goalH - 4, goalW, goalH);

    // ─── Draw floodlights ────────────────────────────────────
    if (level.floodlights > 0) {
      const positions =
        level.floodlights === 2
          ? [
              [outerX - 8, outerY - 8],
              [outerX + outerW + 8, outerY - 8],
            ]
          : [
              [outerX - 8, outerY - 8],
              [outerX + outerW + 8, outerY - 8],
              [outerX - 8, outerY + outerH + 8],
              [outerX + outerW + 8, outerY + outerH + 8],
            ];

      for (const [fx, fy] of positions) {
        // Tower
        ctx.fillStyle = "#888";
        ctx.fillRect(fx - 2, fy, 4, 16);
        // Light array
        ctx.fillStyle = "#ffe06640";
        ctx.beginPath();
        ctx.arc(fx, fy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffe066";
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ─── Draw scoreboard ─────────────────────────────────────
    if (level.scoreboard) {
      const sbW = 50;
      const sbH = 14;
      const sbX = cx - sbW / 2;
      const sbY = outerY - 20;
      ctx.fillStyle = "#111";
      ctx.fillRect(sbX, sbY, sbW, sbH);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(sbX, sbY, sbW, sbH);
      // LED dots
      ctx.fillStyle = "#f0c040";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("0 - 0", cx, sbY + 10);
    }

    // ─── VIP Badge ───────────────────────────────────────────
    if (level.vip) {
      ctx.fillStyle = "#f0c04030";
      const vipH = 8;
      // VIP strip along the west stand inner edge
      ctx.fillRect(pitchX - standGap - 10, pitchY + pitchH * 0.3,
        8, pitchH * 0.4);
      ctx.fillStyle = "#f0c040";
      ctx.font = "6px sans-serif";
      ctx.textAlign = "center";
      ctx.save();
      ctx.translate(pitchX - standGap - 6, cy);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("VIP", 0, 0);
      ctx.restore();
    }

    // ─── Stadium name label ──────────────────────────────────
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(level.name, cx, h - 16);

    ctx.fillStyle = "#888";
    ctx.font = "11px sans-serif";
    ctx.fillText(
      `Level ${level.level} · ${(level.capacity / 1000).toFixed(0)}k capacity`,
      cx,
      h - 2
    );
  }, [level, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full max-w-[640px] rounded-lg border border-border"
    />
  );
}

/** Draw a single stand section with tier lines and crowd dots. */
function drawStand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  level: StadiumLevel,
  _side: string
) {
  // Stand base
  ctx.fillStyle = level.seatColor + "60";
  ctx.fillRect(x, y, w, h);

  // Tier divider lines
  const isHorizontal = w > h;
  const tierCount = level.tiers;

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;

  if (isHorizontal) {
    for (let t = 1; t < tierCount; t++) {
      const ty = y + (h * t) / tierCount;
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + w, ty);
      ctx.stroke();
    }
  } else {
    for (let t = 1; t < tierCount; t++) {
      const tx = x + (w * t) / tierCount;
      ctx.beginPath();
      ctx.moveTo(tx, y);
      ctx.lineTo(tx, y + h);
      ctx.stroke();
    }
  }

  // Crowd dots
  const dotSpacing = 6;
  const dotRadius = 1.5;

  for (let dx = dotSpacing; dx < w - dotSpacing; dx += dotSpacing) {
    for (let dy = dotSpacing; dy < h - dotSpacing; dy += dotSpacing) {
      if (Math.random() < level.crowdFill) {
        // Random crowd colors
        const colors = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a8e6cf", "#ff8a80", "#82b1ff", "#ffffff"];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] + "60";
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Partial roof shadow on the pitch side
  if (level.roof >= 1) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    if (isHorizontal) {
      // Top or bottom stand
      const roofDepth = 6;
      const roofY = y + h > (y + h / 2 + 100) ? y : y + h - roofDepth;
      ctx.fillRect(x, roofY, w, roofDepth);
    } else {
      const roofDepth = 6;
      const roofX = x + w > (x + w / 2 + 100) ? x : x + w - roofDepth;
      ctx.fillRect(roofX, y, roofDepth, h);
    }
  }
}

/** Helper: rounded rectangle path. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
