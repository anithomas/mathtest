import React from "react";
import { useCurrentFrame } from "remotion";
import { Frame } from "../Frame";
import { C, SANS, W, wavelengthToRgb, clamp, ease, lerp } from "../theme";
import { AREA_H, Photon, pick } from "../shared";

const R_ORB = [0, 30, 68, 110, 154, 200]; // schematic orbit radii (not to scale)
const OX = 270, OY = 276;
const EN = (n: number) => -21.8 / (n * n); // energy in 10^-19 J (E_n = -2.18e-18 J / n^2)
const ED = { x0: 640, x1: 900, top: 84, n2: 330, n1: 410 };
// n = 2 to 5 are drawn to scale; n = 1 sits far below, so the axis is broken there
const yE = (n: number) => (n === 1 ? ED.n1 : ED.top + (-EN(n) / 5.45) * (ED.n2 - ED.top));
const HC = 6.63e-34 * 3.0e8;
const lam = (hi: number, lo: number) => Math.round((HC / ((21.8 * (1 / (lo * lo) - 1 / (hi * hi))) * 1e-19)) * 1e9);

// timeline: electron is excited up (from n=2), waits, then falls back to n=2 and emits a photon
const EVENTS = [
  { hi: 3, up: [20, 60], down: [95, 130], name: "red" },
  { hi: 4, up: [170, 210], down: [245, 280], name: "blue-green" },
  { hi: 5, up: [320, 360], down: [395, 430], name: "violet" },
] as const;

const SPEC = { x0: 600, x1: 1226, y: 452, h: 54 };
const xNm = (nm: number) => lerp(SPEC.x0, SPEC.x1, (nm - 400) / 300);

