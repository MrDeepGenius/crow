// ============================================
// PDF VECTOR IMAGE - primitivas react-pdf
// ============================================
// Dibuja GeneratedImage (VectorImageSpec) como gráficos vectoriales reales
// dentro del PDF. Los textos van como Text normal (robusto); las formas
// como primitivas Svg. Mismo contenido que el SVG de preview.

import React from "react";
import { View, Text, Svg, Rect, Circle, Polygon, Polyline, Line, Ellipse } from "@react-pdf/renderer";
import type { VectorImageSpec } from "@/app/services/images/imageTypes";

export function PdfVectorImage({
  spec,
  widthPercent,
}: {
  spec: VectorImageSpec;
  widthPercent: number;
}): React.JSX.Element {
  const p = spec.palette;
  const labels = spec.labels.slice(0, 6);
  const W = 480;
  const H = spec.kind === "cover" ? 300 : 220;

  return (
    <View style={{ marginVertical: 8, alignItems: "center" }}>
      <View style={{ width: `${widthPercent}%`, backgroundColor: p.paper, borderRadius: 6, padding: 10 }}>
        <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: p.ink, marginBottom: 6 }}>
          {spec.title}
        </Text>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Shapes spec={spec} W={W} H={H} labels={labels} />
        </Svg>
        {spec.kind !== "cover" && labels.length > 0 && (
          <View style={{ marginTop: 6 }}>
            {labels.map((l, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: [p.primary, p.secondary, p.accent][i % 3],
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 9, color: p.ink }}>{l}</Text>
              </View>
            ))}
          </View>
        )}
        {spec.subtitle ? (
          <Text style={{ fontSize: 8.5, color: p.ink, marginTop: 4 }}>{spec.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Shapes({ spec, W, H, labels }: { spec: VectorImageSpec; W: number; H: number; labels: string[] }): React.JSX.Element {
  const p = spec.palette;
  const cx = W / 2;
  const cy = H / 2;

  if (spec.kind === "funnel") {
    const stages = labels.length > 0 ? labels : ["Etapa 1", "Etapa 2", "Etapa 3"];
    const n = stages.length;
    return (
      <>
        {stages.map((_, i) => {
          const wTop = W - 40 - i * ((W - 120) / Math.max(1, n));
          const wBot = W - 40 - (i + 1) * ((W - 120) / Math.max(1, n));
          const yTop = 10 + i * ((H - 20) / n);
          const yBot = 10 + (i + 1) * ((H - 20) / n);
          const xTopL = cx - wTop / 2, xTopR = cx + wTop / 2;
          const xBotL = cx - wBot / 2, xBotR = cx + wBot / 2;
          return (
            <Polygon
              key={i}
              points={`${xTopL},${yTop} ${xTopR},${yTop} ${xBotR},${yBot} ${xBotL},${yBot}`}
              fill={i === 0 ? p.primary : i === n - 1 ? p.accent : p.secondary}
              opacity={0.92}
            />
          );
        })}
      </>
    );
  }

  if (spec.kind === "triangle") {
    const pts = `${cx},18 ${cx - 150},${H - 18} ${cx + 150},${H - 18}`;
    const nodes: [number, number][] = [[cx, 18], [cx - 150, H - 18], [cx + 150, H - 18]];
    return (
      <>
        <Polygon points={pts} fill="none" stroke={p.primary} strokeWidth={3} />
        {nodes.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={26} fill={i === 0 ? p.primary : i === 1 ? p.secondary : p.accent} />
        ))}
      </>
    );
  }

  if (spec.kind === "steps") {
    const steps = labels.length > 0 ? labels : ["Paso 1", "Paso 2", "Paso 3"];
    const n = steps.length;
    return (
      <>
        <Line x1={40} y1={cy} x2={W - 40} y2={cy} stroke={p.primary} strokeWidth={3} />
        {steps.map((_, i) => {
          const x = 40 + (i * (W - 80)) / Math.max(1, n - 1);
          return <Circle key={i} cx={x} cy={cy} r={16} fill={p.primary} />;
        })}
      </>
    );
  }

  if (spec.kind === "comparison") {
    return (
      <>
        <Rect x={20} y={10} width={W / 2 - 30} height={H - 20} rx={8} fill={p.primary} opacity={0.9} />
        <Rect x={W / 2 + 10} y={10} width={W / 2 - 30} height={H - 20} rx={8} fill={p.secondary} opacity={0.9} />
      </>
    );
  }

  if (spec.kind === "bars") {
    const rows = labels.length > 0 ? labels : ["A", "B", "C"];
    return (
      <>
        {rows.map((_, i) => {
          const y = 16 + i * ((H - 32) / rows.length);
          const w = W - 40 - i * ((W - 120) / Math.max(1, rows.length));
          return <Rect key={i} x={20} y={y} width={w} height={(H - 32) / rows.length - 10} rx={5} fill={i % 2 === 0 ? p.primary : p.secondary} opacity={0.9} />;
        })}
      </>
    );
  }

  // cover / motif: fondo + motivo geométrico según tema
  return (
    <>
      <Rect x={0} y={0} width={W} height={H} rx={6} fill={p.primary} />
      <MotifShapes spec={spec} cx={cx} cy={cy} s={1} light="#ffffff" />
    </>
  );
}

function MotifShapes({
  spec,
  cx,
  cy,
  s,
  light,
}: {
  spec: VectorImageSpec;
  cx: number;
  cy: number;
  s: number;
  light: string;
}): React.JSX.Element {
  const p = spec.palette;
  switch (spec.motif) {
    case "aperture":
      return (
        <>
          <Circle cx={cx} cy={cy} r={68 * s} fill="none" stroke={light} strokeWidth={3 * s} />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r1 = 26 * s, r2 = 62 * s;
            return (
              <Line
                key={a}
                x1={cx + r1 * Math.cos((a * Math.PI) / 180)}
                y1={cy + r1 * Math.sin((a * Math.PI) / 180)}
                x2={cx + r2 * Math.cos(((a + 40) * Math.PI) / 180)}
                y2={cy + r2 * Math.sin(((a + 40) * Math.PI) / 180)}
                stroke={light}
                strokeWidth={3 * s}
              />
            );
          })}
        </>
      );
    case "funnel":
      return (
        <>
          {[0, 1, 2].map((i) => {
            const w = 300 - i * 80;
            return <Rect key={i} x={cx - w / 2} y={cy - 60 + i * 52} width={w} height={40} rx={8} fill={light} opacity={0.95 - i * 0.2} />;
          })}
        </>
      );
    case "speech":
      return (
        <>
          <Rect x={cx - 90} y={cy - 55} width={180} height={86} rx={16} fill={light} />
          <Polygon points={`${cx - 40},${cy + 31} ${cx - 20},${cy + 31} ${cx - 34},${cy + 52}`} fill={light} />
          <Circle cx={cx - 24} cy={cy - 12} r={7} fill={p.primary} />
          <Circle cx={cx} cy={cy - 12} r={7} fill={p.primary} />
          <Circle cx={cx + 24} cy={cy - 12} r={7} fill={p.primary} />
        </>
      );
    case "pulse":
      return (
        <Polyline
          points={`${cx - 110},${cy} ${cx - 60},${cy} ${cx - 40},${cy - 44} ${cx - 20},${cy + 30} ${cx},${cy - 14} ${cx + 30},${cy} ${cx + 110},${cy}`}
          fill="none"
          stroke={light}
          strokeWidth={5}
        />
      );
    case "coins":
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Ellipse key={i} cx={cx} cy={cy + 34 - i * 26} rx={52} ry={16} fill={i === 2 ? p.accent : light} opacity={0.65 + i * 0.15} />
          ))}
        </>
      );
    default:
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Circle key={i} cx={cx} cy={cy} r={34 + i * 26} fill="none" stroke={light} strokeWidth={3} opacity={0.85 - i * 0.25} />
          ))}
        </>
      );
  }
}
