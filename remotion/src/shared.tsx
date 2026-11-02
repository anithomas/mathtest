import React from "react";

export const AREA_H = 546; // drawable height between the title bar and the caption strip

/** SVG path for a short wave packet of the given length, drawn along +x from the origin. */
export const waveD = (len: number, amp: number, waves: number): string => {
  const n = 48;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * len;
    const env = Math.sin((Math.PI * i) / n); // fade in/out at the ends
    const y = amp * env * Math.sin((2 * Math.PI * waves * i) / n);
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};

export const Photon: React.FC<{ x: number; y: number; angleDeg: number; color: string; opacity?: number; len?: number; amp?: number; waves?: number }> = ({ x, y, angleDeg, color, opacity = 1, len = 56, amp = 9, waves = 3 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angleDeg})`} opacity={opacity}>
    <path d={waveD(len, amp, waves)} fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" />
  </g>
);

/** Deterministic text that fades in when its frame range starts. */
export const pick = <T,>(frame: number, steps: [number, T][]): T => {
  let out = steps[0][1];
  for (const [f, v] of steps) if (frame >= f) out = v;
  return out;
};
