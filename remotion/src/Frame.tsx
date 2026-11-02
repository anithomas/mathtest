import React from "react";
import { AbsoluteFill } from "remotion";
import { C, SANS, SERIF, W, H, fontCss } from "./theme";

/** Shared page chrome: brand fonts, title bar and a caption strip that stays readable without audio. */
export const Frame: React.FC<{ title: string; caption: string; children: React.ReactNode }> = ({ title, caption, children }) => (
  <AbsoluteFill style={{ background: C.surfaceAlt, fontFamily: SANS, color: C.ink }}>
    <style>{fontCss}</style>
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 78, background: C.navy, display: "flex", alignItems: "center", padding: "0 44px" }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: "#fff" }}>{title}</div>
      <div style={{ marginLeft: "auto", fontSize: 20, color: C.greenTint, letterSpacing: 0.3 }}>MathTest Trail · SCH4U</div>
    </div>
    <div style={{ position: "absolute", left: 0, top: 78, width: W, height: H - 78 - 96 }}>{children}</div>
    <div style={{ position: "absolute", left: 0, bottom: 0, width: W, height: 96, background: "#fff", borderTop: `3px solid ${C.green}`, display: "flex", alignItems: "center", padding: "0 44px", fontSize: 30, fontWeight: 500, color: C.navy, lineHeight: 1.25 }}>
      {caption}
    </div>
  </AbsoluteFill>
);
