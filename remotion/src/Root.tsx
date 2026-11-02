import React from "react";
import { Composition, Still } from "remotion";
import { W, H, FPS } from "./theme";
import { GoldFoil } from "./compositions/GoldFoil";
import { Photoelectric } from "./compositions/Photoelectric";
import { BohrHydrogen } from "./compositions/BohrHydrogen";
import { Orbitals } from "./compositions/Orbitals";
import { Polymerization } from "./compositions/Polymerization";
import { CollisionTheory } from "./compositions/CollisionTheory";

/** One entry per lesson animation. `poster` is the frame used for the still image shown before playback. */
export const VIDEOS = [
  { id: "GoldFoil", file: "gold-foil", component: GoldFoil, frames: 420, poster: 340 },
  { id: "Photoelectric", file: "photoelectric", component: Photoelectric, frames: 480, poster: 330 },
  { id: "BohrHydrogen", file: "bohr-hydrogen", component: BohrHydrogen, frames: 540, poster: 520 },
  { id: "Orbitals", file: "orbitals", component: Orbitals, frames: 450, poster: 440 },
  { id: "Polymerization", file: "polymerization", component: Polymerization, frames: 480, poster: 215 },
  { id: "CollisionTheory", file: "collision-theory", component: CollisionTheory, frames: 480, poster: 2 * 150 + 95 },
] as const;

export const Root: React.FC = () => (
  <>
    {VIDEOS.map((v) => (
      <Composition key={v.id} id={v.id} component={v.component} durationInFrames={v.frames} fps={FPS} width={W} height={H} />
    ))}
    {VIDEOS.map((v) => (
      <Still key={`${v.id}Poster`} id={`${v.id}Poster`} component={v.component} width={W} height={H} />
    ))}
  </>
);
