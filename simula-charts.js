/* ════════════════════════════════════════════════════════════════════
 * SIMULA — chart renderer (presentation-native, no dependencies)
 *
 * Author charts as data, not drawings:
 *   <div class="chart" data-chart='{"type":"bars","w":900,"h":420, ...}'></div>
 * The script replaces the div's content with an inline SVG styled by the
 * .ch-* classes in simula-ds.css, so every chart follows the light/dark
 * semantic tokens of the slide it sits on. Edit the numbers, reload.
 *
 * Types: bars · hbars · line · stack · donut · spark · pairs · funnel
 * Rules baked in: zero-based bar scales, one y-axis, 4px rounded data
 * ends, 2px gaps between fills, selective direct labels, blue = the point.
 * Load BEFORE deck-stage.js so the thumbnail rail clones rendered charts.
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fmt = (v, f) => {
    if (typeof f === 'function') return f(v);
    switch (f) {
      case 'int':  return Math.round(v).toLocaleString('en-US');
      case 'k':    return v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M'
                        : v >= 1e3 ? (v / 1e3).toFixed(v >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(v);
      case '$':    return '$' + v.toFixed(2);
      case '%':    return Math.round(v) + '%';
      case '%1':   return v.toFixed(1) + '%';
      case 'min':  return v + ' min';
      default:     return String(v);
    }
  };
  const svg = (w, h, body, label) =>
    `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label || '')}">${body}</svg>`;
  // Bar with 4px rounded data-end, square at the baseline
  const vbar = (x, y, w, h, cls) => {
    const r = Math.min(4, h, w / 2);
    return `<path class="${cls}" d="M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z"/>`;
  };
  const hbar = (x, y, w, h, cls) => {
    const r = Math.min(4, w, h / 2);
    return `<path class="${cls}" d="M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z"/>`;
  };
  const isHl = (c, i) => Array.isArray(c.hl) ? c.hl.includes(i) : c.hl === i;

  const R = {};

  /* Vertical bars — magnitude by category / period */
  R.bars = c => {
    const { w, h, labels, values } = c;
    const top = 56, bottom = 52, max = c.yMax || Math.max(...values);
    const ph = h - top - bottom, slot = w / values.length, bw = slot * (c.barRatio || 0.58);
    const show = c.valueLabels || 'hl';
    let b = '';
    values.forEach((v, i) => {
      const bh = Math.max(2, (v / max) * ph), x = i * slot + (slot - bw) / 2, y = top + ph - bh, hl = isHl(c, i);
      b += vbar(x, y, bw, bh, 'ch-bar' + (hl ? ' hl' : ''));
      if (show === 'all' || (show === 'hl' && hl))
        b += `<text class="ch-val${hl ? ' hl' : ''}" x="${x + bw / 2}" y="${y - 16}" text-anchor="middle">${esc((c.display && c.display[i]) || fmt(v, c.fmt))}</text>`;
      b += `<text class="ch-axis" x="${x + bw / 2}" y="${h - 14}" text-anchor="middle">${esc(labels[i])}</text>`;
    });
    b += `<line class="ch-base" x1="0" x2="${w}" y1="${top + ph}" y2="${top + ph}"/>`;
    return svg(w, h, b, c.title);
  };

  /* Horizontal bars — ranked comparison (markets, channels, benchmarks) */
  R.hbars = c => {
    const { w, rows } = c;
    const rh = c.rowH || 64, bh = c.barH || 28, lw = c.labelW || 260, vw = c.valueW || 150;
    const h = rows.length * rh, max = c.max || Math.max(...rows.map(r => r.value)), pw = w - lw - vw;
    let b = '';
    rows.forEach((r, i) => {
      const y = i * rh, hl = r.hl || isHl(c, i), bw = Math.max(3, (r.value / max) * pw);
      if (c.track) b += hbar(lw, y + (rh - bh) / 2, pw, bh, 'ch-track');
      b += `<text class="ch-label${hl ? ' hl' : ''}" x="0" y="${y + rh / 2 + 8}">${esc(r.label)}</text>`;
      b += hbar(lw, y + (rh - bh) / 2, bw, bh, 'ch-bar' + (hl ? ' hl' : ''));
      b += `<text class="ch-val${hl ? ' hl' : ''}" x="${w}" y="${y + rh / 2 + 9}" text-anchor="end">${esc(r.display || fmt(r.value, c.fmt))}</text>`;
    });
    b += `<line class="ch-base" x1="${lw}" x2="${lw}" y1="0" y2="${h}" style="stroke-width:1.5"/>`;
    return svg(w, h, b, c.title);
  };

  /* Line / area — change over time, with benchmark and annotations */
  R.line = c => {
    const { w, h, labels, series } = c;
    const left = c.left ?? 72, right = c.right ?? 24, top = 24, bottom = 52;
    const pw = w - left - right, ph = h - top - bottom;
    const all = series.flatMap(s => s.values);
    const yMin = c.yMin ?? 0, yMax = c.yMax ?? Math.max(...all);
    const X = i => left + (labels.length === 1 ? pw / 2 : (i / (labels.length - 1)) * pw);
    const Y = v => top + ph - ((v - yMin) / (yMax - yMin)) * ph;
    let b = '';
    (c.ticks || [yMin, yMax]).forEach(t => {
      b += `<line class="ch-grid" x1="${left}" x2="${w - right}" y1="${Y(t)}" y2="${Y(t)}"/>`;
      b += `<text class="ch-axis" x="${left - 16}" y="${Y(t) + 6}" text-anchor="end">${esc(fmt(t, c.fmt))}</text>`;
    });
    labels.forEach((l, i) => {
      if (c.xEvery && i % c.xEvery && i !== labels.length - 1) return;
      b += `<text class="ch-axis" x="${X(i)}" y="${h - 14}" text-anchor="middle">${esc(l)}</text>`;
    });
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [X(i), Y(v)]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
      if (s.area) {
        const id = 'ga' + Math.random().toString(36).slice(2, 8);
        b += `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--data-area-top)" style="stop-color:var(--data-area-top)"/><stop offset="1" style="stop-color:var(--data-area-bottom)"/></linearGradient></defs>`;
        b += `<path d="${d}L${pts.at(-1)[0]},${Y(yMin)}L${pts[0][0]},${Y(yMin)}Z" fill="url(#${id})"/>`;
      }
      const cls = s.kind === 'bench' ? 'ch-line bench' : s.kind === 'secondary' ? 'ch-line secondary' : 'ch-line';
      b += `<path class="${cls}" d="${d}"/>`;
      if (c.endLabels !== false && s.name) {
        const p = pts.at(-1);
        b += `<text class="ch-label${s.kind ? '' : ' hl'}" x="${p[0] + 18}" y="${p[1] + 8 + (s.labelDy || 0)}">${esc(s.name)}</text>`;
      }
      if (!s.kind) b += `<circle class="ch-dot solid" cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="9"/>`;
    });
    (c.ann || []).forEach(a => {
      const s = series[a.s || 0], x = X(a.i), y = Y(s.values[a.i]);
      const dy = a.dy ?? -96, tx = x + (a.dx || 0), ty = y + dy, anchor = a.anchor || 'middle';
      b += `<line class="ch-ann-line" x1="${x}" x2="${x}" y1="${y - 12}" y2="${ty + 30}"/>`;
      b += `<circle class="ch-dot" cx="${x}" cy="${y}" r="9"/>`;
      b += `<text class="ch-ann" x="${tx}" y="${ty - (a.sub ? 4 : -14)}" text-anchor="${anchor}">${esc(a.text)}</text>`;
      if (a.sub) b += `<text class="ch-ann-sub" x="${tx}" y="${ty + 22}" text-anchor="${anchor}">${esc(a.sub)}</text>`;
    });
    return svg(w, h, b, c.title);
  };

  /* 100% stacked bar — composition (gender, device, channel mix) */
  R.stack = c => {
    const { w, segs } = c, bh = c.barH || 56, gap = 4, tot = segs.reduce((a, s) => a + s.value, 0);
    const h = bh + (c.labels === false ? 0 : 108);
    let x = 0, b = '';
    segs.forEach((s, i) => {
      const sw = (s.value / tot) * (w - gap * (segs.length - 1));
      const cls = 'ch-seg-' + (s.tone ?? i);
      const r = 4;
      b += `<rect class="${cls}" x="${x}" y="0" width="${sw}" height="${bh}" rx="${i === 0 || i === segs.length - 1 ? r : 0}"/>`;
      if (c.labels !== false) {
        b += `<text class="ch-val ch-val-xl${i === 0 ? ' hl' : ''}" x="${x}" y="${bh + 56}">${esc(s.display || fmt(s.value, c.fmt || '%'))}</text>`;
        b += `<text class="ch-label" x="${x}" y="${bh + 94}">${esc(s.label)}</text>`;
      }
      x += sw + gap;
    });
    return svg(w, h, b, c.title);
  };

  /* Donut — share of one whole, ≤4 segments, center states the point */
  R.donut = c => {
    const size = c.size || 360, th = c.thick || 44, r = size / 2 - th / 2, C = 2 * Math.PI * r;
    const tot = c.segs.reduce((a, s) => a + s.value, 0);
    let off = 0, b = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" class="ch-track" style="stroke:var(--surface-secondary)" stroke-width="${th}"/>`;
    c.segs.forEach((s, i) => {
      const len = (s.value / tot) * C;
      b += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${th}" style="stroke:var(--${['data-primary', 'data-secondary', 'data-tertiary', 'data-neutral'][s.tone ?? i]})"
        stroke-dasharray="${Math.max(0, len - 4)} ${C - Math.max(0, len - 4)}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      off += len;
    });
    if (c.center) {
      b += `<text x="${size / 2}" y="${size / 2 + 14}" text-anchor="middle" style="font:500 ${size * 0.2}px var(--font-sans);letter-spacing:-0.04em;fill:var(--text-primary)">${esc(c.center.v)}</text>`;
      b += `<text class="ch-axis" x="${size / 2}" y="${size / 2 + 52}" text-anchor="middle">${esc(c.center.l || '')}</text>`;
    }
    return svg(size, size, b, c.title);
  };

  /* Sparkline — trend inside a KPI, no axes; dot marks the latest value */
  R.spark = c => {
    const { w, h, values } = c, p = 8;
    const mn = Math.min(...values), mx = Math.max(...values);
    const X = i => p + (i / (values.length - 1)) * (w - 2 * p), Y = v => p + (1 - (v - mn) / (mx - mn || 1)) * (h - 2 * p);
    const d = values.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
    return svg(w, h, `<path class="ch-line" style="stroke-width:3" d="${d}"/><circle class="ch-dot solid" cx="${X(values.length - 1)}" cy="${Y(values.at(-1))}" r="6"/>`, c.title);
  };

  /* Paired bars — before vs after per metric (own scale per row, labeled).
   * labelW: 0 puts the metric name above its bars instead of in a side column. */
  R.pairs = c => {
    const { w, items } = c, rh = c.rowH || 170, lw = c.labelW ?? 300, nw = 120, vw = 150, bh = 34;
    const top = lw ? 20 : 64, bx = lw + nw, pw = w - bx - vw, h = items.length * rh;
    let b = '';
    items.forEach((it, i) => {
      const y = i * rh, max = Math.max(it.a, it.b);
      b += `<text class="ch-label hl" x="0" y="${y + (lw ? 50 : 32)}" style="font-size:30px !important">${esc(it.label)}</text>`;
      if (it.note && lw) b += `<text class="ch-axis" x="0" y="${y + 84}">${esc(it.note)}</text>`;
      [['a', it.before || c.before || 'Before', 'ch-bar'], ['b', it.after || c.after || 'After', 'ch-bar hl']].forEach(([k, name, cls], j) => {
        const yy = y + top + j * (bh + 22), bw = (it[k] / max) * pw;
        b += `<text class="ch-axis" x="${lw}" y="${yy + bh / 2 + 6}">${esc(name)}</text>`;
        b += hbar(bx, yy, bw, bh, cls);
        b += `<text class="ch-val${j ? ' hl' : ''}" x="${w}" y="${yy + bh / 2 + 9}" text-anchor="end">${esc(fmt(it[k], it.fmt || c.fmt))}</text>`;
      });
      if (i < items.length - 1) b += `<line class="ch-grid" x1="0" x2="${w}" y1="${y + rh - 18}" y2="${y + rh - 18}"/>`;
    });
    return svg(w, h, b, c.title);
  };

  /* Funnel — each stage drawn as share of the PREVIOUS stage (honest when
   * volumes span orders of magnitude); absolute volume printed as text. */
  R.funnel = c => {
    const { w, stages } = c, rh = c.rowH || 96, lw = c.labelW || 280, vw = 190, bh = 40, pw = w - lw - vw - 200;
    const h = stages.length * rh;
    let b = '';
    stages.forEach((s, i) => {
      const y = i * rh, rate = i ? s.value / stages[i - 1].value : 1, last = i === stages.length - 1;
      b += `<text class="ch-label${last ? ' hl' : ''}" x="0" y="${y + rh / 2 + 8}">${esc(s.label)}</text>`;
      b += hbar(lw, y + (rh - bh) / 2, pw, bh, 'ch-track');
      b += hbar(lw, y + (rh - bh) / 2, Math.max(4, rate * pw), bh, 'ch-bar' + (last || isHl(c, i) ? ' hl' : ''));
      b += `<text class="ch-axis" x="${lw + pw + 20}" y="${y + rh / 2 + 7}">${i ? esc((rate * 100).toFixed(rate < 0.1 ? 1 : 0) + '% of prev.') : 'base'}</text>`;
      b += `<text class="ch-val${last ? ' hl' : ''}" x="${w}" y="${y + rh / 2 + 9}" text-anchor="end">${esc(s.display || fmt(s.value, c.fmt || 'k'))}</text>`;
    });
    return svg(w, h, b, c.title);
  };

  function render(root) {
    (root || document).querySelectorAll('[data-chart]').forEach(el => {
      try {
        const c = JSON.parse(el.getAttribute('data-chart'));
        if (!R[c.type]) throw new Error('unknown chart type ' + c.type);
        el.innerHTML = R[c.type](c);
        el.classList.add('chart');
      } catch (e) { el.textContent = 'Chart error: ' + e.message; console.error(e, el); }
    });
  }
  window.SimulaCharts = { render, renderers: R, fmt };
  render();
})();
