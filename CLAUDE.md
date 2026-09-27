# CACERA — Premium Chocolate Website

## Project Overview
CACERA is a luxury, handcrafted chocolate brand. This is a single-page marketing site made of **7 full-screen scroll sections** ("pages"). It must feel royal, calm, and worth the price: HD imagery, gold/cocoa palette, refined serif typography, slow cinematic motion.

**No build step.** Plain HTML + CSS + ES-module JavaScript, with libraries loaded from jsDelivr.

Run locally (ES modules need http, not `file://`):
```
npx serve .          # or: python -m http.server 8000
```

## Tech Stack
- **GSAP 3 + ScrollTrigger:** pinning, scrubbing, scroll reveals
- **Lenis:** smooth, weighted scrolling (disabled under reduced motion)
- **Google Fonts:** Cinzel, Cormorant Garamond, Manrope

## File Structure
```
index.html              – all markup (7 sections + header/footer)
css/tokens.css          – design tokens ONLY: colors, spacing, type, motion, themes
css/styles.css          – base, layout, sections, components (uses tokens only)
js/main.js              – Lenis, theme toggle, nav, loader, generic reveals, section animations
js/hero-sequence.js     – canvas frame-sequence player for the hero (HD/SD frame sets + HD opening keyframe)
assets/ezgif-frame-###.jpg  – 240 original hero frames, 720×1280 (source of truth; do not edit or rename)
assets/hero-hd/         – enhanced 1080×1608 WebP frames + keyframe-first.webp (generated from the originals)
assets/images/          – optimized WebP photography + CREDITS.md
```

## Sections (in order)
1. `#hero`: pinned, scroll-scrubbed frame sequence (bar unwraps → bursts into cocoa), 3 text beats
2. `#origin`: cocoa pods and the story of the cacao tree
3. `#features`: what makes CACERA special (small batches, ethical sourcing, pure indulgence, etc.)
4. `#craft`: bean-to-bar timeline (Harvest → Ferment → Roast → Conche → Temper)
5. `#collection`: product cards
6. `#showcase`: the owner's product photo on a sticky dark stage (slow scroll zoom), detail callouts scroll over it
7. `#reserve`: reserve/newsletter form, then `<footer>`

## Core Rules (always follow)
1. **Semantic HTML5.** Use `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<figure>`/`<figcaption>`, `<footer>`, `<ol>`/`<ul>`, `<dl>` etc. for accessibility and SEO. Each section has an `aria-labelledby` heading, and there is only one `<h1>` (in the hero). Use `<div>` only for purely presentational wrappers.
2. **8px grid.** All spacing (margin, padding, gap, offsets) must use the `--space-*` tokens, which are multiples of 8px. `--space-half` (4px) is allowed only for hairline details. Never type raw pixel spacing in `styles.css`.
3. **Respect `prefers-reduced-motion`.** Every animation (CSS transitions/keyframes, GSAP, Lenis, the hero canvas scrub, parallax and the showcase photo zoom) must check it. Under `reduce`:
   - no smooth scroll
   - no scrub or pinning (the hero shows a static key frame)
   - reveals appear instantly
   - the showcase photo stays still

   In JS, use the shared `prefersReducedMotion` media query from `main.js`.
4. **CSS variables for all colors.** Colors are defined only in `css/tokens.css`: primitives first, then semantic tokens (`--color-bg`, `--color-text`, `--color-accent`, ...). Component CSS and JS must reference semantic tokens and never hard-code hex/rgb/hsl values, so themes switch by changing tokens alone. JS reads colors with `getComputedStyle` when it needs them (e.g. the hero canvas).

## Concept-Project Labelling (required)
CACERA is a **fictional brand**, and the public site must always say so clearly:
- a "Concept Project" badge (`.concept-badge`) at the far right of the hero's opening screen, and the same badge at the right of the footer base;
- the meta description and `og:` tags mention that it is a concept / design showcase.

