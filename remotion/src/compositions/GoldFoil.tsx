import React from "react";
import { useCurrentFrame } from "remotion";
import { Frame } from "../Frame";
import { C, SANS, W } from "../theme";
import { AREA_H, pick } from "../shared";

type Pt = [number, number];
const PW = 600, PH = 440, NX = 340, NY = 232; // panel size and nucleus position (panel coordinates)
const V0 = 8, K = 300, R_THOMSON = 165;

/** Velocity-Verlet integration of an alpha particle; returns one point per animation frame. */
function simulate(b: number, force: (px: number, py: number) => Pt): { pts: Pt[]; angle: number } {
  let x = 12, y = NY + b, vx = V0, vy = 0;
  const pts: Pt[] = [[x, y]];
  const dt = 0.05, sub = 20;
  let [ax, ay] = force(x, y);
  for (let f = 0; f < 150; f++) {
    for (let s = 0; s < sub; s++) {
      x += vx * dt + 0.5 * ax * dt * dt; y += vy * dt + 0.5 * ay * dt * dt;
      const [nax, nay] = force(x, y);
      vx += 0.5 * (ax + nax) * dt; vy += 0.5 * (ay + nay) * dt; ax = nax; ay = nay;
    }
    pts.push([x, y]);
    if (x < -20 || x > PW + 20 || Math.abs(y - NY) > PH / 2 + 30) break;
  }
  const angle = Math.abs((Math.atan2(vy, vx) * 180) / Math.PI);
  return { pts, angle };
}

const rutherford = (px: number, py: number): Pt => { const dx = px - NX, dy = py - NY, r2 = dx * dx + dy * dy + 1; const r3 = r2 * Math.sqrt(r2); return [(K * dx) / r3, (K * dy) / r3]; };
const thomson = (px: number, py: number): Pt => {
  const dx = px - NX, dy = py - NY, r2 = dx * dx + dy * dy, r = Math.sqrt(r2);
  if (r < R_THOMSON) return [(K * dx) / R_THOMSON ** 3, (K * dy) / R_THOMSON ** 3];
  return [(K * dx) / (r2 * r), (K * dy) / (r2 * r)];
};

const B = [-150, 105, -80, 130, -60, 7, -110, 75, -140, 48, -95, 135, -30, 1.0, 88, -125, -52, 115, -70, 4];
const SPACING = 19, START = 10;
const RUN_R = B.map((b) => simulate(b, rutherford));
const RUN_T = B.map((b) => simulate(b, thomson));

const ELECTRONS: Pt[] = Array.from({ length: 14 }, (_, i) => { const a = i * 2.399, r = 30 + 120 * Math.sqrt(((i * 37) % 14) / 14); return [NX + r * Math.cos(a), NY + r * Math.sin(a)]; });

