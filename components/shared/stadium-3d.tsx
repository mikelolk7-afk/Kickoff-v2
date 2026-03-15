"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { StadiumLevel } from "@/lib/stadium-levels";

interface Stadium3DProps {
  level: StadiumLevel;
  theme?: "dark" | "light";
}

const ACCENT = "#f0c040";

/* ─── Theme palettes ───────────────────────────────────────────── */

const THEMES = {
  dark: {
    ground: "#1a2a1a",
    groundEdge: "#0e1e0e",
    platform: "#2a3a2a",
    path: "#3a3a3a",
    pathEdge: "#4a4a4a",
    sky: "#0a0a14",
    ambient: 1.6,
    hemiSky: "#889abb",
    hemiGround: "#223322",
    hemiIntensity: 1.2,
    dirIntensity: 2.5,
    dirColor: "#ffffff",
    treeTrunk: "#6b4226",
    treeLeaf: "#3a8a30",
    treeLeafLight: "#55b040",
    bg: "#0d0d12",
    concrete: "#505860",
    concreteLight: "#6a7080",
    roofColor: "#5a6a7a",
    roofLight: "#7a8a9a",
    parking: "#2a2a30",
    parkLine: "#4a4a50",
  },
  light: {
    ground: "#66bb6a",
    groundEdge: "#4caf50",
    platform: "#81c784",
    path: "#bdbdbd",
    pathEdge: "#9e9e9e",
    sky: "#87ceeb",
    ambient: 2.2,
    hemiSky: "#e0e8ff",
    hemiGround: "#88cc88",
    hemiIntensity: 1.8,
    dirIntensity: 3.5,
    dirColor: "#fff8e0",
    treeTrunk: "#8b5e3c",
    treeLeaf: "#4caf50",
    treeLeafLight: "#66cc55",
    bg: "#c8e6c9",
    concrete: "#78909c",
    concreteLight: "#90a4ae",
    roofColor: "#eceff1",
    roofLight: "#ffffff",
    parking: "#78909c",
    parkLine: "#b0bec5",
  },
};

/* ─── Helpers ──────────────────────────────────────────────────── */

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (n & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ─── Low-poly Tree ────────────────────────────────────────────── */

function Tree({
  position,
  scale = 1,
  theme,
}: {
  position: [number, number, number];
  scale?: number;
  theme: typeof THEMES.dark;
}) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.4, 6]} />
        <meshStandardMaterial color={theme.treeTrunk} flatShading />
      </mesh>
      {/* Bottom foliage cone */}
      <mesh position={[0, 0.55, 0]}>
        <coneGeometry args={[0.25, 0.45, 6]} />
        <meshStandardMaterial color={theme.treeLeaf} flatShading />
      </mesh>
      {/* Middle foliage cone */}
      <mesh position={[0, 0.8, 0]}>
        <coneGeometry args={[0.2, 0.4, 6]} />
        <meshStandardMaterial color={theme.treeLeafLight} flatShading />
      </mesh>
      {/* Top foliage cone */}
      <mesh position={[0, 1.0, 0]}>
        <coneGeometry args={[0.14, 0.3, 6]} />
        <meshStandardMaterial color={theme.treeLeaf} flatShading />
      </mesh>
    </group>
  );
}

/* ─── Pitch with markings ──────────────────────────────────────── */