The reserve form sends nothing. After a valid submit it shows the thank-you panel (`[data-reserve-thanks]`), which must keep stating that no reservation was made and no details were sent or stored. Never add wording or features that imply real orders, payments or data collection.

## Brand Guidelines
- **Palette:**
  - gold (`--gold-*`): accents, hairlines, highlights, CTAs
  - cocoa browns (`--cocoa-*`): backgrounds and text
  - ivory/cream: light surfaces and dark-mode text

  Gold is an accent and should cover no more than ~10% of any view.
- **Themes:**
  - **Dark** (default): espresso backgrounds, ivory text.
  - **Light:** ivory/cream backgrounds, cocoa text, deeper gold.
  - Toggled via `data-theme` on `<html>` and persisted in `localStorage` (`cacera-theme`). The first visit follows `prefers-color-scheme`.
  - The hero and the showcase are "cinematic stages" and stay dark in both themes (they use `--stage-*` tokens).
- **Typography:**
  - **Cinzel:** wordmark, eyebrow labels, nav, buttons. Uppercase, wide letter-spacing.
  - **Cormorant Garamond:** display headings and pull quotes, weight 300–500, italic for emphasis.
  - **Manrope:** body copy and UI text, weight 300–500.

  Use the fluid `--fs-*` tokens.
- **Tone of voice:** refined, sensory, unhurried, confident. Short sentences, with no exclamation marks and no discount-store language.

## Animation Guidelines
- **Slow and calm.** Durations are 800–1600ms (`--dur-*`) with `--ease-silk` (GSAP: `power2.out` / `power3.out` / `sine.inOut`). Never use bounce, elastic or back easing.
- **The hero is the calmest part.** A long pin (~400vh) plus a lerped frame index, so even fast scrolls glide.
- **Performance:** animate only `transform` and `opacity`, and use `will-change` sparingly.
- **One reveal pattern:** add `data-reveal` to an element to get a fade-up (24px, 1.2s). Use `data-reveal-delay` for staggering.

## Assets
- **Hero frames:** the originals are `assets/ezgif-frame-001.jpg` … `240.jpg` (720×1280, letterboxed, with a "Veo" watermark). Their content crop is `{ sx: 0, sy: 104, sw: 720, sh: 1072 }`. Phases: frames 1–100 unwrap, 100–160 burst, 160–240 shattered bar.
  - **HD set** (`assets/hero-hd/frame-###.webp`): the originals cropped, lightly deblocked (blur 0.6), Lanczos-upscaled to 1080×1608, edge-sharpened (sharp: `sigma 1.2, m1 0, m2 3, x1 4`), WebP q80. It is served when the canvas is taller than 1100 device px; phones get the lighter originals. Regenerate with the same settings if the source frames change.
  - **Opening keyframe** (`assets/hero-hd/keyframe-first.webp`): the owner's HD still, which is pixel-aligned with frame 1, cropped to the same area. It is drawn over the first 10 frames and dissolves into the video.
  - If a higher-resolution export of the original video becomes available, re-extract frames from it rather than upscaling further.
- **Brand stills:** `cacera-bar-wrapped.webp` (hero poster, reduced-motion fallback and the `#showcase` product photo) and `cacera-bar-burst.webp` (`#reserve`), converted from the owner's originals in the project root. Show the product with the owner's real photography, not CG renders.
- **Photography:** Unsplash (free license), stored locally as WebP, generally ≤ ~400 KB each. Log every new image in `assets/images/CREDITS.md`. Never hotlink.
- Every `<img>` needs meaningful `alt` text (or `alt=""` if decorative), explicit `width`/`height`, and `loading="lazy"` unless it is above the fold.

## Accessibility & Performance
- AA contrast in both themes, visible `:focus-visible` rings (gold), a skip link, and `aria-pressed` on the theme toggle.
- The hero preloads its frames coarse-to-fine behind a progress loader. Its canvas loop runs only while the hero is on screen, with DPR capped at 2.
- No horizontal scroll at any width. Test at 375, 768 and 1440px.