const Panel: React.FC<{ runs: { pts: Pt[]; angle: number }[]; frame: number; mode: "thomson" | "rutherford"; x0: number }> = ({ runs, frame, mode, x0 }) => {
  let straight = 0, large = 0, back = 0;
  const parts: React.ReactNode[] = [];
  runs.forEach((run, j) => {
    const f = frame - (START + j * SPACING);
    if (f < 0) return;
    const last = run.pts.length - 1, idx = Math.min(f, last), done = f >= last;
    if (done) { if (run.angle < 10) straight++; if (run.angle >= 45) large++; if (run.angle >= 140) back++; }
    const fade = done ? Math.max(0, 1 - (f - last) / 25) : 1;
    if (fade <= 0) return;
    const tail = run.pts.slice(Math.max(0, idx - 34), idx + 1);
    parts.push(<polyline key={`t${j}`} points={tail.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.coral} strokeWidth={3} opacity={0.35 * fade} />);
    parts.push(<circle key={`a${j}`} cx={run.pts[idx][0]} cy={run.pts[idx][1]} r={7} fill={C.coral} stroke="#fff" strokeWidth={2} opacity={fade} />);
  });
  return (
    <g transform={`translate(${x0} 56)`}>
      <rect width={PW} height={PH} rx={10} fill="#fff" stroke={C.border} strokeWidth={2} />
      {mode === "thomson" ? (
        <>
          <circle cx={NX} cy={NY} r={R_THOMSON} fill="#fde7e0" stroke={C.coral} strokeWidth={2} strokeDasharray="8 6" />
          {ELECTRONS.map((p, i) => (<g key={i}><circle cx={p[0]} cy={p[1]} r={7} fill={C.blue} /><text x={p[0]} y={p[1] + 4} fontSize={10} fill="#fff" textAnchor="middle" fontFamily={SANS}>−</text></g>))}
          <text x={NX} y={NY - R_THOMSON - 14} textAnchor="middle" fontSize={22} fill={C.navy} fontFamily={SANS} fontWeight={600}>Positive charge spread through the atom</text>
        </>
      ) : (
        <>
          <circle cx={NX} cy={NY} r={R_THOMSON} fill="none" stroke={C.inkSoft} strokeWidth={2} strokeDasharray="3 8" />
          <circle cx={NX} cy={NY} r={7} fill={C.gold} stroke={C.navy} strokeWidth={2} />
          <text x={NX + 14} y={NY - 12} fontSize={20} fill={C.navy} fontFamily={SANS} fontWeight={700}>+ nucleus</text>
          <text x={NX} y={NY - R_THOMSON - 14} textAnchor="middle" fontSize={22} fill={C.navy} fontFamily={SANS} fontWeight={600}>Tiny, dense nucleus; mostly empty space</text>
        </>
      )}
      <clipPath id={`clip-${mode}`}><rect width={PW} height={PH} rx={10} /></clipPath>
      <g clipPath={`url(#clip-${mode})`}>{parts}</g>
      <rect x={22} y={PH - 100} width={250} height={84} rx={8} fill={C.surfaceAlt} stroke={C.border} />
      <text x={34} y={PH - 72} fontSize={19} fill={C.ink} fontFamily={SANS}>Almost straight (&lt; 10°): {straight}</text>
      <text x={34} y={PH - 47} fontSize={19} fill={C.ink} fontFamily={SANS}>Large angle (≥ 45°): {large}</text>
      <text x={34} y={PH - 22} fontSize={19} fill={C.ink} fontFamily={SANS}>Bounced back (≥ 140°): {back}</text>
    </g>
  );
};

export const GoldFoil: React.FC = () => {
  const frame = useCurrentFrame();
  const caption = pick(frame, [
    [0, "Thomson's model predicts alpha particles pass straight through, with only tiny deflections."],
    [130, "Rutherford's gold-foil result: most alpha particles do pass almost straight through…"],
    [270, "…but a few are deflected at large angles. Only a tiny, dense, positive nucleus can do that."],
  ]);
  return (
    <Frame title="Alpha particles and the nucleus" caption={caption}>
      <svg width={W} height={AREA_H} viewBox={`0 0 ${W} ${AREA_H}`}>
        <Panel runs={RUN_T} frame={frame} mode="thomson" x0={26} />
        <Panel runs={RUN_R} frame={frame} mode="rutherford" x0={W - PW - 26} />
        <text x={26} y={36} fontSize={26} fontWeight={700} fill={C.navy} fontFamily={SANS}>Prediction: Thomson model</text>
        <text x={W - PW - 26} y={36} fontSize={26} fontWeight={700} fill={C.navy} fontFamily={SANS}>Observation: gold foil</text>
        <text x={W / 2} y={AREA_H - 6} textAnchor="middle" fontSize={17} fill={C.inkSoft} fontFamily={SANS}>Not to scale: in the real experiment only about 1 alpha particle in 8000 bounced back.</text>
      </svg>
    </Frame>
  );
};
