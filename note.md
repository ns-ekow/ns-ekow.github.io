# Notes / backlog

## Make the skipping stone visible (deferred — cosmetic)

Right now ripples appear as if from an invisible force. We want to see the actual
stone skimming the lake.

**Decision:** go with **Option B — a 2D sprite overlay** (not an in-shader 3D stone).

- The skip generator in `public/ocean.js` (`setupSkippingRocks`) already computes each
  throw's **screen positions + timings** before converting them to world coords for the
  ripple. Reuse that: feed one "throw descriptor" to both the ripple spawner (existing)
  and a new sprite animator.
- Sprite = small pebble (SVG or 2D canvas) on a transparent, `pointer-events:none` overlay
  above `#canvas`. Animate it arcing in, dipping to each skip point (fire the ripple on
  contact), bouncing lower/closer each time, then a final plunk + sink. Shrink it as it
  nears the horizon for depth. Gate behind `prefers-reduced-motion` like the ripples.
- ~60–100 lines, self-contained in `ocean.js`, no new deps or Astro markup.

**Why not Option A (in-shader 3D stone):** high effort, and at 30–40% render scale + film
grain the stone would be a blurry few-pixel speck. Also wouldn't reflect without extra work.

**Open choices when we resume:**
1. Stone look — flat grey pebble vs. more characterful (gradient/spin/tiny shadow).
2. Faked reflection — skip for v1, or add a faint mirrored sprite below the waterline.
