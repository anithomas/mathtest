import { staticFile } from "remotion";

/** LogicManse tokens, mirrored from /brand.css so the animations match the site. */
export const C = {
  navy: "#0b1f3a",
  ink: "#334155",
  inkSoft: "#475569",
  green: "#1f6f4a",
  greenBright: "#2c8a5d",
  greenTint: "#8fd1ae",
  mint: "#e8f3ed",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  border: "#e5e7eb",
  // Supporting colours (all pass 3:1 on white; meaning is never carried by colour alone)
  coral: "#c2410c",
  gold: "#b7791f",
  blue: "#1d4ed8",
  violet: "#6d28d9",
};

export const W = 1280;
export const H = 720;
export const FPS = 30;

export const SANS = "Inter, system-ui, sans-serif";
export const SERIF = "Merriweather, Georgia, serif";

/** Self-hosted brand fonts (copied from /fonts) so rendering never touches the network. */
export const fontCss = `
@font-face{font-family:Inter;font-weight:400 700;src:url(${staticFile("fonts/Inter.woff2")}) format("woff2")}
@font-face{font-family:Merriweather;font-weight:700;src:url(${staticFile("fonts/Merriweather-Bold.woff2")}) format("woff2")}
`;

/** Approximate visible-light colour for a wavelength in nm (for spectrum lines and photons). */
export const wavelengthToRgb = (nm: number): string => {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  const f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (780 - nm) / 80 : 1;
  const c = (v: number) => Math.round(255 * Math.pow(v * f, 0.8));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (t: number) => t * t * (3 - 2 * t);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
