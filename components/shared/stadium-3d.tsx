"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { useMemo } from "react";
import type { StadiumLevel } from "@/lib/stadium-levels";

interface Stadium3DProps {
  level: StadiumLevel;
}

/** Primary green for branding. */
const PRIMARY = "#1a7a3c";
const ACCENT = "#f0c040";

/**
 * Procedural 3D stadium built from geometric primitives.
 * Scales with stadium level — more tiers, roof, floodlights, screens, VIP.
 */
function StadiumModel({ level }: { level: StadiumLevel }) {
  const { tiers, roof, floodlights, scoreboard, vip, screens } = level;

  // Pitch dimensions
  const pitchW = 6;
  const pitchH = 4;

  // Stand height scales with tiers
  const standHeight = 0.5 + tiers * 0.45;
  const standDepth = 0.8 + tiers * 0.3;

  // Seat color from level
  const seatHex = level.seatColor;
  const standHex = level.standColor;

  // Step rows for each stand
  const rows = useMemo(() => {
    const steps: Array<{ y: number; depth: number; height: number }> = [];
    const rowCount = tiers * 3;
    for (let i = 0; i < rowCount; i++) {
      steps.push({
        y: (i * standHeight) / rowCount,
        depth: standDepth * (1 - (i * 0.15) / rowCount),
        height: standHeight / rowCount,
      });
    }
    return steps;
  }, [tiers, standHeight, standDepth]);

  return (
    <group>
      {/* ── Pitch ─────────────────────────────────────────── */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[pitchW, pitchH]} />
        <meshStandardMaterial color={level.pitchColor} />
      </mesh>

      {/* Pitch stripes */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh
          key={`stripe-${i}`}
          position={[-pitchW / 2 + (i + 0.5) * (pitchW / 10), -0.015, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[pitchW / 20, pitchH]} />
          <meshStandardMaterial
            color={level.pitchColor}
            emissive={i % 2 === 0 ? "#001200" : "#000000"}
            emissiveIntensity={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      {/* Pitch lines */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.58, 32]} />
        <meshStandardMaterial color="white" transparent opacity={0.5} />
      </mesh>

      {/* Center line */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, pitchH * 0.96]} />
        <meshStandardMaterial color="white" transparent opacity={0.4} />
      </mesh>

      {/* ── Stands (4 sides) ──────────────────────────────── */}
      {/* North stand */}
      <Stand
        position={[0, 0, -pitchH / 2 - standDepth / 2]}
        width={pitchW + standDepth * 2}
        rows={rows}
        standColor={standHex}
        seatColor={seatHex}
        standHeight={standHeight}
        standDepth={standDepth}
      />

      {/* South stand */}
      <Stand
        position={[0, 0, pitchH / 2 + standDepth / 2]}
        width={pitchW + standDepth * 2}
        rows={rows}
        standColor={standHex}
        seatColor={seatHex}
        standHeight={standHeight}
        standDepth={standDepth}
        flip
      />

      {/* West stand */}
      <Stand
        position={[-pitchW / 2 - standDepth / 2, 0, 0]}
        width={pitchH}
        rows={rows}
        standColor={standHex}
        seatColor={seatHex}
        standHeight={standHeight}
        standDepth={standDepth}
        rotateY={Math.PI / 2}
      />

      {/* East stand */}
      <Stand
        position={[pitchW / 2 + standDepth / 2, 0, 0]}
        width={pitchH}
        rows={rows}
        standColor={standHex}
        seatColor={seatHex}
        standHeight={standHeight}
        standDepth={standDepth}
        rotateY={-Math.PI / 2}
      />

      {/* ── Corner fills (level 5+) ──────────────────────── */}
      {level.level >= 5 && (
        <>
          {[
            [-pitchW / 2 - standDepth / 2, -pitchH / 2 - standDepth / 2],
            [pitchW / 2 + standDepth / 2, -pitchH / 2 - standDepth / 2],
            [-pitchW / 2 - standDepth / 2, pitchH / 2 + standDepth / 2],
            [pitchW / 2 + standDepth / 2, pitchH / 2 + standDepth / 2],
          ].map(([cx, cz], i) => (
            <mesh key={`corner-${i}`} position={[cx, standHeight / 3, cz]}>
              <boxGeometry args={[standDepth * 0.9, standHeight * 0.7, standDepth * 0.9]} />
              <meshStandardMaterial color={seatHex} transparent opacity={0.7} />
            </mesh>
          ))}
        </>
      )}

      {/* ── Roof ──────────────────────────────────────────── */}
      {roof >= 1 && (
        <group>
          {/* Roof canopy */}
          {[
            { pos: [0, standHeight + 0.15, -pitchH / 2 - standDepth / 2] as [number, number, number], size: [pitchW + standDepth * 2, 0.06, standDepth * 0.85] as [number, number, number] },
            { pos: [0, standHeight + 0.15, pitchH / 2 + standDepth / 2] as [number, number, number], size: [pitchW + standDepth * 2, 0.06, standDepth * 0.85] as [number, number, number] },
            { pos: [-pitchW / 2 - standDepth / 2, standHeight + 0.15, 0] as [number, number, number], size: [standDepth * 0.85, 0.06, pitchH] as [number, number, number] },
            { pos: [pitchW / 2 + standDepth / 2, standHeight + 0.15, 0] as [number, number, number], size: [standDepth * 0.85, 0.06, pitchH] as [number, number, number] },
          ].map(({ pos, size }, i) => (
            <mesh key={`roof-${i}`} position={pos}>
              <boxGeometry args={size} />
              <meshStandardMaterial
                color={roof === 3 ? "#2a3a4a" : "#1a2a3a"}
                transparent
                opacity={0.85}
                metalness={0.6}
                roughness={0.4}
              />
            </mesh>
          ))}

          {/* Full roof connection corners (roof >= 2) */}
          {roof >= 2 &&
            [
              [-pitchW / 2 - standDepth / 2, -pitchH / 2 - standDepth / 2],
              [pitchW / 2 + standDepth / 2, -pitchH / 2 - standDepth / 2],
              [-pitchW / 2 - standDepth / 2, pitchH / 2 + standDepth / 2],
              [pitchW / 2 + standDepth / 2, pitchH / 2 + standDepth / 2],
            ].map(([rx, rz], i) => (
              <mesh key={`roofcorner-${i}`} position={[rx, standHeight + 0.15, rz]}>
                <boxGeometry args={[standDepth * 0.9, 0.06, standDepth * 0.9]} />
                <meshStandardMaterial color="#1a2a3a" transparent opacity={0.8} />
              </mesh>
            ))}

          {/* Retractable roof strips (roof === 3) */}
          {roof === 3 &&
            Array.from({ length: 6 }).map((_, i) => (
              <mesh
                key={`retract-${i}`}
                position={[
                  -pitchW * 0.35 + i * (pitchW * 0.7) / 5,
                  standHeight + 0.25,
                  0,
                ]}
              >
                <boxGeometry args={[0.08, 0.02, pitchH * 0.7]} />
                <meshStandardMaterial color="#4a5a6a" metalness={0.8} roughness={0.2} />
              </mesh>
            ))}
        </group>
      )}

      {/* ── Floodlights ───────────────────────────────────── */}
      {floodlights > 0 && (
        <>
          {(floodlights === 2
            ? [
                [-pitchW / 2 - standDepth - 0.3, -pitchH / 2 - standDepth - 0.3],
                [pitchW / 2 + standDepth + 0.3, -pitchH / 2 - standDepth - 0.3],
              ]
            : [
                [-pitchW / 2 - standDepth - 0.3, -pitchH / 2 - standDepth - 0.3],
                [pitchW / 2 + standDepth + 0.3, -pitchH / 2 - standDepth - 0.3],
                [-pitchW / 2 - standDepth - 0.3, pitchH / 2 + standDepth + 0.3],
                [pitchW / 2 + standDepth + 0.3, pitchH / 2 + standDepth + 0.3],
              ]
          ).map(([fx, fz], i) => (
            <group key={`light-${i}`} position={[fx, 0, fz]}>
              {/* Tower */}
              <mesh position={[0, standHeight + 0.6, 0]}>
                <cylinderGeometry args={[0.04, 0.06, standHeight * 2 + 1.2, 8]} />
                <meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Light head */}
              <mesh position={[0, standHeight * 2 + 1.2, 0]}>
                <boxGeometry args={[0.3, 0.15, 0.15]} />
                <meshStandardMaterial
                  color="#ffe066"
                  emissive="#ffe066"
                  emissiveIntensity={0.8}
                />
              </mesh>
              {/* Point light */}
              <pointLight
                position={[0, standHeight * 2 + 1, 0]}
                intensity={0.3}
                distance={8}
                color="#ffe8b0"
              />
            </group>
          ))}
        </>
      )}

      {/* ── Scoreboard ────────────────────────────────────── */}
      {scoreboard && (
        <Float speed={0.5} floatIntensity={0.1}>
          <mesh position={[0, standHeight + 0.6, -pitchH / 2 - standDepth - 0.2]}>
            <boxGeometry args={[1.5, 0.5, 0.08]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* Screen face */}
          <mesh position={[0, standHeight + 0.6, -pitchH / 2 - standDepth - 0.16]}>
            <planeGeometry args={[1.3, 0.35]} />
            <meshStandardMaterial
              color="#0a0a20"
              emissive={ACCENT}
              emissiveIntensity={0.15}
            />
          </mesh>
        </Float>
      )}

      {/* ── VIP section ───────────────────────────────────── */}
      {vip && (
        <mesh position={[-pitchW / 2 - standDepth / 2, standHeight * 0.6, 0]}>
          <boxGeometry args={[standDepth * 0.3, standHeight * 0.25, pitchH * 0.4]} />
          <meshStandardMaterial
            color={ACCENT}
            transparent
            opacity={0.4}
            emissive={ACCENT}
            emissiveIntensity={0.1}
          />
        </mesh>
      )}

      {/* ── Corner screens ────────────────────────────────── */}
      {screens &&
        [
          [-pitchW / 2 - 0.3, -pitchH / 2 - 0.3, Math.PI / 4],
          [pitchW / 2 + 0.3, -pitchH / 2 - 0.3, -Math.PI / 4],
          [-pitchW / 2 - 0.3, pitchH / 2 + 0.3, -Math.PI / 4],
          [pitchW / 2 + 0.3, pitchH / 2 + 0.3, Math.PI / 4],
        ].map(([sx, sz, ry], i) => (
          <mesh
            key={`screen-${i}`}
            position={[sx, standHeight * 0.5, sz]}
            rotation={[0, ry, 0]}
          >
            <boxGeometry args={[0.5, 0.35, 0.04]} />
            <meshStandardMaterial
              color="#0a0a20"
              emissive="#4060ff"
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}

      {/* ── Ground plane ──────────────────────────────────── */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a0c" />
      </mesh>
    </group>
  );
}

/** A single stand section made of stepped rows. */
function Stand({
  position,
  width,
  rows,
  standColor,
  seatColor,
  standHeight,
  standDepth,
  flip = false,
  rotateY = 0,
}: {
  position: [number, number, number];
  width: number;
  rows: Array<{ y: number; depth: number; height: number }>;
  standColor: string;
  seatColor: string;
  standHeight: number;
  standDepth: number;
  flip?: boolean;
  rotateY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotateY, 0]}>
      {/* Stand base block */}
      <mesh position={[0, standHeight / 2, 0]}>
        <boxGeometry args={[width, standHeight, standDepth]} />
        <meshStandardMaterial color={standColor} />
      </mesh>

      {/* Seat tier layers */}
      {rows.map((row, i) => (
        <mesh
          key={i}
          position={[
            0,
            row.y + row.height / 2,
            flip ? -standDepth * 0.1 * (i / rows.length) : standDepth * 0.1 * (i / rows.length),
          ]}
        >
          <boxGeometry args={[width * 0.96, row.height * 0.8, standDepth * 0.85]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? seatColor : standColor}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Main exported component — wraps the 3D scene in a Canvas. */
export default function Stadium3D({ level }: Stadium3DProps) {
  const cameraDistance = 5 + level.tiers * 1.2;

  return (
    <div className="w-full aspect-[16/10] max-w-[720px] rounded-xl border border-gray-800 overflow-hidden bg-[#0a0a0c]">
      <Canvas
        camera={{
          position: [cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7],
          fov: 45,
          near: 0.1,
          far: 50,
        }}
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.6} />
        <directionalLight position={[-3, 6, -3]} intensity={0.3} color="#b0c4ff" />

        <StadiumModel level={level} />

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={16}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 8}
          autoRotate
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}