export const BohrHydrogen: React.FC = () => {
  const f = useCurrentFrame();
  // electron orbit "level" as a continuous value for the radius, plus which transition is active
  let level = 2, active: (typeof EVENTS)[number] | null = null, phase: "up" | "wait" | "down" | "none" = "none";
  for (const ev of EVENTS) {
    if (f >= ev.up[0] && f < ev.up[1]) { level = lerp(2, ev.hi, ease((f - ev.up[0]) / (ev.up[1] - ev.up[0]))); active = ev; phase = "up"; }
    else if (f >= ev.up[1] && f < ev.down[0]) { level = ev.hi; active = ev; phase = "wait"; }
    else if (f >= ev.down[0] && f < ev.down[1]) { level = lerp(ev.hi, 2, ease((f - ev.down[0]) / (ev.down[1] - ev.down[0]))); active = ev; phase = "down"; }
  }
  const lo = Math.floor(level), frac = level - lo;
  const radius = lo >= 5 ? R_ORB[5] : lerp(R_ORB[lo], R_ORB[lo + 1], frac);
  const ang = f * 0.11;
  const ex = OX + radius * Math.cos(ang), ey = OY + radius * Math.sin(ang);
  const caption = pick(f, [
    [0, "In the Bohr model an electron can only have certain energies, shown as fixed levels n = 1, 2, 3…"],
    [60, "Energy absorbed: the electron jumps up. Falling back down, it emits a photon equal to the energy gap."],
    [430, "Only certain gaps exist, so only certain colours appear: a line spectrum, unique to each element."],
  ]);
  const photonParts: React.ReactNode[] = [];
  const spectrumLines: React.ReactNode[] = [];
  EVENTS.forEach((ev) => {
    const nm = lam(ev.hi, 2), color = wavelengthToRgb(nm), t = f - ev.down[1];
    const t0 = ev.down[1] - 10; // the photon leaves just as the electron settles at n = 2
    if (f >= t0 && t < 70) {
      const emitF = f - t0, dist = emitF * 5.5, a0 = 0.11 * ev.down[1];
      photonParts.push(<Photon key={`p${ev.hi}`} x={OX + (R_ORB[2] + 8 + dist) * Math.cos(a0)} y={OY + (R_ORB[2] + 8 + dist) * Math.sin(a0)} angleDeg={(a0 * 180) / Math.PI} color={color} opacity={clamp(emitF / 10) * clamp(1 - t / 60)} len={50} />);
    }
    if (f >= ev.down[1]) {
      const o = clamp((f - ev.down[1]) / 20);
      spectrumLines.push(<g key={`s${ev.hi}`} opacity={o}><line x1={xNm(nm)} x2={xNm(nm)} y1={SPEC.y} y2={SPEC.y + SPEC.h} stroke={color} strokeWidth={6} /><text x={xNm(nm)} y={SPEC.y - 10} textAnchor="middle" fontSize={19} fontWeight={700} fill={C.navy} fontFamily={SANS}>{nm} nm</text></g>);
    }
  });
  const arrows = EVENTS.map((ev) => {
    const nm = lam(ev.hi, 2), color = wavelengthToRgb(nm), x = ED.x0 + 70 + (ev.hi - 3) * 55;
    const show = f >= ev.down[0];
    const dE = (21.8 * (1 / 4 - 1 / (ev.hi * ev.hi))).toFixed(2);
    return show ? (<g key={ev.hi}><line x1={x} x2={x} y1={yE(ev.hi) + 4} y2={yE(2) - 8} stroke={color} strokeWidth={5} /><path d={`M${x - 8} ${yE(2) - 18} L${x} ${yE(2) - 4} L${x + 8} ${yE(2) - 18}`} fill={color} stroke={color} /></g>) : null;
  });
  const activeLabel = active && phase === "down" ? `n = ${active.hi} → 2: ΔE = ${(21.8 * (1 / 4 - 1 / (active.hi * active.hi))).toFixed(2)} × 10⁻¹⁹ J → ${lam(active.hi, 2)} nm` : active && phase === "up" ? `Energy absorbed: n = 2 → ${active.hi}` : "";

  return (
    <Frame title="The Bohr model and line spectra" caption={caption}>
      <svg width={W} height={AREA_H} viewBox={`0 0 ${W} ${AREA_H}`}>
        {R_ORB.slice(1).map((r, i) => (<g key={i}><circle cx={OX} cy={OY} r={r} fill="none" stroke={C.border} strokeWidth={3} /><text x={OX + r * 0.707 + 4} y={OY - r * 0.707 - 4} fontSize={17} fill={C.inkSoft} fontFamily={SANS}>n={i + 1}</text></g>))}
        <circle cx={OX} cy={OY} r={11} fill={C.gold} stroke={C.navy} strokeWidth={2} />
        <circle cx={ex} cy={ey} r={12} fill={C.blue} stroke="#fff" strokeWidth={2} />
        {photonParts}
        <text x={20} y={32} fontSize={20} fill={C.inkSoft} fontFamily={SANS}>Hydrogen atom (orbits not to scale)</text>
        <g>
          <text x={ED.x0 - 10} y={26} fontSize={22} fontWeight={700} fill={C.navy} fontFamily={SANS}>Energy levels, E<tspan baselineShift="sub" fontSize={15}>n</tspan> = −2.18×10⁻¹⁸ J / n²</text>
          {[1, 2, 3, 4, 5].map((n) => (<g key={n}><line x1={ED.x0} x2={ED.x1} y1={yE(n)} y2={yE(n)} stroke={C.navy} strokeWidth={n === Math.round(level) && phase !== "none" ? 5 : 3} /><text x={ED.x1 + 12} y={yE(n) + 6} fontSize={19} fill={C.ink} fontFamily={SANS}>n = {n}   {EN(n).toFixed(2).replace("-", "−")}</text></g>))}
          <text x={ED.x1 + 12} y={yE(1) + 28} fontSize={15} fill={C.inkSoft} fontFamily={SANS}>(energies in 10⁻¹⁹ J)</text>
          <path d={`M${ED.x0 + 60} ${yE(2) + 44} l10 -8 l-10 -8 l10 -8`} fill="none" stroke={C.inkSoft} strokeWidth={3} />
          <text x={ED.x0 + 84} y={yE(2) + 44} fontSize={16} fill={C.inkSoft} fontFamily={SANS}>axis break: n = 1 is much lower</text>
          {arrows}
          <text x={ED.x0} y={58} fontSize={20} fontWeight={700} fill={C.navy} fontFamily={SANS}>{activeLabel}</text>
        </g>
        <rect x={SPEC.x0} y={SPEC.y} width={SPEC.x1 - SPEC.x0} height={SPEC.h} fill="#111827" rx={4} />
        {spectrumLines}
        <text x={SPEC.x0} y={SPEC.y + SPEC.h + 22} fontSize={16} fill={C.inkSoft} fontFamily={SANS}>400 nm</text>
        <text x={SPEC.x1} y={SPEC.y + SPEC.h + 22} textAnchor="end" fontSize={16} fill={C.inkSoft} fontFamily={SANS}>700 nm · hydrogen emission lines</text>
      </svg>
    </Frame>
  );
};
