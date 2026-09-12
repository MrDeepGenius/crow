// ============================================
// INTERACTIVE WEB RENDERER - CROW MARKET
// ============================================
// Renderiza InteractiveWebProduct con componentes 100% funcionales.
// Sin excepciones: quiz responde, tabs cambian, acordeón abre/cierra,
// flashcards giran, vocabMatch une parejas, checklist marca, CTA navega
// y progress refleja interacciones reales completadas.

"use client";

import { createContext, useContext, useMemo, useState, type CSSProperties } from "react";
import type {
  InteractiveWebProduct,
  InteractiveWebComponent,
  InteractiveWebSection,
  HeroComponent,
  RichTextComponent,
  ImageComponent,
  CardsComponent,
  AccordionComponent,
  TabsComponent,
  QuizComponent,
  FlashcardsComponent,
  ChecklistComponent,
  ProgressComponent,
  CtaComponent,
  VocabMatchComponent,
} from "@/app/services/ai/interactiveWebTypes";

// ============================================
// CONTEXTO DE PROGRESO
// ============================================

interface ProgressCtx {
  completed: Set<string>;
  totalInteractive: number;
  markComplete: (id: string) => void;
}

const WebProgressContext = createContext<ProgressCtx>({
  completed: new Set(),
  totalInteractive: 0,
  markComplete: () => undefined,
});

