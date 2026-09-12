// ============================================
// SVG IMAGE RENDERER - preview/editor (sin red)
// ============================================
// Convierte VectorImageSpec en SVG determinista (mismo contenido que el PDF).

import type { VectorImageSpec } from "./imageTypes";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLines(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > max) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = `${current} ${w}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function motifShapes(motif: VectorImageSpec["motif"], p: VectorImageSpec["palette"], cx: number, cy: number, s: number): string {
  switch (motif) {
    case "aperture":
      return `<g fill="none" stroke="${p.paper}" stroke-width="${3 * s}" opacity="0.9">` +
        [0, 60, 120, 180, 240, 300].map((a) => {
          const r1 = 26 * s, r2 = 62 * s;
          const x1 = cx + r1 * Math.cos((a * Math.PI) / 180), y1 = cy + r1 * Math.sin((a * Math.PI) / 180);
          const x2 = cx + r2 * Math.cos(((a + 40) * Math.PI) / 180), y2 = cy + r2 * Math.sin(((a + 40) * Math.PI) / 180);
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
        }).join("") +
        `<circle cx="${cx}" cy="${cy}" r="${68 * s}" stroke="${p.paper}" fill="none" stroke-width="${3 * s}"/></g>`;
    case "funnel":
      return [0, 1, 2].map((i) => {
        const w = (300 - i * 80) * s, y = cy - 60 * s + i * 52 * s;
        return `<rect x="${(cx - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${40 * s}" rx="${8 * s}" fill="${p.paper}" opacity="${0.95 - i * 0.2}"/>`;
      }).join("");
    case "speech":
      return `<g><rect x="${cx - 90 * s}" y="${cy - 55 * s}" width="${180 * s}" height="${86 * s}" rx="${16 * s}" fill="${p.paper}"/>` +
        `<polygon points="${cx - 40 * s},${cy + 31 * s} ${cx - 20 * s},${cy + 31 * s} ${cx - 34 * s},${cy + 52 * s}" fill="${p.paper}"/>` +
        `<text x="${cx}" y="${cy + 2 * s}" text-anchor="middle" font-size="${34 * s}" font-weight="bold" fill="${p.primary}" font-family="sans-serif">Hi</text></g>`;
    case "pulse":
      return `<polyline points="${cx - 110 * s},${cy} ${cx - 60 * s},${cy} ${cx - 40 * s},${cy - 44 * s} ${cx - 20 * s},${cy + 30 * s} ${cx},${cy - 14 * s} ${cx + 30 * s},${cy} ${cx + 110 * s},${cy}" fill="none" stroke="${p.paper}" stroke-width="${5 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "coins":
      return [0, 1, 2].map((i) => {
        const y = cy + 34 * s - i * 26 * s;
        return `<g><ellipse cx="${cx}" cy="${y}" rx="${52 * s}" ry="${16 * s}" fill="${p.paper}" opacity="${0.65 + i * 0.15}"/><ellipse cx="${cx}" cy="${y - 4 * s}" rx="${52 * s}" ry="${16 * s}" fill="${i === 2 ? p.accent : p.paper}"/></g>`;
      }).join("");
    default:
      return [0, 1, 2].map((i) => `<circle cx="${cx}" cy="${cy}" r="${(34 + i * 26) * s}" fill="none" stroke="${p.paper}" stroke-width="${3 * s}" opacity="${0.85 - i * 0.25}"/>`).join("");
  }
}

