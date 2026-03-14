"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { StadiumLevel } from "@/lib/stadium-levels";

interface Stadium3DProps {
  level: StadiumLevel;
}

const ACCENT = "#f0c040";

/* ─── Helpers ──────────────────────────────────────────────────── */

/** Lighten a hex color by a percentage (0-1). */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (n & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ─── Pitch ────────────────────────────────────────────────────── */

function Pitch({ pitchColor, w, h }: { pitchColor: string; w: number; h: number }) {
  const stripeCount = 12;
  const stripeW = w / stripeCount;
  const darkGreen = pitchColor;
  const lightGreen = lighten(pitchColor, 0.06);

  return (
    <group>
      {/* Pitch stripes */}
      {Array.from({ length: stripeCount }).map((_, i) => (
        <mesh
          key={`stripe-${i}`}
          position={[-w / 2 + (i + 0.5) * stripeW, 0.001, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[stripeW, h]} />
          <meshStandardMaterial color={i % 2 === 0 ? darkGreen : lightGreen} />
        </mesh>
      ))}

      {/* Centre circle */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.54, 0.58, 48]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Centre spot */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Half-way line */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, h * 0.98]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Touchlines (long sides) */}
      {[-1, 1].map((s) => (
        <mesh key={`touch-${s}`} position={[0, 0.005, s * (h / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, 0.04]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Goal lines (short sides) */}
      {[-1, 1].map((s) => (
        <mesh key={`goal-line-${s}`} position={[s * (w / 2), 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.04, h]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Penalty areas */}
      {[-1, 1].map((s) => {
        const boxW = 1.2;
        const boxH = 2.4;
        const cx = s * (w / 2 - boxW / 2);
        return (
          <group key={`penalty-${s}`}>
            {/* Top & bottom of box */}
            {[-1, 1].map((t) => (
              <mesh key={`pb-${s}-${t}`} position={[cx, 0.005, t * (boxH / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[boxW, 0.04]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            ))}
            {/* Inner vertical */}
            <mesh position={[cx + s * (-boxW / 2), 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.04, boxH]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Penalty spot */}
            <mesh position={[s * (w / 2 - 0.8), 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.04, 12]} />
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
  const postH = 0.35;
  const goalW = 1.1;
  const goalD = 0.35;
  const r = 0.02;
  const cx = side * (pitchW / 2 + goalD / 2);
  const postColor = "#e8e8e8";

  return (
    <group position={[cx, 0, 0]}>
      {/* Uprights */}
      {[-1, 1].map((t) => (
        <mesh key={`upright-${t}`} position={[0, postH / 2, t * (goalW / 2)]}>
          <cylinderGeometry args={[r, r, postH, 8]} />
          <meshStandardMaterial color={postColor} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Crossbar */}
      <mesh position={[0, postH, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, goalW, 8]} />
        <meshStandardMaterial color={postColor} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Net (translucent back) */}
      <mesh position={[-side * (goalD / 2), postH / 2, 0]}>
        <boxGeometry args={[goalD, postH, goalW]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ─── Stand (one side) with stepped seating ────────────────────── */

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
}) {
  const rowCount = tiers * 4;
  const rowH = standHeight / rowCount;
  const rowD = standDepth / rowCount;
  const seatLight = lighten(seatColor, 0.12);

  const rows = useMemo(() => {
    const result: Array<{ y: number; z: number; h: number; d: number; color: string }> = [];
    for (let i = 0; i < rowCount; i++) {
      result.push({
        y: i * rowH + rowH / 2,
        z: (flip ? -1 : 1) * (i * rowD * 0.5),
        h: rowH * 0.85,
        d: rowD * 0.9,
        color: i % 3 === 0 ? seatLight : i % 3 === 1 ? seatColor : standColor,
      });
    }
    return result;
  }, [rowCount, rowH, rowD, flip, seatLight, seatColor, standColor]);

  // Structural columns
  const colCount = Math.max(4, Math.floor(width / 1.2));
  const colSpacing = width / (colCount + 1);

  return (
    <group position={position} rotation={[0, rotateY, 0]}>
      {/* Concrete base */}
      <mesh position={[0, standHeight * 0.25, 0]}>
        <boxGeometry args={[width, standHeight * 0.5, standDepth]} />
        <meshStandardMaterial color={lighten(standColor, 0.05)} roughness={0.9} />
      </mesh>

      {/* Stepped seating rows */}
      {rows.map((row, i) => (
        <mesh key={`row-${i}`} position={[0, row.y, row.z]}>
          <boxGeometry args={[width * 0.97, row.h, row.d]} />
          <meshStandardMaterial color={row.color} roughness={0.7} />
        </mesh>
      ))}

      {/* Structural columns on front face */}
      {Array.from({ length: colCount }).map((_, i) => {
        const x = -width / 2 + (i + 1) * colSpacing;
        return (
          <mesh key={`col-${i}`} position={[x, standHeight * 0.25, (flip ? 1 : -1) * (standDepth / 2 + 0.02)]}>
            <boxGeometry args={[0.08, standHeight * 0.55, 0.08]} />
            <meshStandardMaterial color={lighten(standColor, 0.15)} roughness={0.6} metalness={0.2} />
          </mesh>
        );
      })}

      {/* Top railing */}
      <mesh position={[0, standHeight + 0.04, (flip ? -1 : 1) * rowCount * rowD * 0.25]}>
        <boxGeometry args={[width, 0.03, 0.03]} />
        <meshStandardMaterial color={lighten(standColor, 0.25)} metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Walkway/concourse strip at base */}
      <mesh position={[0, 0.02, (flip ? 1 : -1) * (standDepth / 2 + 0.15)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, 0.25]} />
        <meshStandardMaterial color="#555555" roughness={0.95} />
      </mesh>
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
  standColor,
}: {
  cx: number;
  cz: number;
  standHeight: number;
  standDepth: number;
  seatColor: string;
  standColor: string;
}) {
  const h = standHeight * 0.75;
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, h * 0.35, 0]}>
        <boxGeometry args={[standDepth * 0.85, h * 0.7, standDepth * 0.85]} />
        <meshStandardMaterial color={standColor} roughness={0.8} />
      </mesh>
      {/* Seat rows on corner */}
      {[0.3, 0.5, 0.65].map((frac, i) => (
        <mesh key={`cseat-${i}`} position={[0, h * frac, 0]}>
          <boxGeometry args={[standDepth * 0.78, h * 0.08, standDepth * 0.78]} />
          <meshStandardMaterial color={i % 2 === 0 ? seatColor : lighten(seatColor, 0.1)} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Floodlight Tower ─────────────────────────────────────────── */

function FloodlightTower({ position, height }: { position: [number, number, number]; height: number }) {
  return (
    <group position={position}>
      {/* Base plate */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.04, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Tower shaft — tapered */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.07, height, 8]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cross-arm */}
      <mesh position={[0, height - 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
        <meshStandardMaterial color="#999999" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Light panels (3) */}
      {[-0.15, 0, 0.15].map((offset, i) => (
        <mesh key={`lp-${i}`} position={[offset, height, 0]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.1, 0.06, 0.08]} />
          <meshStandardMaterial
            color="#ffffcc"
            emissive="#ffee88"
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}
      {/* Actual point light */}
      <pointLight
        position={[0, height + 0.2, 0]}
        intensity={15}
        distance={18}
        color="#fff5e0"
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
}: {
  roof: number;
  standHeight: number;
  standDepth: number;
  pitchW: number;
  pitchH: number;
}) {
  const roofY = standHeight + 0.2;
  const roofThickness = 0.08;

  const sides: Array<{
    pos: [number, number, number];
    size: [number, number, number];
  }> = [
    { pos: [0, roofY, -pitchH / 2 - standDepth / 2], size: [pitchW + standDepth * 2, roofThickness, standDepth * 0.9] },
    { pos: [0, roofY, pitchH / 2 + standDepth / 2], size: [pitchW + standDepth * 2, roofThickness, standDepth * 0.9] },
    { pos: [-pitchW / 2 - standDepth / 2, roofY, 0], size: [standDepth * 0.9, roofThickness, pitchH] },
    { pos: [pitchW / 2 + standDepth / 2, roofY, 0], size: [standDepth * 0.9, roofThickness, pitchH] },
  ];

  const roofColor = roof === 3 ? "#607080" : "#4a5a6a";
  const roofEdge = lighten(roofColor, 0.15);

  return (
    <group>
      {sides.map(({ pos, size }, i) => (
        <group key={`roof-${i}`}>
          {/* Main canopy */}
          <mesh position={pos}>
            <boxGeometry args={size} />
            <meshStandardMaterial
              color={roofColor}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          {/* Fascia edge strip */}
          <mesh position={[pos[0], pos[1] - roofThickness / 2, pos[2]]}>
            <boxGeometry args={[
              i < 2 ? size[0] : size[0] + 0.06,
              0.04,
              i < 2 ? size[2] + 0.06 : size[2],
            ]} />
            <meshStandardMaterial color={roofEdge} metalness={0.3} roughness={0.5} />
          </mesh>
          {/* Support struts */}
          {Array.from({ length: i < 2 ? 6 : 4 }).map((_, j) => {
            const len = i < 2 ? size[0] : size[2];
            const offset = -len / 2 + (j + 1) * (len / (i < 2 ? 7 : 5));
            const strutPos: [number, number, number] = i < 2
              ? [offset, (roofY + standHeight) / 2, pos[2]]
              : [pos[0], (roofY + standHeight) / 2, offset];
            return (
              <mesh key={`strut-${i}-${j}`} position={strutPos}>
                <cylinderGeometry args={[0.02, 0.02, roofY - standHeight, 6]} />
                <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Corner roof fills (roof >= 2) */}
      {roof >= 2 &&
        [
          [-pitchW / 2 - standDepth / 2, -pitchH / 2 - standDepth / 2],
          [pitchW / 2 + standDepth / 2, -pitchH / 2 - standDepth / 2],
          [-pitchW / 2 - standDepth / 2, pitchH / 2 + standDepth / 2],
          [pitchW / 2 + standDepth / 2, pitchH / 2 + standDepth / 2],
        ].map(([rx, rz], i) => (
          <mesh key={`roofcorner-${i}`} position={[rx, roofY, rz]}>
            <boxGeometry args={[standDepth * 0.9, roofThickness, standDepth * 0.9]} />
            <meshStandardMaterial color={roofColor} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}

      {/* Retractable roof (roof === 3) */}
      {roof === 3 &&
        Array.from({ length: 8 }).map((_, i) => (
          <mesh
            key={`retract-${i}`}
            position={[
              -pitchW * 0.4 + i * (pitchW * 0.8) / 7,
              roofY + 0.12,
              0,
            ]}
          >
            <boxGeometry args={[0.06, 0.03, pitchH * 0.65]} />
            <meshStandardMaterial color="#8090a0" metalness={0.7} roughness={0.2} />
          </mesh>
        ))}
    </group>
  );
}

/* ─── Main Model ───────────────────────────────────────────────── */

function StadiumModel({ level }: { level: StadiumLevel }) {
  const { tiers, roof, floodlights, scoreboard, vip, screens } = level;

  const pitchW = 6;
  const pitchH = 4;
  const standHeight = 0.6 + tiers * 0.5;
  const standDepth = 0.9 + tiers * 0.3;

  const lightTowerH = standHeight * 2.2 + 1.5;

  const floodlightPositions = useMemo(() => {
    const d = 0.4;
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
      {/* Pitch */}
      <Pitch pitchColor={level.pitchColor} w={pitchW} h={pitchH} />

      {/* Stands (4 sides) */}
      <Stand
        position={[0, 0, -pitchH / 2 - standDepth / 2]}
        width={pitchW + standDepth * 2}
        tiers={tiers}
        standColor={level.standColor}
        seatColor={level.seatColor}
        standHeight={standHeight}
        standDepth={standDepth}
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
            standColor={level.standColor}
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
        />
      )}

      {/* Floodlights */}
      {floodlights > 0 &&
        floodlightPositions.map((pos, i) => (
          <FloodlightTower key={`flood-${i}`} position={pos} height={lightTowerH} />
        ))}

      {/* Scoreboard */}
      {scoreboard && (
        <Float speed={0.4} floatIntensity={0.05}>
          <group position={[0, standHeight + 0.7, -pitchH / 2 - standDepth - 0.3]}>
            {/* Frame */}
            <mesh>
              <boxGeometry args={[1.6, 0.55, 0.1]} />
              <meshStandardMaterial color="#333333" metalness={0.4} roughness={0.5} />
            </mesh>
            {/* Screen face */}
            <mesh position={[0, 0, 0.055]}>
              <planeGeometry args={[1.4, 0.4]} />
              <meshStandardMaterial
                color="#0a1030"
                emissive={ACCENT}
                emissiveIntensity={0.5}
              />
            </mesh>
            {/* Support pole */}
            <mesh position={[0, -0.45, 0]}>
              <cylinderGeometry args={[0.03, 0.04, 0.6, 6]} />
              <meshStandardMaterial color="#777777" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
        </Float>
      )}

      {/* VIP section — glass box on west stand */}
      {vip && (
        <group position={[-pitchW / 2 - standDepth / 2, standHeight * 0.55, 0]}>
          <mesh>
            <boxGeometry args={[standDepth * 0.35, standHeight * 0.3, pitchH * 0.35]} />
            <meshStandardMaterial
              color={ACCENT}
              transparent
              opacity={0.3}
              emissive={ACCENT}
              emissiveIntensity={0.2}
            />
          </mesh>
          {/* Glass panels */}
          {[-1, 1].map((s) => (
            <mesh key={`vip-glass-${s}`} position={[standDepth * 0.175, 0, s * pitchH * 0.175]}>
              <planeGeometry args={[standDepth * 0.35, standHeight * 0.28]} />
              <meshStandardMaterial color="#aaddff" transparent opacity={0.15} side={THREE.DoubleSide} />
            </mesh>
          ))}
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
              <boxGeometry args={[0.6, 0.4, 0.05]} />
              <meshStandardMaterial color="#222222" metalness={0.3} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[0.52, 0.32]} />
              <meshStandardMaterial
                color="#050520"
                emissive="#4488ff"
                emissiveIntensity={0.6}
              />
            </mesh>
          </group>
        ))}

      {/* Ground plane */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#181a1f" />
      </mesh>

      {/* Surrounding area — lighter ring around stadium */}
      <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7, 11, 48]} />
        <meshStandardMaterial color="#1e2026" />
      </mesh>
    </group>
  );
}

/* ─── Canvas Wrapper ───────────────────────────────────────────── */

export default function Stadium3D({ level }: Stadium3DProps) {
  const cameraDistance = 5.5 + level.tiers * 1.3;

  return (
    <div className="w-full aspect-[16/10] max-w-[720px] rounded-xl border border-gray-800 overflow-hidden bg-[#0d0d12]">
      <Canvas
        camera={{
          position: [cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7],
          fov: 42,
          near: 0.1,
          far: 60,
        }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        {/* Bright, multi-source lighting */}
        <ambientLight intensity={2.0} />
        <hemisphereLight args={["#c8d8ff", "#2a4a2a", 1.5]} />
        <directionalLight position={[8, 12, 6]} intensity={3.0} color="#ffffff" />
        <directionalLight position={[-6, 10, -4]} intensity={1.5} color="#d0d8ff" />
        <directionalLight position={[0, 8, -8]} intensity={0.8} color="#ffe8cc" />

        <StadiumModel level={level} />

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={18}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 8}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