function scrollToSection(sectionId: string): void {
  if (typeof document === "undefined") return;
  document.getElementById(`websec-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================
// RENDERER PRINCIPAL
// ============================================

export function InteractiveWebRenderer({ product }: { product: InteractiveWebProduct }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const b = product.branding;

  const totalInteractive = useMemo(
    () =>
      product.sections.reduce(
        (n, s) =>
          n +
          s.components.filter((c) =>
            ["quiz", "flashcards", "tabs", "accordion", "vocabMatch", "checklist"].includes(c.type)
          ).length,
        0
      ),
    [product]
  );

  const ctx: ProgressCtx = useMemo(
    () => ({
      completed,
      totalInteractive,
      markComplete: (id: string) =>
        setCompleted((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        }),
    }),
    [completed, totalInteractive]
  );

  const shell: CSSProperties = {
    background: b.backgroundColor,
    color: b.textColor,
    fontFamily: b.fontFamily,
    borderRadius: b.borderRadius,
    overflow: "hidden",
  };

  return (
    <WebProgressContext.Provider value={ctx}>
      <div style={shell}>
        <nav
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            padding: "12px 20px",
            borderBottom: `1px solid ${b.mutedColor}33`,
            background: b.surfaceColor,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          {product.sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              style={{
                border: "none",
                background: "transparent",
                color: b.mutedColor,
                fontSize: "13px",
                cursor: "pointer",
                padding: "6px 10px",
              }}
            >
              {s.title}
            </button>
          ))}
        </nav>
        {product.sections.map((s) => (
          <WebSectionView key={s.id} section={s} branding={b} />
        ))}
      </div>
    </WebProgressContext.Provider>
  );
}

function WebSectionView({
  section,
  branding: b,
}: {
  section: InteractiveWebSection;
  branding: InteractiveWebProduct["branding"];
}) {
  return (
    <section id={`websec-${section.id}`} style={{ padding: "32px 24px", scrollMarginTop: "60px" }}>
      <div style={{ color: b.primaryColor, fontSize: "12px", fontWeight: "bold", letterSpacing: "1px", marginBottom: "6px" }}>
        {String(section.order).padStart(2, "0")}
      </div>
      <h2 style={{ margin: "0 0 6px", fontSize: "24px" }}>{section.title}</h2>
      <p style={{ color: b.mutedColor, fontSize: "14px", margin: "0 0 20px" }}>{section.purpose}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {[...section.components]
          .sort((a, z) => a.order - z.order)
          .map((c) => (
            <WebComponentView key={c.id} component={c} branding={b} />
          ))}
      </div>
    </section>
  );
}

function card(b: InteractiveWebProduct["branding"]): CSSProperties {
  return {
    background: b.surfaceColor,
    border: `1px solid ${b.mutedColor}33`,
    borderRadius: b.borderRadius,
    padding: "20px",
  };
}

function primaryBtn(b: InteractiveWebProduct["branding"]): CSSProperties {
  return {
    padding: "12px 20px",
    borderRadius: Math.max(8, b.borderRadius - 4),
    border: "none",
    background: b.primaryColor,
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  };
}

function WebComponentView({
  component: c,
  branding: b,
}: {
  component: InteractiveWebComponent;
  branding: InteractiveWebProduct["branding"];
}) {
  switch (c.type) {
    case "hero": return <HeroView c={c} b={b} />;
    case "richText": return <RichTextView c={c} b={b} />;
    case "image": return <ImageView c={c} b={b} />;
    case "cards": return <CardsView c={c} b={b} />;
    case "accordion": return <AccordionView c={c} b={b} />;
    case "tabs": return <TabsView c={c} b={b} />;
    case "quiz": return <QuizView c={c} b={b} />;
    case "flashcards": return <FlashcardsView c={c} b={b} />;
    case "checklist": return <ChecklistView c={c} b={b} />;
    case "progress": return <ProgressView c={c} b={b} />;
    case "cta": return <CtaView c={c} b={b} />;
    case "vocabMatch": return <VocabMatchView c={c} b={b} />;
  }
}

function HeroView({ c, b }: { c: HeroComponent; b: InteractiveWebProduct["branding"] }) {
  return (
    <div style={{ ...card(b), background: b.primaryColor, border: "none", color: "#fff", padding: "36px 28px" }}>
      <h1 style={{ margin: "0 0 10px", fontSize: "30px" }}>{c.title}</h1>
      <p style={{ margin: "0 0 20px", fontSize: "15px", opacity: 0.9, lineHeight: 1.6 }}>{c.subtitle}</p>
      <button onClick={() => scrollToSection(c.ctaTargetSectionId)} style={{ ...primaryBtn(b), background: "#fff", color: b.primaryColor }}>
        {c.ctaLabel}
      </button>
    </div>
  );
}

function RichTextView({ c, b }: { c: RichTextComponent; b: InteractiveWebProduct["branding"] }) {
  return (
    <div style={card(b)}>
      <h3 style={{ margin: "0 0 10px", fontSize: "17px" }}>{c.heading}</h3>
      {c.paragraphs.map((p) => (
        <p key={p.slice(0, 32)} style={{ color: b.mutedColor, fontSize: "14px", lineHeight: 1.7, margin: "0 0 10px" }}>{p}</p>
      ))}
    </div>
  );
}

function ImageView({ c, b }: { c: ImageComponent; b: InteractiveWebProduct["branding"] }) {
  if (!c.src.trim()) return null;
  return (
    <figure style={{ ...card(b), margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.src} alt={c.alt} style={{ width: "100%", borderRadius: Math.max(8, b.borderRadius - 4) }} />
      {c.caption.trim() && <figcaption style={{ color: b.mutedColor, fontSize: "12px", marginTop: "8px" }}>{c.caption}</figcaption>}
    </figure>
  );
}

function CardsView({ c, b }: { c: CardsComponent; b: InteractiveWebProduct["branding"] }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: "17px" }}>{c.heading}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        {c.cards.map((x) => (
          <div key={x.title} style={card(b)}>
            <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "6px", color: b.primaryColor }}>{x.title}</div>
            <div style={{ color: b.mutedColor, fontSize: "13px", lineHeight: 1.6 }}>{x.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccordionView({ c, b }: { c: AccordionComponent; b: InteractiveWebProduct["branding"] }) {
  const { markComplete } = useContext(WebProgressContext);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      if (next.size === c.items.length) markComplete(c.id);
      return next;
    });
  };
  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: "17px" }}>{c.heading}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {c.items.map((item, i) => (
          <div key={item.title} style={card(b)}>
            <button
              onClick={() => toggle(i)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", color: b.textColor, fontWeight: "bold", fontSize: "14px", cursor: "pointer", padding: 0 }}
            >
              {item.title}
              <span style={{ color: b.primaryColor }}>{open.has(i) ? "–" : "+"}</span>
            </button>
            {open.has(i) && <div style={{ color: b.mutedColor, fontSize: "13px", lineHeight: 1.7, marginTop: "10px" }}>{item.body}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabsView({ c, b }: { c: TabsComponent; b: InteractiveWebProduct["branding"] }) {
  const { markComplete } = useContext(WebProgressContext);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));
  const select = (i: number) => {
    setActive(i);
    setSeen((prev) => {
      const next = new Set(prev).add(i);
      if (next.size === c.tabs.length) markComplete(c.id);
      return next;
    });
  };
  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: "17px" }}>{c.heading}</h3>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        {c.tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => select(i)}
            style={{
              padding: "10px 16px",
              borderRadius: Math.max(8, b.borderRadius - 4),
              border: i === active ? "none" : `1px solid ${b.mutedColor}55`,
              background: i === active ? b.primaryColor : "transparent",
              color: i === active ? "#fff" : b.mutedColor,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ ...card(b), color: b.mutedColor, fontSize: "14px", lineHeight: 1.7 }}>{c.tabs[active].body}</div>
    </div>
  );
}

function QuizView({ c, b }: { c: QuizComponent; b: InteractiveWebProduct["branding"] }) {
  const { markComplete } = useContext(WebProgressContext);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  let earned = 0;
  let total = 0;
  c.questions.forEach((q) => {
    total += 1;
    if (answers[q.id] === q.correctAnswer) earned += 1;
  });
  const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
  const verify = () => {
    setChecked(true);
    if (percent >= c.passingScore) markComplete(c.id);
  };
  return (
    <div style={card(b)}>
      <div style={{ color: b.primaryColor, fontSize: "12px", fontWeight: "bold", marginBottom: "10px" }}>
        QUIZ · {c.title} (aprobás con {c.passingScore}%)
      </div>
      {c.questions.map((q) => (
        <div key={q.id} style={{ marginBottom: "14px" }}>
          <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px" }}>{q.question}</div>
          {q.options.map((opt, idx) => (
            <label key={opt} style={{ display: "flex", gap: "10px", color: b.mutedColor, fontSize: "13px", marginBottom: "6px", cursor: "pointer" }}>
              <input type="radio" name={`${c.id}-${q.id}`} checked={answers[q.id] === idx} onChange={() => { setChecked(false); setAnswers((p) => ({ ...p, [q.id]: idx })); }} />
              {opt}
            </label>
          ))}
          {checked && (
            <div style={{ fontSize: "12px", marginTop: "6px", color: answers[q.id] === q.correctAnswer ? "#16a34a" : "#dc2626" }}>
              {q.explanation}
            </div>
          )}
        </div>
      ))}
      <button onClick={verify} style={primaryBtn(b)}>
        {checked ? `Verificado: ${percent}%` : "Verificar respuestas"}
      </button>
    </div>
  );
}

function FlashcardsView({ c, b }: { c: FlashcardsComponent; b: InteractiveWebProduct["branding"] }) {
  const { markComplete } = useContext(WebProgressContext);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const show = (i: number) => {
    setIdx((i + c.cards.length) % c.cards.length);
    setFlipped(false);
  };
  const flip = () => {
    setFlipped((f) => !f);
    setSeen((prev) => {
      const next = new Set(prev).add(idx);
      if (next.size === c.cards.length) markComplete(c.id);
      return next;
    });
  };
  const cardData = c.cards[idx];
  return (
    <div style={card(b)}>
      <div style={{ color: b.primaryColor, fontSize: "12px", fontWeight: "bold", marginBottom: "10px" }}>
        {c.title} · {idx + 1}/{c.cards.length} · vistas {seen.size}/{c.cards.length}
      </div>
      <button
        onClick={flip}
        style={{ width: "100%", padding: "32px 16px", borderRadius: Math.max(8, b.borderRadius - 4), border: `1px solid ${b.primaryColor}55`, background: flipped ? `${b.primaryColor}18` : "transparent", cursor: "pointer" }}
      >
        <div style={{ fontSize: "24px", fontWeight: "bold", color: b.textColor }}>{flipped ? cardData.back : cardData.front}</div>
        <div style={{ color: b.mutedColor, fontSize: "12px", marginTop: "8px" }}>{flipped ? "Toca para ver el inglés" : cardData.hint}</div>
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
        <button onClick={() => show(idx - 1)} style={{ ...primaryBtn(b), background: "transparent", border: `1px solid ${b.mutedColor}55`, color: b.mutedColor }}>Anterior</button>
        <button onClick={() => show(idx + 1)} style={primaryBtn(b)}>Siguiente</button>
      </div>
    </div>
  );
}

function ChecklistView({ c, b }: { c: ChecklistComponent; b: InteractiveWebProduct["branding"] }) {
  const { markComplete } = useContext(WebProgressContext);
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      if (next.size === c.items.length) markComplete(c.id);
      return next;
    });
  };
  return (
    <div style={card(b)}>
      <div style={{ color: b.primaryColor, fontSize: "12px", fontWeight: "bold", marginBottom: "10px" }}>{c.title}</div>
      {c.items.map((item, i) => (
        <label key={item} style={{ display: "flex", gap: "10px", color: b.mutedColor, fontSize: "13px", marginBottom: "8px", cursor: "pointer" }}>
          <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} />
          {item}
        </label>
      ))}
    </div>
  );
}

function ProgressView({ c, b }: { c: ProgressComponent; b: InteractiveWebProduct["branding"] }) {
  const { completed, totalInteractive } = useContext(WebProgressContext);
  const percent = totalInteractive === 0 ? 0 : Math.round((completed.size / totalInteractive) * 100);
  return (
    <div style={card(b)}>
      <div style={{ color: b.primaryColor, fontSize: "12px", fontWeight: "bold", marginBottom: "10px" }}>{c.title}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: b.mutedColor, marginBottom: "8px" }}>
        <span>{completed.size}/{totalInteractive} actividades</span>
        <strong style={{ color: b.textColor }}>{percent}%</strong>
      </div>
      <div style={{ height: "8px", borderRadius: "4px", background: `${b.mutedColor}33`, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: b.primaryColor, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

function CtaView({ c, b }: { c: CtaComponent; b: InteractiveWebProduct["branding"] }) {
  return (
    <div style={{ ...card(b), textAlign: "center", padding: "28px 20px" }}>
      <div style={{ fontWeight: "bold", fontSize: "17px", marginBottom: "8px" }}>{c.title}</div>
      <div style={{ color: b.mutedColor, fontSize: "13px", marginBottom: "16px" }}>{c.body}</div>
      <button onClick={() => scrollToSection(c.targetSectionId)} style={primaryBtn(b)}>{c.buttonLabel}</button>
    </div>
  );
}

function VocabMatchView({ c, b }: { c: VocabMatchComponent; b: InteractiveWebProduct["branding"] }) {
  const { markComplete } = useContext(WebProgressContext);
  const [pickedLeft, setPickedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ left: number; rightPos: number } | null>(null);
  const [attempts, setAttempts] = useState(0);
  // Orden derecho determinístico (rotado, sin random)
  const rightOrder = useMemo(() => c.pairs.map((_, i) => (i + 3) % c.pairs.length), [c.pairs]);
  const pickLeft = (i: number) => {
    if (matched.has(i)) return;
    setPickedLeft(i);
    setWrongPair(null);
  };
  const pickRight = (rightPos: number) => {
    if (pickedLeft === null) return;
    const leftIdx = pickedLeft;
    if (matched.has(leftIdx)) return;
    setAttempts((a) => a + 1);
    if (rightOrder[rightPos] === leftIdx) {
      setMatched((prev) => {
        const next = new Set(prev).add(leftIdx);
        if (next.size === c.pairs.length) markComplete(c.id);
        return next;
      });
      setPickedLeft(null);
      setWrongPair(null);
    } else {
      setWrongPair({ left: leftIdx, rightPos });
      setPickedLeft(null);
    }
  };
  return (
    <div style={card(b)}>
      <div style={{ color: b.primaryColor, fontSize: "12px", fontWeight: "bold", marginBottom: "6px" }}>{c.title}</div>
      <div style={{ color: b.mutedColor, fontSize: "13px", marginBottom: "12px" }}>
        {c.instruction} · {matched.size}/{c.pairs.length} · intentos {attempts}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {c.pairs.map((p, i) => {
            const isMatched = matched.has(i);
            const isWrongPick = wrongPair !== null && wrongPair.left === i && !isMatched;
            return (
              <button
                key={p.left}
                onClick={() => pickLeft(i)}
                disabled={isMatched}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: isMatched ? "1px solid #16a34a" : pickedLeft === i ? `2px solid ${b.primaryColor}` : isWrongPick ? "1px solid #dc2626" : `1px solid ${b.mutedColor}55`,
                  background: isMatched ? "#16a34a18" : isWrongPick ? "#dc262618" : "transparent",
                  color: isMatched ? "#16a34a" : isWrongPick ? "#dc2626" : b.textColor,
                  cursor: isMatched ? "default" : "pointer",
                  fontSize: "13px",
                  opacity: isMatched ? 0.7 : 1,
                }}
              >
                {p.left}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rightOrder.map((pairIdx, pos) => {
            const isMatched = matched.has(pairIdx);
            const isWrongPick = wrongPair !== null && wrongPair.rightPos === pos && !isMatched;
            return (
              <button
                key={c.pairs[pairIdx].right}
                onClick={() => pickRight(pos)}
                disabled={isMatched}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: isMatched ? "1px solid #16a34a" : isWrongPick ? "1px solid #dc2626" : `1px solid ${b.mutedColor}55`,
                  background: isMatched ? "#16a34a18" : isWrongPick ? "#dc262618" : "transparent",
                  color: isMatched ? "#16a34a" : isWrongPick ? "#dc2626" : b.textColor,
                  cursor: isMatched ? "default" : "pointer",
                  fontSize: "13px",
                  opacity: isMatched ? 0.7 : 1,
                }}
              >
                {c.pairs[pairIdx].right}
              </button>
            );
          })}
        </div>
      </div>
      {matched.size === c.pairs.length && (
        <div style={{ marginTop: "12px", color: "#16a34a", fontSize: "13px", fontWeight: "bold" }}>
          Completo en {attempts} intentos.
        </div>
      )}
    </div>
  );
}
