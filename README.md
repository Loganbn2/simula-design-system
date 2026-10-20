# SIMULA — Future Performance · Presentation Design System v1.0

A 1920 × 1080 presentation system (HTML + `deck-stage`). Light by default, dark for high-impact moments.

## Files

| File | What it is |
|---|---|
| `Simula Design System.html` | Explorer: foundations, components, 15 templates, guidelines (light/dark toggle) |
| `Simula Templates.html` | Library of 15 templates (navigable deck, illustrative UNO! data) |
| `simula-ds.css` | Primitive + semantic tokens (light/dark), type, grid, gradients, components |
| `simula-charts.js` | Chart renderer (`data-chart`): bars, hbars, line, stack, donut, spark, pairs, funnel |
| `deck-stage.js` | Deck component (`<deck-stage>` web component) |
| `assets/` | Simula logo, mark and map |

Open the HTML files through a local server (the explorer's iframes don't load over `file://`):

```bash
python3 -m http.server 8765
```

## Core rules (designers and AI agents)

1. **Color:** tokens only. Primary Blue `#3746CC` is the only accent blue. Cyan and lavender appear only in gradients and data. Never put Night on Primary Blue (2.88:1).
2. **Type:** Geist 400/500/600; Geist Mono for labels, axes and sources. 24px minimum on the canvas.
3. **Density:** the title carries the point (no subtitle). Max 3 blocks and ~15 words besides the title. Header = eyebrow only; footer = logo · source · page. Details go in the speaker notes.
4. **Structure:** `<section class="slide">` → `.s-head` / `.s-body` / `.s-foot`. Dark = `.dark` + `bg-midnight` (move `--glow-x/y`) or a `.curtain`.
5. **Grid:** `.g12` + `.span-N` + `.start-N`. Margins 96/80, gutter 24.
6. **Title = conclusion.** One blue point per slide. ~80% light slides.
7. **Data:** zero-based bars, shared `yMax`, direct labels, source in the footer. Never invent numbers: use `.ph`, `[XX]`, or "Illustrative data" in the footer.
8. **A gradient is an object** (strip, panel, column), never wallpaper, and never behind dense text.
9. Start by copying the closest template before building a new layout.

## Brand color names

| Name | Hex | Token |
|---|---|---|
| Primary Blue | #3746CC | `--simula-blue-500` |
| Support Blue | #3A4BCF | `--simula-blue-510` (icons and markers only) |
| Night | #00010D | `--simula-night` |
| Mist | #FAFBFF | `--neutral-50` |
| White | #FFFFFF | `--neutral-0` |

## Open brand items

- Official reversed logo file. `.logo-neg` currently derives it in CSS: the mark stays untouched and only the wordmark turns white.
- Re-export `top-geos-map-c.png` in #3746CC. It currently uses an interim hue filter.
- UNO! figures are reference/illustrative data and have not been independently verified.
