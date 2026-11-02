import React from "react";
import { useCurrentFrame } from "remotion";
import { Frame } from "../Frame";
import { C, SANS, W, clamp, ease, lerp } from "../theme";
import { AREA_H, pick } from "../shared";

const CY = 250;
const Atom: React.FC<{ x: number; y: number; r: number; fill: string; text: string; textColor: string; size: number; stroke?: string }> = ({ x, y, r, fill, text, textColor, size, stroke }) => (
  <g><circle cx={x} cy={y} r={r} fill={fill} stroke={stroke ?? "none"} strokeWidth={2} /><text x={x} y={y + size * 0.35} textAnchor="middle" fontSize={size} fontWeight={700} fill={textColor} fontFamily={SANS}>{text}</text></g>
);

/** Scene 1: addition polymerization of ethene. */
const Addition: React.FC<{ t: number }> = ({ t }) => {
  const nM = 4, bond = 112;
  const gap = lerp(190, bond, ease(clamp((t - 130) / 90))); // monomers slide together
  const open = ease(clamp((t - 70) / 40)); // second line of each C=C fades as the double bond opens
  const joined = ease(clamp((t - 200) / 30));
  const total = nM * bond + (nM - 1) * gap, x0 = (W - total) / 2 + 30;
  const carbons: { x: number }[] = [];
  for (let m = 0; m < nM; m++) { const xa = x0 + m * (bond + gap); carbons.push({ x: xa }, { x: xa + bond }); }
  return (
    <g>
      {Array.from({ length: nM }, (_, m) => {
        const a = carbons[2 * m].x, b = carbons[2 * m + 1].x;
        return (<g key={m}>
          <line x1={a} y1={CY - 9 + 9 * open} x2={b} y2={CY - 9 + 9 * open} stroke={C.navy} strokeWidth={6} />
          <line x1={a} y1={CY + 9 - 9 * open} x2={b} y2={CY + 9 - 9 * open} stroke={C.navy} strokeWidth={6} opacity={1 - open} />
          {[a, b].map((cx, k) => [-1, 1].map((s) => (<g key={`${k}${s}`}><line x1={cx} y1={CY} x2={cx + (k ? 38 : -38) * 0.45} y2={CY + s * 62} stroke={C.inkSoft} strokeWidth={4} /><Atom x={cx + (k ? 38 : -38) * 0.45} y={CY + s * 70} r={17} fill="#fff" stroke={C.navy} text="H" textColor={C.navy} size={19} /></g>)))}
        </g>);
      })}
      {Array.from({ length: nM - 1 }, (_, m) => (<line key={m} x1={carbons[2 * m + 1].x} y1={CY} x2={lerp(carbons[2 * m + 1].x, carbons[2 * m + 2].x, joined)} y2={CY} stroke={C.coral} strokeWidth={6} />))}
      {carbons.map((c, i) => (<Atom key={i} x={c.x} y={CY} r={25} fill={C.navy} text="C" textColor="#fff" size={26} />))}
      <text x={W / 2} y={470} textAnchor="middle" fontSize={30} fontWeight={600} fill={C.navy} fontFamily={SANS}>n CH₂=CH₂  →  −[CH₂−CH₂]ₙ−</text>
      <text x={W / 2} y={60} textAnchor="middle" fontSize={32} fontWeight={700} fill={C.navy} fontFamily={SANS}>Addition polymerisation</text>
      <text x={W / 2} y={104} textAnchor="middle" fontSize={24} fill={C.ink} fontFamily={SANS}>{t < 70 ? "n monomers of ethene, CH₂=CH₂, each with a C=C double bond" : t < 140 ? "One bond of each double bond opens…" : t < 215 ? "…and the monomers link together" : "Polyethene: −(CH₂−CH₂)ₙ−   nothing is released"}</text>
    </g>
  );
};

