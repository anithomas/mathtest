# Lesson animations (Remotion)

Source for the short, silent explanatory animations shown inside SCH4U lessons. The site itself stays static: only the
rendered `SCH4U/media/*.mp4` and `*.jpg` files are deployed, so nothing here runs in a student's browser.

| Composition | Lesson | File |
| --- | --- | --- |
| `Polymerization` | 1.7 Reactions of organic compounds and polymers | `polymerization` |
| `GoldFoil` | 2.1 Atomic theory | `gold-foil` |
| `Photoelectric` | 2.2 Light, photons and the photoelectric effect | `photoelectric` |
| `BohrHydrogen` | 2.3 The Bohr model and atomic line spectra | `bohr-hydrogen` |
| `Orbitals` | 2.4 Quantum numbers and the wave-mechanical model | `orbitals` |
| `CollisionTheory` | 3.5 Reaction rates and collision theory | `collision-theory` |

## Re-render

```sh
cd remotion
pnpm install
pnpm render                       # all six (Remotion downloads its browser on first use)
pnpm render GoldFoil Orbitals     # only some
REMOTION_BROWSER=/path/to/chrome pnpm render   # use an installed Chromium instead of downloading
pnpm studio                       # live preview with a timeline
```

`pnpm render` writes `../SCH4U/media/<file>.mp4` (1280×720, 30 fps, H.264) and a `<file>.jpg` poster still. Commit both.

## Rules the animations follow

- Brand colours and fonts mirror `brand.css`; fonts are copied from `/fonts` so rendering never needs the network.
- Silent: every idea is also on screen as a caption, and each lesson shows a written description of the animation.
- The physics is real where it is drawn: alpha-particle paths are integrated from the Coulomb force, orbital dots
  are sampled from hydrogen |ψ|², and photon energies and wavelengths come from E = hf, c = λf and E_n = −2.18×10⁻¹⁸ J / n².
  Anything simplified (schematic orbit radii, one-nucleus scattering, a single d orbital) is labelled on screen.
- To add one: create `src/compositions/<Name>.tsx`, register it in `VIDEOS` in `src/Root.tsx` and `scripts/render-all.mjs`,
  render it, then add `vid:{f,alt,desc}` to the lesson in `SCH4U/index.html`.