export function svgForImage(spec: VectorImageSpec): string {
  const p = spec.palette;
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" font-family="sans-serif">`;
  const bg = `<rect width="800" height="450" fill="${p.paper}"/>`;
  const foot = `</svg>`;

  if (spec.kind === "cover") {
    const titleLines = wrapLines(spec.title, 18);
    const sub = wrapLines(spec.subtitle, 42);
    const author = spec.notes[0] ?? "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800" font-family="sans-serif">` +
      `<rect width="600" height="800" fill="${p.primary}"/>` +
      `<rect y="560" width="600" height="240" fill="${p.ink}" opacity="0.18"/>` +
      motifShapes(spec.motif, { ...p, paper: "#ffffff" }, 300, 300, 1.4) +
      `<text x="48" y="540" font-size="15" fill="#ffffff" opacity="0.85">CROW MARKET</text>` +
      titleLines.map((l, i) => `<text x="48" y="${590 + i * 44}" font-size="40" font-weight="bold" fill="#ffffff">${esc(l)}</text>`).join("") +
      sub.map((l, i) => `<text x="48" y="${600 + titleLines.length * 44 + i * 22}" font-size="16" fill="#ffffff" opacity="0.9">${esc(l)}</text>`).join("") +
      `<text x="48" y="748" font-size="14" fill="#ffffff">${esc(author)}</text>` +
      `</svg>`;
  }

  const title = `<text x="40" y="52" font-size="24" font-weight="bold" fill="${p.ink}">${esc(spec.title)}</text>` +
    (spec.subtitle ? `<text x="40" y="76" font-size="13" fill="${p.ink}" opacity="0.65">${esc(spec.subtitle)}</text>` : "");
  const labels = spec.labels.slice(0, 6);

  if (spec.kind === "funnel") {
    const stages = labels.length > 0 ? labels : ["Etapa 1", "Etapa 2", "Etapa 3"];
    const body = stages.map((l, i) => {
      const w = 560 - i * (440 / stages.length);
      const y = 120 + i * 62;
      return `<rect x="${(400 - w / 2).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="50" rx="10" fill="${i === 0 ? p.primary : i === stages.length - 1 ? p.accent : p.secondary}" opacity="${0.9}"/>` +
        `<text x="400" y="${y + 31}" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">${esc(l)}</text>`;
    }).join("");
    return head + bg + title + body + foot;
  }

  if (spec.kind === "triangle") {
    const nodes = [labels[0] ?? "Apertura", labels[1] ?? "Velocidad", labels[2] ?? "ISO"];
    const pts: [number, number][] = [[400, 140], [220, 360], [580, 360]];
    const lines = `<polygon points="400,140 220,360 580,360" fill="none" stroke="${p.primary}" stroke-width="3"/>`;
    const circles = pts.map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="58" fill="${i === 0 ? p.primary : i === 1 ? p.secondary : p.accent}"/>` +
      wrapLines(nodes[i], 10).map((l, k) => `<text x="${x}" y="${y - 6 + k * 15}" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">${esc(l)}</text>`).join("")
    ).join("");
    return head + bg + title + lines + circles + foot;
  }

  if (spec.kind === "steps") {
    const steps = labels.length > 0 ? labels : ["Paso 1", "Paso 2", "Paso 3"];
    const body = steps.map((l, i) => {
      const y = 130 + i * 58;
      return `<circle cx="80" cy="${y}" r="20" fill="${p.primary}"/><text x="80" y="${y + 6}" text-anchor="middle" font-size="16" font-weight="bold" fill="#ffffff">${i + 1}</text>` +
        `<text x="115" y="${y + 6}" font-size="15" fill="${p.ink}">${esc(l)}</text>`;
    }).join("");
    return head + bg + title + body + foot;
  }

  if (spec.kind === "comparison") {
    const half = Math.ceil(labels.length / 2);
    const left = labels.slice(0, half);
    const right = labels.slice(half);
    const col = (items: string[], x: number, color: string, heading: string) =>
      `<text x="${x}" y="120" font-size="15" font-weight="bold" fill="${color}">${esc(heading)}</text>` +
      items.map((l, i) => `<text x="${x}" y="${148 + i * 30}" font-size="14" fill="${p.ink}">• ${esc(l)}</text>`).join("");
    return head + bg + title + col(left, 60, p.primary, "Opción A") + col(right, 430, p.secondary, "Opción B") + foot;
  }

  if (spec.kind === "bars") {
    const rows = labels.length > 0 ? labels : ["Elemento 1", "Elemento 2", "Elemento 3"];
    const body = rows.map((l, i) => {
      const y = 125 + i * 56;
      return `<rect x="60" y="${y}" width="42" height="42" rx="8" fill="${p.primary}"/><text x="81" y="${y + 28}" text-anchor="middle" font-size="18" font-weight="bold" fill="#ffffff">${i + 1}</text>` +
        `<text x="120" y="${y + 27}" font-size="15" fill="${p.ink}">${esc(l)}</text>`;
    }).join("");
    return head + bg + title + body + foot;
  }

  // motif / illustration / editorial / decorative / infographic / chapterCover
  return head + bg + title +
    `<rect x="40" y="110" width="720" height="260" rx="16" fill="${p.primary}"/>` +
    motifShapes(spec.motif, { ...p, paper: "#ffffff" }, 400, 240, 1.1) +
    (spec.notes[0] ? `<text x="40" y="405" font-size="13" fill="${p.ink}" opacity="0.7">${esc(spec.notes[0])}</text>` : "") +
    foot;
}
