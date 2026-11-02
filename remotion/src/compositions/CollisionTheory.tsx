import React from "react";
import { useCurrentFrame } from "remotion";
import { Frame } from "../Frame";
import { C, SANS, W, clamp } from "../theme";
import { AREA_H, pick } from "../shared";

const CY = 250, R = 24, HB = 29; // atom radius and half bond length
const TRIAL = 150;
const TRIALS = [
  { name: "Trial 1: slow collision", v: 1.6, a0: 333, b0: 567, orient: "v" as const, energy: 0.45, rightOrient: true, react: false },
  { name: "Trial 2: fast, but end-on", v: 4.8, a0: 150, b0: 750, orient: "h" as const, energy: 1.4, rightOrient: false, react: false },
  { name: "Trial 3: fast and side-on", v: 4.8, a0: 150, b0: 750, orient: "v" as const, energy: 1.4, rightOrient: true, react: true },
];

const Atom: React.FC<{ x: number; y: number; k: "A" | "B" }> = ({ x, y, k }) => (
  <g><circle cx={x} cy={y} r={R} fill={k === "A" ? C.green : C.gold} stroke={C.navy} strokeWidth={2} /><text x={x} y={y + 8} textAnchor="middle" fontSize={24} fontWeight={700} fill="#fff" fontFamily={SANS}>{k}</text></g>
);
const Bond: React.FC<{ x1: number; y1: number; x2: number; y2: number; o?: number; color?: string }> = ({ x1, y1, x2, y2, o = 1, color = C.navy }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={9} opacity={o} />
);

