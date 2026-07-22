# folio

A minimal Astro portfolio with a WebGL water background, deployed on GitHub Pages.
Content lives as Markdown in the repo — the repo is the CMS.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to ./dist
npm run preview  # serve the built site locally
```

## Project layout

```
public/
  ocean.js                  # WebGL water renderer (vendored — see "The background" below)
src/
  layouts/Base.astro        # HTML shell: header, nav, theme toggle, ocean background
  components/OceanBackground.astro
  pages/
    index.astro             # home + project list
    about.astro
    projects/[...id].astro  # one page per project
  content/
    projects/*.md           # <-- add a file here to add a project
  content.config.ts         # project frontmatter schema
  styles/global.css
.github/workflows/deploy.yml # builds + deploys to GitHub Pages on push to main
```

## Add a project (GitHub-as-CMS)

Create `src/content/projects/my-thing.md`:

```markdown
---
title: "My Thing"
description: "One line about it."
date: 2026-08-01
tags: ["react"]
url: "https://example.com"   # optional
featured: false
---

Markdown body...
```

Commit and push. That's it.

## Deploy to GitHub Pages

1. Push this folder to its **own** GitHub repo (the Action reads `.github/`
   from the repo root, so `folio/` must be the repo root, not a subfolder).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Set `site` (and maybe `base`) in `astro.config.mjs`:
   - `<username>.github.io` repo → `site: 'https://<username>.github.io'`, no `base`.
   - any other repo name → also set `base: '/<repo>'`.
4. Push to `main`; the workflow builds and publishes.

## The background

`public/ocean.js` is adapted from the [Earendil](https://earendil.com) website
(Apache-2.0). Changes made for this project:

- Extracted just the WebGL ocean renderer (dropped the i18n / htmx / menu code).
- Made `#theme-toggle` and `#logo` optional so it runs on a bare page.

It renders into `#canvas`, toggles `.theme-night` on `<body>`, and cycles
AUTO/DARK/LIGHT via `#theme-toggle`. Keep the `LICENSE`/attribution if you
redistribute it.

### Roadmap: from ocean → lake with skipping rocks

The renderer already has a **ripple system** — this is the hook for the lake idea:

- `MAX_RIPPLES`, the `ripples[]` array, and `addRipple(x, z, time, amplitude)`.
- Ripples are currently spawned on **click** (`canvas.addEventListener('click', ...)`).

Plan:
1. **Calm the water into a lake** — fewer FBM octaves + smaller wave amplitude
   in `QUALITY_SETTINGS` and the wave shader; stronger/cleaner reflection.
2. **Automate skips** — replace the click handler with a timer that emits a
   *sequence* of ripples marching in a line (skip 1 now, skip 2 at +150ms, …),
   each with slightly smaller amplitude. Bump `MAX_RIPPLES` to fit a few throws.
3. Eventually swap in your own single-pass shader once the pieces are familiar.