function Pitch({ pitchColor, w, h }: { pitchColor: string; w: number; h: number }) {
  const stripeCount = 12;
  const stripeW = w / stripeCount;
  const light = lighten(pitchColor, 0.07);

  return (
    <group>
      {/* Pitch stripes */}
      {Array.from({ length: stripeCount }).map((_, i) => (
        <mesh
          key={`stripe-${i}`}
          position={[-w / 2 + (i + 0.5) * stripeW, 0.002, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[stripeW, h]} />
          <meshStandardMaterial color={i % 2 === 0 ? pitchColor : light} flatShading />
        </mesh>
      ))}

      {/* Centre circle */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.50, 0.54, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Centre spot */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Half-way line */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, h * 0.98]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Touchlines */}
      {[-1, 1].map((s) => (
        <mesh key={`touch-${s}`} position={[0, 0.006, s * (h / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, 0.04]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Goal lines */}
      {[-1, 1].map((s) => (
        <mesh key={`gline-${s}`} position={[s * (w / 2), 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.04, h]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Penalty boxes */}
      {[-1, 1].map((s) => {
        const bw = 1.2;
        const bh = 2.4;
        const cx = s * (w / 2 - bw / 2);
        return (
          <group key={`pbox-${s}`}>
            {[-1, 1].map((t) => (
              <mesh key={`pb-${s}-${t}`} position={[cx, 0.006, t * (bh / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[bw, 0.04]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            ))}
            <mesh position={[cx + s * (-bw / 2), 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.04, bh]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Penalty spot */}
            <mesh position={[s * (w / 2 - 0.75), 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.04, 10]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Goal area (6-yard box) */}
            {[-1, 1].map((t) => (
              <mesh key={`ga-${s}-${t}`} position={[s * (w / 2 - 0.3), 0.006, t * 0.75]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.6, 0.04]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            ))}
            <mesh position={[s * (w / 2 - 0.6), 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.04, 1.5]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        );
      })}

      {/* Goal posts */}
      {[-1, 1].map((s) => (
        <GoalPost key={`goal-${s}`} side={s} pitchW={w} />
      ))}
    </group>
  );
}

/* ─── Goal Posts ───────────────────────────────────────────────── */

function GoalPost({ side, pitchW }: { side: number; pitchW: number }) {
  const postH = 0.32;
  const goalW = 1.0;
  const goalD = 0.3;
  const r = 0.02;
  const cx = side * (pitchW / 2 + goalD / 2);

  return (
    <group position={[cx, 0, 0]}>
      {[-1, 1].map((t) => (
        <mesh key={`up-${t}`} position={[0, postH / 2, t * (goalW / 2)]}>
          <cylinderGeometry args={[r, r, postH, 6]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
      ))}
      <mesh position={[0, postH, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, goalW, 6]} />
        <meshStandardMaterial color="#ffffff" flatShading />
      </mesh>
      {/* Net as wireframe-ish translucent box */}
      <mesh position={[-side * (goalD / 2), postH / 2, 0]}>
        <boxGeometry args={[goalD, postH, goalW]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ─── Stand (one side) — Low-poly bowl with angled seating ───── */

function Stand({
  position,
  width,
  tiers,
  standColor,
  seatColor,
  standHeight,
  standDepth,
  flip = false,
  rotateY = 0,
  theme,
}: {
  position: [number, number, number];
  width: number;
  tiers: number;
  standColor: string;
  seatColor: string;
  standHeight: number;
  standDepth: number;
  flip?: boolean;
  rotateY?: number;
  theme: typeof THEMES.dark;
}) {
  const rowCount = tiers * 4;
  const rowH = standHeight / rowCount;
  const rowD = standDepth / rowCount;
  const seatLight = lighten(seatColor, 0.15);
  const seatDark = darken(seatColor, 0.08);

  const rows = useMemo(() => {
    const result: Array<{ y: number; z: number; h: number; d: number; color: string }> = [];
    for (let i = 0; i < rowCount; i++) {
      // Stagger outward and upward to create bowl effect
      const zOff = (flip ? -1 : 1) * i * rowD * 0.6;
      let color: string;
      if (i % 4 === 0) color = seatColor;
      else if (i % 4 === 1) color = seatLight;
      else if (i % 4 === 2) color = seatDark;
      else color = seatColor;

      result.push({
        y: i * rowH + rowH / 2 + 0.01,
        z: zOff,
        h: rowH * 0.9,
        d: rowD * 0.95,
        color,
      });
    }
    return result;
  }, [rowCount, rowH, rowD, flip, seatColor, seatLight, seatDark]);

  return (
    <group position={position} rotation={[0, rotateY, 0]}>
      {/* Concrete base block — the outer wall */}
      <mesh position={[0, standHeight * 0.45, (flip ? -1 : 1) * standDepth * 0.15]}>
        <boxGeometry args={[width + 0.05, standHeight * 0.95, standDepth * 0.75]} />
        <meshStandardMaterial color={theme.concrete} flatShading />
      </mesh>

      {/* Seat rows — stepped up and outward */}
      {rows.map((row, i) => (
        <mesh key={`row-${i}`} position={[0, row.y, row.z]}>
          <boxGeometry args={[width * 0.96, row.h, row.d]} />
          <meshStandardMaterial color={row.color} flatShading />
        </mesh>
      ))}

      {/* Top edge / railing */}
      <mesh position={[0, standHeight + 0.03, (flip ? -1 : 1) * rowCount * rowD * 0.3]}>
        <boxGeometry args={[width + 0.06, 0.06, 0.06]} />
        <meshStandardMaterial color={theme.concreteLight} flatShading />
      </mesh>

      {/* Entrance tunnels (dark recesses at base) */}
      {[-1, 0, 1].map((s) => (
        <mesh
          key={`tunnel-${s}`}
          position={[s * (width * 0.3), 0.2, (flip ? 1 : -1) * (standDepth / 2 + 0.01)]}
        >
          <boxGeometry args={[0.35, 0.4, 0.06]} />
          <meshStandardMaterial color={darken(theme.concrete, 0.2)} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Corner Section ───────────────────────────────────────────── */

function CornerSection({
  cx,
  cz,
  standHeight,
  standDepth,
  seatColor,
  theme,
}: {
  cx: number;
  cz: number;
  standHeight: number;
  standDepth: number;
  seatColor: string;
  theme: typeof THEMES.dark;
}) {
  const h = standHeight * 0.7;
  return (
    <group position={[cx, 0, cz]}>
      {/* Corner concrete */}
      <mesh position={[0, h * 0.4, 0]}>
        <boxGeometry args={[standDepth * 0.8, h * 0.8, standDepth * 0.8]} />
        <meshStandardMaterial color={theme.concrete} flatShading />
      </mesh>
      {/* Seat layers */}
      {[0.25, 0.45, 0.6].map((frac, i) => (
        <mesh key={`cs-${i}`} position={[0, h * frac + 0.05, 0]}>
          <boxGeometry args={[standDepth * 0.72, h * 0.1, standDepth * 0.72]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? seatColor : lighten(seatColor, 0.12)}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Floodlight Tower ─────────────────────────────────────────── */

function FloodlightTower({
  position,
  height,
  theme,
}: {
  position: [number, number, number];
  height: number;
  theme: typeof THEMES.dark;
}) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.2, 0.06, 0.2]} />
        <meshStandardMaterial color={theme.concreteLight} flatShading />
      </mesh>
      {/* Tower shaft */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.06, height, 6]} />
        <meshStandardMaterial color="#cccccc" flatShading />
      </mesh>
      {/* Light panel rack */}
      <mesh position={[0, height - 0.05, 0]}>
        <boxGeometry args={[0.45, 0.08, 0.12]} />
        <meshStandardMaterial color="#aaaaaa" flatShading />
      </mesh>
      {/* Light bulbs (3x2 grid) */}
      {[-0.12, 0, 0.12].map((xOff) =>
        [-0.02, 0.02].map((yOff) => (
          <mesh
            key={`lb-${xOff}-${yOff}`}
            position={[xOff, height + yOff, 0.06]}
          >
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshStandardMaterial
              color="#ffffee"
              emissive="#ffee88"
              emissiveIntensity={2.0}
              flatShading
            />
          </mesh>
        ))
      )}
      <pointLight
        position={[0, height + 0.3, 0]}
        intensity={18}
        distance={20}
        color="#fff8e0"
        decay={2}
      />
    </group>
  );
}

/* ─── Roof ─────────────────────────────────────────────────────── */

function Roof({
  roof,
  standHeight,
  standDepth,
  pitchW,
  pitchH,
  theme,
}: {
  roof: number;
  standHeight: number;
  standDepth: number;
  pitchW: number;
  pitchH: number;
  theme: typeof THEMES.dark;
}) {
  const roofY = standHeight + 0.25;
  const t = 0.1;
  const overhang = 0.6; // How far roof extends over pitch

  const sides: Array<{
    pos: [number, number, number];
    size: [number, number, number];
    pillarAxis: "x" | "z";
    pillarCount: number;
    pillarLen: number;
  }> = [
    {
      pos: [0, roofY, -pitchH / 2 - standDepth * 0.2],
      size: [pitchW + standDepth * 2.2, t, standDepth + overhang],
      pillarAxis: "x", pillarCount: 6, pillarLen: pitchW + standDepth * 2,
    },
    {
      pos: [0, roofY, pitchH / 2 + standDepth * 0.2],
      size: [pitchW + standDepth * 2.2, t, standDepth + overhang],
      pillarAxis: "x", pillarCount: 6, pillarLen: pitchW + standDepth * 2,
    },
    {
      pos: [-pitchW / 2 - standDepth * 0.2, roofY, 0],
      size: [standDepth + overhang, t, pitchH + 0.2],
      pillarAxis: "z", pillarCount: 4, pillarLen: pitchH,
    },
    {
      pos: [pitchW / 2 + standDepth * 0.2, roofY, 0],
      size: [standDepth + overhang, t, pitchH + 0.2],
      pillarAxis: "z", pillarCount: 4, pillarLen: pitchH,
    },
  ];

  return (
    <group>
      {sides.map(({ pos, size, pillarAxis, pillarCount, pillarLen }, i) => (
        <group key={`roof-${i}`}>
          {/* Main canopy panel */}
          <mesh position={pos}>
            <boxGeometry args={size} />
            <meshStandardMaterial color={theme.roofColor} flatShading />
          </mesh>

          {/* Grid lines on roof (panel look) */}
          {Array.from({ length: 3 }).map((_, g) => {
            const frac = (g + 1) / 4;
            const gPos: [number, number, number] = pillarAxis === "x"
              ? [pos[0], pos[1] + t / 2 + 0.005, pos[2] - size[2] / 2 + size[2] * frac]
              : [pos[0] - size[0] / 2 + size[0] * frac, pos[1] + t / 2 + 0.005, pos[2]];
            return (
              <mesh key={`rg-${i}-${g}`} position={gPos} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={pillarAxis === "x" ? [size[0], 0.02] : [0.02, size[2]]} />
                <meshStandardMaterial color={theme.roofLight} flatShading />
              </mesh>
            );
          })}

          {/* Support pillars */}
          {Array.from({ length: pillarCount }).map((_, j) => {
            const offset = -pillarLen / 2 + (j + 1) * (pillarLen / (pillarCount + 1));
            const pPos: [number, number, number] = pillarAxis === "x"
              ? [offset, standHeight / 2 + 0.1, pos[2]]
              : [pos[0], standHeight / 2 + 0.1, offset];
            const pH = roofY - 0.1;
            return (
              <mesh key={`pillar-${i}-${j}`} position={pPos}>
                <boxGeometry args={[0.08, pH, 0.08]} />
                <meshStandardMaterial color={theme.concreteLight} flatShading />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Corner roof (roof >= 2) */}
      {roof >= 2 &&
        [
          [-pitchW / 2 - standDepth / 2, -pitchH / 2 - standDepth / 2],
          [pitchW / 2 + standDepth / 2, -pitchH / 2 - standDepth / 2],
          [-pitchW / 2 - standDepth / 2, pitchH / 2 + standDepth / 2],
          [pitchW / 2 + standDepth / 2, pitchH / 2 + standDepth / 2],
        ].map(([rx, rz], i) => (
          <mesh key={`rcorner-${i}`} position={[rx, roofY, rz]}>
            <boxGeometry args={[standDepth * 1.0, t, standDepth * 1.0]} />
            <meshStandardMaterial color={theme.roofColor} flatShading />
          </mesh>
        ))}

      {/* Retractable sections (roof === 3) */}
      {roof === 3 &&
        Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={`retract-${i}`}
            position={[
              -pitchW * 0.35 + i * (pitchW * 0.7) / 5,
              roofY + 0.12,
              0,
            ]}
          >
            <boxGeometry args={[pitchW * 0.08, 0.04, pitchH * 0.6]} />
            <meshStandardMaterial color={theme.roofLight} flatShading metalness={0.3} />
          </mesh>
        ))}
    </group>
  );
}

/* ─── Scoreboard ───────────────────────────────────────────────── */

function Scoreboard({
  standHeight,
  pitchH,
  standDepth,
  theme,
}: {
  standHeight: number;
  pitchH: number;
  standDepth: number;
  theme: typeof THEMES.dark;
}) {
  return (
    <Float speed={0.3} floatIntensity={0.03}>
      <group position={[0, standHeight + 0.8, -pitchH / 2 - standDepth - 0.4]}>
        {/* Board backing */}
        <mesh>
          <boxGeometry args={[1.8, 0.5, 0.1]} />
          <meshStandardMaterial color={theme.concrete} flatShading />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0, 0.055]}>
          <planeGeometry args={[1.6, 0.38]} />
          <meshStandardMaterial
            color="#0a1028"
            emissive={ACCENT}
            emissiveIntensity={0.6}
            flatShading
          />
        </mesh>
        {/* Support poles */}
        {[-0.6, 0.6].map((xOff) => (
          <mesh key={`sp-${xOff}`} position={[xOff, -0.5, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.7, 6]} />
            <meshStandardMaterial color={theme.concreteLight} flatShading />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

/* ─── Surrounding Environment ──────────────────────────────────── */

function Environment({
  pitchW,
  pitchH,
  standDepth,
  theme,
}: {
  pitchW: number;
  pitchH: number;
  standDepth: number;
  theme: typeof THEMES.dark;
}) {
  const outerW = pitchW + standDepth * 2 + 5;
  const outerH = pitchH + standDepth * 2 + 5;

  // Tree positions around the perimeter
  const trees: Array<{ pos: [number, number, number]; s: number }> = useMemo(() => {
    const result: Array<{ pos: [number, number, number]; s: number }> = [];
    const margin = 0.8;
    const stadW = pitchW / 2 + standDepth + margin;
    const stadH = pitchH / 2 + standDepth + margin;

    // Corner clusters
    const corners: [number, number][] = [
      [-stadW - 0.5, -stadH - 0.5],
      [stadW + 0.5, -stadH - 0.5],
      [-stadW - 0.5, stadH + 0.5],
      [stadW + 0.5, stadH + 0.5],
    ];
    for (const [cx, cz] of corners) {
      result.push({ pos: [cx, 0, cz], s: 0.9 + Math.random() * 0.3 });
      result.push({ pos: [cx + 0.4, 0, cz + 0.3], s: 0.7 + Math.random() * 0.3 });
      result.push({ pos: [cx - 0.3, 0, cz + 0.5], s: 0.8 + Math.random() * 0.2 });
    }

    // Side trees
    for (let i = -2; i <= 2; i++) {
      result.push({ pos: [i * 1.2, 0, -stadH - 1.0], s: 0.8 + Math.random() * 0.3 });
      result.push({ pos: [i * 1.2, 0, stadH + 1.0], s: 0.8 + Math.random() * 0.3 });
    }
    for (let i = -1; i <= 1; i++) {
      result.push({ pos: [-stadW - 1.2, 0, i * 1.2], s: 0.8 + Math.random() * 0.3 });
      result.push({ pos: [stadW + 1.2, 0, i * 1.2], s: 0.8 + Math.random() * 0.3 });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitchW, pitchH, standDepth]);

  return (
    <group>
      {/* Ground platform (raised base) */}
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[outerW, 0.16, outerH]} />
        <meshStandardMaterial color={theme.ground} flatShading />
      </mesh>

      {/* Platform edge strip */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[outerW + 0.1, 0.02, outerH + 0.1]} />
        <meshStandardMaterial color={theme.groundEdge} flatShading />
      </mesh>

      {/* Paths / walkways around the stadium */}
      {/* North-south paths */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, outerH * 0.85]} />
        <meshStandardMaterial color={theme.path} flatShading />
      </mesh>
      {/* East-west path */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[outerW * 0.85, 0.5]} />
        <meshStandardMaterial color={theme.path} flatShading />
      </mesh>

      {/* Small parking lot (right side) */}
      <group position={[outerW / 2 - 1.2, 0.004, outerH / 2 - 1.0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.0, 1.5]} />
          <meshStandardMaterial color={theme.parking} flatShading />
        </mesh>
        {/* Parking lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh
            key={`pk-${i}`}
            position={[-0.8 + i * 0.4, 0.002, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.02, 1.2]} />
            <meshStandardMaterial color={theme.parkLine} flatShading />
          </mesh>
        ))}
      </group>

      {/* Trees */}
      {trees.map((t, i) => (
        <Tree key={`tree-${i}`} position={t.pos} scale={t.s} theme={theme} />
      ))}

      {/* Large base plane underneath everything */}
      <mesh position={[0, -0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={theme.groundEdge} flatShading />
      </mesh>
    </group>
  );
}

/* ─── Main Stadium Model ───────────────────────────────────────── */

function StadiumModel({ level, theme }: { level: StadiumLevel; theme: typeof THEMES.dark }) {
  const { tiers, roof, floodlights, scoreboard, vip, screens } = level;

  const pitchW = 6;
  const pitchH = 4;
  const standHeight = 0.6 + tiers * 0.5;
  const standDepth = 0.9 + tiers * 0.3;
  const lightTowerH = standHeight * 2.2 + 1.5;

  const floodlightPositions = useMemo(() => {
    const d = 0.5;
    const all: [number, number, number][] = [
      [-pitchW / 2 - standDepth - d, 0, -pitchH / 2 - standDepth - d],
      [pitchW / 2 + standDepth + d, 0, -pitchH / 2 - standDepth - d],
      [-pitchW / 2 - standDepth - d, 0, pitchH / 2 + standDepth + d],
      [pitchW / 2 + standDepth + d, 0, pitchH / 2 + standDepth + d],
    ];
    return floodlights === 2 ? all.slice(0, 2) : all;
  }, [floodlights, standDepth, pitchW, pitchH]);

  return (
    <group>
      {/* Environment (ground, trees, paths) */}
      <Environment pitchW={pitchW} pitchH={pitchH} standDepth={standDepth} theme={theme} />

      {/* Pitch */}
      <Pitch pitchColor={level.pitchColor} w={pitchW} h={pitchH} />

      {/* 4 Stands */}
      <Stand
        position={[0, 0, -pitchH / 2 - standDepth / 2]}
        width={pitchW + standDepth * 2}
        tiers={tiers}
        standColor={level.standColor}
        seatColor={level.seatColor}
        standHeight={standHeight}
        standDepth={standDepth}
        theme={theme}
      />
      <Stand
        position={[0, 0, pitchH / 2 + standDepth / 2]}
        width={pitchW + standDepth * 2}
        tiers={tiers}
        standColor={level.standColor}
        seatColor={level.seatColor}
        standHeight={standHeight}
        standDepth={standDepth}
        flip
        theme={theme}
      />
      <Stand
        position={[-pitchW / 2 - standDepth / 2, 0, 0]}
        width={pitchH}
        tiers={tiers}
        standColor={level.standColor}
        seatColor={level.seatColor}
        standHeight={standHeight}
        standDepth={standDepth}
        rotateY={Math.PI / 2}
        theme={theme}
      />
      <Stand
        position={[pitchW / 2 + standDepth / 2, 0, 0]}
        width={pitchH}
        tiers={tiers}
        standColor={level.standColor}
        seatColor={level.seatColor}
        standHeight={standHeight}
        standDepth={standDepth}
        rotateY={-Math.PI / 2}
        theme={theme}
      />

      {/* Corner fills (level >= 5) */}
      {level.level >= 5 &&
        [
          [-pitchW / 2 - standDepth / 2, -pitchH / 2 - standDepth / 2],
          [pitchW / 2 + standDepth / 2, -pitchH / 2 - standDepth / 2],
          [-pitchW / 2 - standDepth / 2, pitchH / 2 + standDepth / 2],
          [pitchW / 2 + standDepth / 2, pitchH / 2 + standDepth / 2],
        ].map(([cx, cz], i) => (
          <CornerSection
            key={`corner-${i}`}
            cx={cx}
            cz={cz}
            standHeight={standHeight}
            standDepth={standDepth}
            seatColor={level.seatColor}
            theme={theme}
          />
        ))}

      {/* Roof */}
      {roof >= 1 && (
        <Roof
          roof={roof}
          standHeight={standHeight}
          standDepth={standDepth}
          pitchW={pitchW}
          pitchH={pitchH}
          theme={theme}
        />
      )}

      {/* Floodlights */}
      {floodlights > 0 &&
        floodlightPositions.map((pos, i) => (
          <FloodlightTower key={`flood-${i}`} position={pos} height={lightTowerH} theme={theme} />
        ))}

      {/* Scoreboard */}
      {scoreboard && (
        <Scoreboard
          standHeight={standHeight}
          pitchH={pitchH}
          standDepth={standDepth}
          theme={theme}
        />
      )}

      {/* VIP section */}
      {vip && (
        <group position={[-pitchW / 2 - standDepth / 2, standHeight * 0.55, 0]}>
          <mesh>
            <boxGeometry args={[standDepth * 0.35, standHeight * 0.28, pitchH * 0.35]} />
            <meshStandardMaterial
              color={ACCENT}
              transparent
              opacity={0.35}
              emissive={ACCENT}
              emissiveIntensity={0.2}
              flatShading
            />
          </mesh>
        </group>
      )}

      {/* Corner screens */}
      {screens &&
        [
          [-pitchW / 2 - standDepth * 0.3, -pitchH / 2 - standDepth * 0.3, Math.PI / 4],
          [pitchW / 2 + standDepth * 0.3, -pitchH / 2 - standDepth * 0.3, -Math.PI / 4],
          [-pitchW / 2 - standDepth * 0.3, pitchH / 2 + standDepth * 0.3, -Math.PI / 4],
          [pitchW / 2 + standDepth * 0.3, pitchH / 2 + standDepth * 0.3, Math.PI / 4],
        ].map(([sx, sz, ry], i) => (
          <group key={`screen-${i}`} position={[sx, standHeight * 0.6, sz]} rotation={[0, ry, 0]}>
            <mesh>
              <boxGeometry args={[0.55, 0.38, 0.06]} />
              <meshStandardMaterial color={theme.concrete} flatShading />
            </mesh>
            <mesh position={[0, 0, 0.035]}>
              <planeGeometry args={[0.48, 0.3]} />
              <meshStandardMaterial
                color="#050520"
                emissive="#4488ff"
                emissiveIntensity={0.5}
                flatShading
              />
            </mesh>
          </group>
        ))}
    </group>
  );
}

/* ─── Canvas Wrapper ───────────────────────────────────────────── */

export default function Stadium3D({ level, theme = "dark" }: Stadium3DProps) {
  const cameraDistance = 5.5 + level.tiers * 1.3;
  const t = THEMES[theme];

  return (
    <div
      className="w-full aspect-[16/10] max-w-[720px] rounded-xl border border-gray-800 overflow-hidden"
      style={{ backgroundColor: t.bg }}
    >
      <Canvas
        camera={{
          position: [cameraDistance * 0.7, cameraDistance * 0.55, cameraDistance * 0.7],
          fov: 40,
          near: 0.1,
          far: 60,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: theme === "light" ? 1.5 : 1.2,
        }}
      >
        {/* Sky color */}
        <color attach="background" args={[t.sky]} />

        {/* Lighting */}
        <ambientLight intensity={t.ambient} />
        <hemisphereLight args={[t.hemiSky, t.hemiGround, t.hemiIntensity]} />
        <directionalLight position={[8, 14, 6]} intensity={t.dirIntensity} color={t.dirColor} />
        <directionalLight position={[-5, 10, -4]} intensity={t.dirIntensity * 0.5} color="#d0d8ff" />
        <directionalLight position={[0, 6, -10]} intensity={t.dirIntensity * 0.25} color="#ffe8cc" />

        <StadiumModel level={level} theme={t} />

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 8}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