export const CollisionTheory: React.FC = () => {
  const f = useCurrentFrame();
  const idx = Math.min(2, Math.floor(f / TRIAL)), tt = f - idx * TRIAL, T = TRIALS[idx];
  const dc = T.orient === "v" ? 2 * R : 2 * HB + 2 * R;
  const tc = (T.b0 - T.a0 - dc) / (2 * T.v);
  let xA: number, xB: number;
  if (tt < tc) { xA = T.a0 + T.v * tt; xB = T.b0 - T.v * tt; }
  else if (T.react) { xA = T.a0 + T.v * tc; xB = T.b0 - T.v * tc; }
  else { const xc = T.a0 + T.v * tc, xcb = T.b0 - T.v * tc; xA = xc - T.v * (tt - tc); xB = xcb + T.v * (tt - tc); }
  const reacted = T.react && tt >= tc;
  const mix = reacted ? clamp((tt - tc) / 15) : 0, dy = reacted ? Math.min(80, Math.max(0, (tt - tc - 15) * 2.2)) : 0;
  const xm = (xA + xB) / 2, xa2 = xA + (xm - 44 - xA) * mix, xb2 = xB + (xm + 44 - xB) * mix; // the new A–B pairs spread out so their bond shows
  const atomsA = T.orient === "v" ? [[xA, CY - HB], [xA, CY + HB]] : [[xA - HB, CY], [xA + HB, CY]];
  const atomsB = T.orient === "v" ? [[xB, CY - HB], [xB, CY + HB]] : [[xB - HB, CY], [xB + HB, CY]];
  const hit = tt >= tc;
  const caption = pick(f, [
    [0, "Collision theory: a reaction needs particles to collide with enough energy…"],
    [TRIAL, "…and in the right orientation. Fast, but end-on, the atoms just bounce off."],
    [2 * TRIAL, "Enough energy (at least Eₐ) and the right orientation: bonds break and new ones form."],
    [2 * TRIAL + 100, "Collisions that meet both conditions are the only ones that lead to a reaction."],
  ]);
  const ok = (b: boolean) => (b ? "✓" : "✗");
  return (
    <Frame title="Collision theory" caption={caption}>
      <svg width={W} height={AREA_H} viewBox={`0 0 ${W} ${AREA_H}`}>
        <text x={26} y={40} fontSize={28} fontWeight={700} fill={C.navy} fontFamily={SANS}>{T.name}</text>
        <text x={26} y={72} fontSize={20} fill={C.inkSoft} fontFamily={SANS}>A–A + B–B → 2 A–B</text>
        <rect x={20} y={90} width={880} height={410} rx={10} fill="#fff" stroke={C.border} strokeWidth={2} />
        {!reacted && (<>
          <Bond x1={atomsA[0][0]} y1={atomsA[0][1]} x2={atomsA[1][0]} y2={atomsA[1][1]} />
          <Bond x1={atomsB[0][0]} y1={atomsB[0][1]} x2={atomsB[1][0]} y2={atomsB[1][1]} />
        </>)}
        {reacted && (<>
          <Bond x1={xA} y1={CY - HB} x2={xA} y2={CY + HB} o={1 - mix} />
          <Bond x1={xB} y1={CY - HB} x2={xB} y2={CY + HB} o={1 - mix} />
          <Bond x1={xa2} y1={CY - HB - dy} x2={xb2} y2={CY - HB - dy} o={mix} color={C.coral} />
          <Bond x1={xa2} y1={CY + HB + dy} x2={xb2} y2={CY + HB + dy} o={mix} color={C.coral} />
        </>)}
        {reacted ? (<>
          <Atom x={xa2} y={CY - HB - dy} k="A" /><Atom x={xb2} y={CY - HB - dy} k="B" />
          <Atom x={xa2} y={CY + HB + dy} k="A" /><Atom x={xb2} y={CY + HB + dy} k="B" />
        </>) : (<>
          <Atom x={atomsA[0][0]} y={atomsA[0][1]} k="A" /><Atom x={atomsA[1][0]} y={atomsA[1][1]} k="A" />
          <Atom x={atomsB[0][0]} y={atomsB[0][1]} k="B" /><Atom x={atomsB[1][0]} y={atomsB[1][1]} k="B" />
        </>)}
        {hit && <text x={460} y={474} textAnchor="middle" fontSize={34} fontWeight={700} fill={T.react ? C.green : C.coral} fontFamily={SANS}>{T.react ? "REACTION: 2 A–B formed" : "No reaction: the molecules bounce apart"}</text>}
        <g transform="translate(935 0)">
          <rect x={0} y={4} width={W - 935 - 26} height={AREA_H - 12} rx={10} fill="#fff" stroke={C.border} strokeWidth={2} />
          <text x={20} y={42} fontSize={23} fontWeight={700} fill={C.navy} fontFamily={SANS}>Collision energy</text>
          <rect x={30} y={270 - T.energy * 120} width={90} height={T.energy * 120} fill={T.energy >= 1 ? C.green : C.inkSoft} rx={6} />
          <line x1={20} x2={W - 935 - 46} y1={270 - 120} y2={270 - 120} stroke={C.coral} strokeWidth={3} strokeDasharray="10 7" />
          <text x={130} y={270 - 120 - 8} fontSize={22} fontWeight={700} fill={C.coral} fontFamily={SANS}>Eₐ</text>
          <line x1={20} x2={W - 935 - 46} y1={270} y2={270} stroke={C.navy} strokeWidth={2} />
          <text x={20} y={330} fontSize={21} fill={C.navy} fontFamily={SANS}>Energy ≥ Eₐ?   <tspan fontWeight={700} fill={T.energy >= 1 ? C.green : C.coral}>{ok(T.energy >= 1)} {T.energy >= 1 ? "yes" : "no"}</tspan></text>
          <text x={20} y={372} fontSize={21} fill={C.navy} fontFamily={SANS}>Right orientation? <tspan fontWeight={700} fill={T.rightOrient ? C.green : C.coral}>{ok(T.rightOrient)} {T.rightOrient ? "yes" : "no"}</tspan></text>
          <text x={20} y={430} fontSize={22} fontWeight={700} fill={C.navy} fontFamily={SANS}>Result: {hit ? (T.react ? "reaction" : "no reaction") : "…"}</text>
        </g>
      </svg>
    </Frame>
  );
};