/** Scene 2: condensation polymerization (a diacid and a diamine release H2O at each link). */
const Condensation: React.FC<{ t: number }> = ({ t }) => {
  const labels = [["HOOC", "COOH", C.blue, "diacid"], ["H₂N", "NH₂", C.green, "diamine"], ["HOOC", "COOH", C.blue, "diacid"], ["H₂N", "NH₂", C.green, "diamine"]] as const;
  const bw = 210, bh = 74;
  const gap = lerp(110, 44, ease(clamp((t - 70) / 80)));
  const total = 4 * bw + 3 * gap, x0 = (W - total) / 2;
  const release = clamp((t - 150) / 70);
  return (
    <g>
      <text x={W / 2} y={60} textAnchor="middle" fontSize={32} fontWeight={700} fill={C.navy} fontFamily={SANS}>Condensation polymerisation</text>
      <text x={W / 2} y={104} textAnchor="middle" fontSize={24} fill={C.ink} fontFamily={SANS}>{t < 70 ? "Two different monomers: a diacid and a diamine" : t < 150 ? "Their ends approach…" : "…and each link releases a small molecule, H₂O"}</text>
      {labels.map(([l, r, col, nm], i) => {
        const x = x0 + i * (bw + gap);
        return (<g key={i}>
          <rect x={x} y={CY - bh / 2} width={bw} height={bh} rx={10} fill={col} opacity={0.14} stroke={col} strokeWidth={3} />
          <text x={x + 12} y={CY + 8} fontSize={24} fontWeight={700} fill={C.navy} fontFamily={SANS}>{l}</text>
          <text x={x + bw - 12} y={CY + 8} textAnchor="end" fontSize={24} fontWeight={700} fill={C.navy} fontFamily={SANS}>{r}</text>
          <text x={x + bw / 2} y={CY + bh / 2 + 34} textAnchor="middle" fontSize={20} fill={C.inkSoft} fontFamily={SANS}>{nm}</text>
        </g>);
      })}
      {[0, 1, 2].map((m) => {
        const jx = x0 + (m + 1) * bw + m * gap + gap / 2;
        return (<g key={m}>
          <line x1={jx - gap / 2 - 4} x2={jx + gap / 2 + 4} y1={CY} y2={CY} stroke={C.coral} strokeWidth={7} opacity={clamp((t - 130) / 30)} />
          {release > 0 && (<g opacity={1 - release * 0.8} transform={`translate(${jx} ${CY - 50 - release * 120})`}><circle r={26} fill="#fff" stroke={C.blue} strokeWidth={3} /><text y={8} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.blue} fontFamily={SANS}>H₂O</text></g>)}
        </g>);
      })}
      {t > 190 && <text x={W / 2} y={CY + 118} textAnchor="middle" fontSize={24} fontWeight={600} fill={C.coral} fontFamily={SANS}>Each new −CO−NH− (amide) link gives off one H₂O: a polyamide such as nylon</text>}
    </g>
  );
};

export const Polymerization: React.FC = () => {
  const f = useCurrentFrame();
  const scene = f < 255 ? 1 : 2, t = scene === 1 ? f : f - 255;
  const fade = scene === 1 ? clamp((255 - f) / 15) : clamp((f - 255) / 15);
  const caption = pick(f, [
    [0, "Addition polymerisation: monomers join by opening their C=C double bonds."],
    [215, "Nothing is lost, so the polymer holds every atom of its monomers."],
    [255, "Condensation polymerisation: two kinds of monomer join and release a small molecule at every link."],
    [430, "H₂O is released at each link, which tells the two types of polymer apart."],
  ]);
  return (
    <Frame title="Addition and condensation polymers" caption={caption}>
      <svg width={W} height={AREA_H} viewBox={`0 0 ${W} ${AREA_H}`}><g opacity={fade}>{scene === 1 ? <Addition t={t} /> : <Condensation t={t} />}</g></svg>
    </Frame>
  );
};
