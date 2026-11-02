import React from "react";
import { useCurrentFrame } from "remotion";
import { Frame } from "../Frame";
import { C, SANS, W, wavelengthToRgb, clamp } from "../theme";
import { AREA_H, Photon, pick } from "../shared";

const SLAB = { x: 40, y: 380, w: 700, h: 110 };
const ANG = 38, SPEED = 7, TRAVEL = 330; // photons travel along a fixed beam direction
const dx = Math.cos((ANG * Math.PI) / 180), dy = Math.sin((ANG * Math.PI) / 180);
const RED = wavelengthToRgb(700), VIOLET = wavelengthToRgb(405);
const SLAB_ELECTRONS = Array.from({ length: 12 }, (_, i) => ({ x: SLAB.x + 60 + i * 55, y: SLAB.y + 40 + (i % 2) * 36 }));

// photon arrivals: [arrival frame, target electron index]
const RED_HITS = Array.from({ length: 10 }, (_, i) => [40 + i * 15, (i * 5) % 12] as [number, number]);
const VIOLET_HITS: [number, number][] = [[275, 3], [335, 7], [395, 10]];
const THRESH = 2.3, E_RED = 1.8, E_VIOLET = 3.1; // eV: sodium-like work function; 1240/700 and 1240/400

export const Photoelectric: React.FC = () => {
  const f = useCurrentFrame();
  const parts: React.ReactNode[] = [];
  let ejected = 0;

  RED_HITS.forEach(([ta, ei], k) => {
    const e = SLAB_ELECTRONS[ei], tx = e.x, ty = SLAB.y;
    const t = f - ta; // negative: still travelling
    const dist = -t * SPEED;
    if (dist > 0 && dist < TRAVEL) parts.push(<Photon key={`r${k}`} x={tx - dx * dist - 28 * dx} y={ty - dy * dist - 28 * dy} angleDeg={ANG} color={RED} />);
    if (t >= 0 && t < 22) parts.push(<circle key={`rb${k}`} cx={tx} cy={ty} r={6 + t * 0.9} fill="none" stroke={RED} strokeWidth={3} opacity={1 - t / 22} />);
  });
  VIOLET_HITS.forEach(([ta, ei], k) => {
    const e = SLAB_ELECTRONS[ei], tx = e.x, ty = SLAB.y;
    const t = f - ta, dist = -t * SPEED;
    if (dist > 0 && dist < TRAVEL) parts.push(<Photon key={`v${k}`} x={tx - dx * dist - 28 * dx} y={ty - dy * dist - 28 * dy} angleDeg={ANG} color={VIOLET} />);
    if (t >= 0) ejected++;
    if (t >= 0 && t < 70) {
      const ex = e.x + t * 4.2, ey = e.y - t * 5.2 + 0.035 * t * t;
      parts.push(<g key={`e${k}`} opacity={clamp(1 - (t - 50) / 20)}><circle cx={ex} cy={ey} r={11} fill={C.blue} stroke="#fff" strokeWidth={2} /><text x={ex} y={ey + 5} fontSize={14} fill="#fff" textAnchor="middle" fontFamily={SANS} fontWeight={700}>e⁻</text></g>);
    }
  });

  const redScene = f < 215, summary = f >= 440;
  const caption = pick(f, [
    [0, "Bright RED light: many photons, but each photon has too little energy to free an electron."],
    [215, "Now dim VIOLET light: only a few photons, but each one carries enough energy…"],
    [300, "…so each violet photon frees one electron. Brightness changes how many photons, not the energy of each."],
    [440, "Photon energy depends on frequency (E = hf). Below the threshold frequency, no electrons escape."],
  ]);
  const bar = (x: number, e: number, color: string, label: string, sub: string, on: boolean) => {
    const h = e * 100;
    return (<g opacity={on ? 1 : 0.4}>
      <rect x={x} y={440 - h} width={92} height={h} fill={color} rx={6} stroke={C.navy} strokeWidth={on ? 3 : 1} />
      <text x={x + 46} y={440 - h - 10} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.navy} fontFamily={SANS}>{e.toFixed(1)} eV</text>
      <text x={x + 46} y={468} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.navy} fontFamily={SANS}>{label}</text>
      <text x={x + 46} y={491} textAnchor="middle" fontSize={17} fill={C.inkSoft} fontFamily={SANS}>{sub}</text></g>);
  };
  const lightLabel = redScene ? "RED light, bright (many photons)" : "VIOLET light, dim (few photons)";

  return (
    <Frame title="The photoelectric effect" caption={caption}>
      <svg width={W} height={AREA_H} viewBox={`0 0 ${W} ${AREA_H}`}>
        <rect x={SLAB.x} y={SLAB.y} width={SLAB.w} height={SLAB.h} rx={8} fill="#cbd5e1" stroke={C.navy} strokeWidth={2} />
        <text x={SLAB.x + SLAB.w - 12} y={SLAB.y + SLAB.h - 10} textAnchor="end" fontSize={20} fill={C.navy} fontFamily={SANS} fontWeight={600}>metal surface</text>
        {SLAB_ELECTRONS.map((e, i) => { const gone = VIOLET_HITS.some(([ta, ei]) => ei === i && f >= ta); return gone ? null : <g key={i}><circle cx={e.x} cy={e.y} r={11} fill={C.blue} stroke="#fff" strokeWidth={2} /><text x={e.x} y={e.y + 5} fontSize={14} fill="#fff" textAnchor="middle" fontFamily={SANS} fontWeight={700}>e⁻</text></g>; })}
        {parts}
        {!summary && (<g><rect x={46} y={14} width={420} height={44} rx={8} fill="#fff" stroke={C.border} /><circle cx={70} cy={36} r={11} fill={redScene ? RED : VIOLET} /><text x={92} y={43} fontSize={22} fontWeight={600} fill={C.navy} fontFamily={SANS}>{lightLabel}</text></g>)}
        <text x={SLAB.x + 4} y={SLAB.y - 18} fontSize={24} fontWeight={700} fill={C.navy} fontFamily={SANS}>Electrons ejected: {ejected}</text>
        <g transform="translate(790 0)">
          <rect x={0} y={4} width={W - 790 - 26} height={AREA_H - 12} rx={10} fill="#fff" stroke={C.border} strokeWidth={2} />
          <text x={22} y={42} fontSize={24} fontWeight={700} fill={C.navy} fontFamily={SANS}>Energy of ONE photon</text>
          <line x1={20} x2={W - 790 - 46} y1={440 - THRESH * 100} y2={440 - THRESH * 100} stroke={C.coral} strokeWidth={3} strokeDasharray="10 7" />
          {["Energy needed", "to free an", "electron ≈ 2.3 eV"].map((t, i) => (<text key={i} x={256} y={440 - THRESH * 100 - 64 + i * 22} fontSize={18} fontWeight={600} fill={C.coral} fontFamily={SANS}>{t}</text>))}
          {bar(34, E_RED, RED, "Red", "700 nm", redScene || summary)}
          {bar(142, E_VIOLET, VIOLET, "Violet", "400 nm", !redScene || summary)}
          <line x1={20} x2={W - 790 - 46} y1={440} y2={440} stroke={C.navy} strokeWidth={2} />
        </g>
      </svg>
    </Frame>
  );
};
