import React from "react";
import { useCurrentFrame, random } from "remotion";
import { Frame } from "../Frame";
import { C, SANS, W, clamp } from "../theme";
import { AREA_H, pick } from "../shared";

type Pt = [number, number];
const N = 2600;
const gamma = (k: number, theta: number, seed: string, i: number) => { let s = 0; for (let j = 0; j < k; j++) s -= Math.log(1 - random(`${seed}-r${i}-${j}`)); return s * theta; };

/** Sample points from the real hydrogen |ψ|² for the given orbital, then project onto the x–z plane. */
function cloud(seed: string, k: number, theta: number, scale: number, angular: (c: number) => number, aMax: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; pts.length < N; i++) {
    const c = 2 * random(`${seed}-c${i}`) - 1;
    if (random(`${seed}-u${i}`) * aMax > angular(c)) continue; // rejection on the angular part
    const r = gamma(k, theta, seed, i), phi = 2 * Math.PI * random(`${seed}-p${i}`), s = Math.sqrt(1 - c * c);
    pts.push([r * s * Math.cos(phi) * scale, -r * c * scale]); // x, then z (up on screen)
  }
  return pts;
}
// radial: 1s ∝ r²e^(−2r) → Gamma(3, 1/2); 2p ∝ r⁴e^(−r) → Gamma(5, 1); 3d ∝ r⁶e^(−2r/3) → Gamma(7, 3/2)
const S = cloud("s1", 3, 0.5, 50, () => 1, 1);
const P = cloud("p2", 5, 1, 14.5, (c) => c * c, 1);
const D = cloud("d3", 7, 1.5, 6.6, (c) => (3 * c * c - 1) ** 2, 4);

const PANELS = [
  { label: "1s", sub: "l = 0 · spherical", info: "1 orbital · holds 2 e⁻", pts: S, color: C.navy, start: 20 },
  { label: "2p", sub: "l = 1 · two lobes", info: "3 orbitals · hold 6 e⁻", pts: P, color: C.green, start: 40 },
  { label: "3d", sub: "l = 2 · two lobes plus a ring", info: "5 orbitals · hold 10 e⁻", pts: D, color: C.violet, start: 60 },
];

export const Orbitals: React.FC = () => {
  const f = useCurrentFrame();
  const caption = pick(f, [
    [0, "An orbital is not a path. Each dot marks a place where the electron might be found."],
    [150, "s orbitals are spherical (l = 0), p orbitals have two lobes (l = 1), d orbitals have more complex shapes (l = 2)."],
    [300, "A subshell has 2l + 1 orbitals: 1, 3 and 5. Each orbital holds two electrons, with opposite spins."],
  ]);
  const pw = 390, gap = (W - 3 * pw) / 4;
  return (
    <Frame title="Orbitals and quantum numbers" caption={caption}>
      <svg width={W} height={AREA_H} viewBox={`0 0 ${W} ${AREA_H}`}>
        {PANELS.map((p, i) => {
          const x0 = gap + i * (pw + gap), cx = x0 + pw / 2, cy = 252;
          const shown = Math.floor(clamp((f - p.start) / 290) * N);
          return (
            <g key={p.label}>
              <rect x={x0} y={10} width={pw} height={430} rx={10} fill="#fff" stroke={C.border} strokeWidth={2} />
              <clipPath id={`oc-${i}`}><rect x={x0} y={92} width={pw} height={320} /></clipPath>
              <g clipPath={`url(#oc-${i})`}>{p.pts.slice(0, shown).map((q, j) => (<circle key={j} cx={cx + q[0]} cy={cy + q[1]} r={2.2} fill={p.color} opacity={0.55} />))}</g>
              <circle cx={cx} cy={cy} r={4} fill={C.gold} stroke={C.navy} strokeWidth={1.5} />
              <text x={x0 + 18} y={50} fontSize={34} fontWeight={700} fill={C.navy} fontFamily={SANS}>{p.label}</text>
              <text x={x0 + 18} y={80} fontSize={19} fill={C.inkSoft} fontFamily={SANS}>{p.sub}</text>
              <text x={x0 + pw / 2} y={425} textAnchor="middle" fontSize={22} fontWeight={600} fill={C.navy} fontFamily={SANS}>{p.info}</text>
            </g>
          );
        })}
        <text x={W / 2} y={478} textAnchor="middle" fontSize={21} fill={C.ink} fontFamily={SANS}>n sets the energy level · l sets the subshell · mₗ (from −l to +l) picks the orbital · mₛ = ±½ is the spin</text>
        <text x={W / 2} y={512} textAnchor="middle" fontSize={16} fill={C.inkSoft} fontFamily={SANS}>Side view of the probability cloud; panels are drawn at different scales. The 3d example shown is d(z²).</text>
      </svg>
    </Frame>
  );
};
