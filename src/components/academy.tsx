import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Dataset } from "../lib/analyze";
import {
  askMentor, buildPlaybook, CHAT_SUGGESTIONS, LEVELS, mentorGreeting,
  type ChartGlyphKind, type FormulaItem, type Level, type MentorModule,
  type MentorSection, type PlatformInfo,
} from "../lib/mentor";
import { CodeBlock } from "./code";
import {
  IconAlert, IconArrowLeft, IconCap, IconChat, IconCheck, IconChevronRight,
  IconSend, IconSpark, IconX, Reveal,
} from "./ui";
import { IMAGE_ALIAS, MENTOR_AVATAR, MODULE_IMAGES } from "../lib/images";

/* ---------------- typewriter ---------------- */

function TypedText({ text, speed = 14, step = 2, className = "" }: { text: string; speed?: number; step?: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return Math.min(text.length, v + step);
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, step]);
  return (
    <span className={className}>
      {text.slice(0, n)}
      {n < text.length && <span className="blink text-teal">▍</span>}
    </span>
  );
}

/* ---------------- avatar do mentor ---------------- */

function MentorAvatar({ size = 56 }: { size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className="relative shrink-0 rounded-full border border-teal/40 bg-teal/[0.07] flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size, boxShadow: "0 0 34px -6px rgba(62,220,180,0.35)" }}
    >
      {broken ? (
        <svg
          viewBox="0 0 32 32"
          style={{ width: size * 0.56, height: size * 0.56 }}
          fill="none" stroke="#3edcb4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M16 4 29 27H3L16 4Z" />
          <path d="M16 12v15" opacity="0.65" strokeWidth="1.3" />
          <path d="M16 12 8 27M16 12l8 15" opacity="0.4" strokeWidth="1.1" />
        </svg>
      ) : (
        <img src={MENTOR_AVATAR} alt="Mentor Anthony.ia" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      )}
      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-teal border-2 border-abyss pulse-dot z-10" />
    </div>
  );
}

/* ---------------- glifos de gráfico ---------------- */

function ChartGlyph({ kind }: { kind: ChartGlyphKind }) {
  const C = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "line":
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-9" {...C}>
          <path d="M7 34V6M7 34h43" opacity="0.3" strokeWidth="1.4" />
          <path d="M10 28 20 21 30 25 40 13 48 9" />
          <circle cx="48" cy="9" r="2.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "bars":
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-9" {...C} strokeWidth="6">
          <path d="M10 9h36M10 20h26M10 31h17" />
        </svg>
      );
    case "hist":
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-9" {...C} strokeWidth="6">
          <path d="M11 34v-9M19 34V17M27 34V8M35 34V19M43 34v-6" />
          <path d="M5 34h46" opacity="0.3" strokeWidth="1.4" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-9" {...C}>
          <path d="M5 20h9M32 20h11" />
          <rect x="14" y="11" width="18" height="18" rx="1.5" />
          <path d="M23 11v18" strokeWidth="2.4" />
          <circle cx="49" cy="11" r="2.4" fill="var(--color-coral)" stroke="none" />
        </svg>
      );
    case "scatter":
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-9" {...C}>
          <path d="M10 33 46 9" opacity="0.45" strokeDasharray="3 4" />
          <circle cx="14" cy="29" r="2.3" fill="currentColor" stroke="none" />
          <circle cx="21" cy="26" r="2.3" fill="currentColor" stroke="none" />
          <circle cx="27" cy="21" r="2.3" fill="currentColor" stroke="none" />
          <circle cx="34" cy="18" r="2.3" fill="currentColor" stroke="none" />
          <circle cx="41" cy="12" r="2.3" fill="currentColor" stroke="none" />
          <circle cx="44" cy="30" r="2.6" fill="var(--color-coral)" stroke="none" />
        </svg>
      );
    case "donut":
      return (
        <svg viewBox="0 0 56 40" className="w-12 h-9" {...C}>
          <circle cx="28" cy="20" r="12" strokeWidth="7" opacity="0.22" />
          <circle cx="28" cy="20" r="12" strokeWidth="7" strokeDasharray="47 29" transform="rotate(-90 28 20)" />
        </svg>
      );
  }
}

/* ---------------- fórmulas ---------------- */

function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="inline-flex flex-col items-center align-middle px-1">
      <span className="px-1 leading-tight">{top}</span>
      <span className="w-full border-t border-mut" />
      <span className="px-1 pt-0.5 leading-tight">{bottom}</span>
    </span>
  );
}

function FormulaView({ f }: { f: FormulaItem }) {
  switch (f.id) {
    case "mean":
      return (
        <span className="font-mono text-lg md:text-xl text-tealhi inline-flex items-center">
          μ&thinsp;=&thinsp;<Frac top="x₁ + x₂ + … + xₙ" bottom="n" />
        </span>
      );
    case "median":
      return (
        <span className="font-mono text-lg md:text-xl text-tealhi inline-flex items-center">
          x̃&thinsp;=&thinsp;valor na posição&thinsp;<Frac top="n + 1" bottom="2" />&thinsp;da série ordenada
        </span>
      );
    case "std":
      return (
        <span className="font-mono text-lg md:text-xl text-tealhi inline-flex items-center">
          σ&thinsp;=&thinsp;√(&thinsp;<Frac top="Σ (xᵢ − μ)²" bottom="n" />&thinsp;)
        </span>
      );
    case "iqr":
      return (
        <span className="font-mono text-base md:text-lg text-tealhi flex flex-col gap-2 items-center leading-relaxed">
          <span>IQR&thinsp;=&thinsp;Q₃ − Q₁</span>
          <span className="text-mut text-sm md:text-base">cercas&thinsp;=&thinsp;[&thinsp;Q₁ − 1,5·IQR&thinsp;;&thinsp;Q₃ + 1,5·IQR&thinsp;]</span>
        </span>
      );
    case "pct":
      return (
        <span className="font-mono text-lg md:text-xl text-tealhi inline-flex items-center">
          Δ%&thinsp;=&thinsp;<Frac top="novo − antigo" bottom="antigo" />&thinsp;×&thinsp;100
        </span>
      );
    case "pearson":
      return (
        <span className="font-mono text-base md:text-lg text-tealhi inline-flex items-center">
          r&thinsp;=&thinsp;
          <Frac
            top="Σ (xᵢ − x̄)(yᵢ − ȳ)"
            bottom={<span>√(&thinsp;Σ(xᵢ − x̄)² · Σ(yᵢ − ȳ)²&thinsp;)</span>}
          />
        </span>
      );
  }
}

/* ---------------- seções do módulo ---------------- */

const TONE = {
  warn: { color: "var(--color-amber)", border: "border-amber/35", bg: "bg-amber/[0.06]", Icon: IconAlert },
  good: { color: "var(--color-teal)", border: "border-teal/35", bg: "bg-teal/[0.06]", Icon: IconCheck },
  info: { color: "var(--color-sky)", border: "border-sky/35", bg: "bg-sky/[0.06]", Icon: IconSpark },
} as const;

function Label({ children, color = "text-dim" }: { children: ReactNode; color?: string }) {
  return <p className={`font-mono text-[9px] uppercase tracking-[0.22em] ${color} mb-1`}>{children}</p>;
}

function SectionView({ s }: { s: MentorSection }) {
  if (s.kind === "code") {
    return (
      <Reveal>
        <CodeBlock lang={s.lang} title={s.title} caption={s.caption} code={s.code} />
      </Reveal>
    );
  }

  if (s.kind === "list") {
    return (
      <Reveal>
        <div className="card-static p-5">
          <h4 className="font-display font-semibold text-[16px] tracking-tight mb-4">{s.title}</h4>
          <div className="space-y-3.5">
            {s.items.map((it, i) => (
              <div key={i} className="flex gap-3.5 group">
                <span className="font-display font-bold text-[15px] text-teal/70 group-hover:text-teal transition-colors shrink-0 w-6 text-right">
                  {i + 1}.
                </span>
                <p className="text-[13.5px] text-mut leading-relaxed">
                  <strong className="text-ink font-semibold">{it.strong}</strong>
                  {" — "}
                  {it.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    );
  }

  if (s.kind === "tip") {
    const t = TONE[s.tone];
    const Icon = t.Icon;
    return (
      <Reveal>
        <div className={`rounded-[10px] border ${t.border} ${t.bg} p-4 flex gap-3.5`}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ color: t.color, borderColor: `color-mix(in srgb, ${t.color} 27%, transparent)`, background: `color-mix(in srgb, ${t.color} 7%, transparent)` }}>
            <Icon className="w-4 h-4" />
          </span>
          <div>
            <p className="font-semibold text-[14px] tracking-tight" style={{ color: t.color }}>{s.title}</p>
            <p className="text-[13.5px] text-mut leading-relaxed mt-1">{s.text}</p>
          </div>
        </div>
      </Reveal>
    );
  }

  if (s.kind === "charts") {
    return (
      <Reveal>
        <div>
          <h4 className="font-display font-semibold text-[16px] tracking-tight mb-4">{s.title}</h4>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {s.picks.map((p) => (
              <div key={p.name} className="card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-14 h-10 rounded-md border border-line bg-abyss/60 flex items-center justify-center text-teal shrink-0">
                    <ChartGlyph kind={p.glyph} />
                  </span>
                  <h5 className="font-display font-semibold text-[15px] tracking-tight leading-tight">{p.name}</h5>
                </div>
                <div>
                  <Label>quando usar</Label>
                  <p className="text-[12.5px] text-mut leading-relaxed">{p.when}</p>
                </div>
                <div>
                  <Label color="text-teal/80">por que funciona</Label>
                  <p className="text-[12.5px] text-mut leading-relaxed">{p.why}</p>
                </div>
                <div className="border-l-2 border-coral/60 pl-3 mt-auto">
                  <Label color="text-coral/90">erro de júnior</Label>
                  <p className="text-[12.5px] text-mut leading-relaxed">{p.mistake}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    );
  }

  if (s.kind === "picks") {
    return (
      <Reveal>
        <div className="card-static overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line flex items-center gap-2.5">
            <IconSpark className="w-4 h-4 text-teal" />
            <h4 className="font-display font-semibold text-[15px] tracking-tight">{s.title}</h4>
            <span className="font-mono text-[9px] uppercase tracking-widest text-teal border border-teal/30 bg-teal/[0.08] rounded px-1.5 py-0.5 ml-auto">
              calculado no seu dado
            </span>
          </div>
          <div className="divide-y divide-line">
            {s.items.map((it, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5 hover:bg-panel2 transition-colors">
                <span className="font-mono text-[11px] text-tealhi border border-teal/30 bg-teal/[0.07] rounded px-2 py-0.5">{it.col}</span>
                <IconChevronRight className="w-3.5 h-3.5 text-dim shrink-0" />
                <span className="font-mono text-[11px] text-amber border border-amber/30 bg-amber/[0.07] rounded px-2 py-0.5">{it.chart}</span>
                <p className="flex-1 min-w-[220px] text-[12.5px] text-mut leading-relaxed">{it.why}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    );
  }

  /* plataformas de visualização */
  if (s.kind === "platform") {
    return (
      <Reveal>
        <div>
          <h4 className="font-display font-semibold text-[16px] tracking-tight mb-4">{s.title}</h4>
          <div className="grid lg:grid-cols-2 gap-4">
            {s.items.map((pl) => (
              <PlatformCard key={pl.name} p={pl} />
            ))}
          </div>
        </div>
      </Reveal>
    );
  }

  /* formulas */
  return (
    <Reveal>
      <div>
        <h4 className="font-display font-semibold text-[16px] tracking-tight mb-4">{s.title}</h4>
        <div className="grid md:grid-cols-2 gap-4">
          {s.items.map((fm) => (
            <div key={fm.id} className="card p-5 flex flex-col">
              <h5 className="font-display font-semibold text-[15px] tracking-tight">{fm.name}</h5>
              <div className="my-4 py-4 rounded-lg bg-abyss/60 border border-line flex items-center justify-center min-h-[76px] overflow-x-auto">
                <FormulaView f={fm} />
              </div>
              <p className="text-[13px] text-mut leading-relaxed">{fm.explain}</p>
              <div className="mt-3 rounded-md border border-teal/25 bg-teal/[0.05] px-3.5 py-3">
                <Label color="text-teal/80">exemplo aplicado</Label>
                <p className="font-mono text-[11.5px] text-tealhi/90 leading-relaxed">{fm.example}</p>
              </div>
              <p className="mt-3 text-[12px] text-amber/90 leading-relaxed flex gap-2">
                <IconAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {fm.rule}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* ---------------- plataformas de visualização ---------------- */

function PlatformGlyph({ kind }: { kind: PlatformInfo["glyph"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const };
  return (
    <span className="w-9 h-9 rounded-md border border-line2 bg-abyss/60 flex items-center justify-center text-tealhi shrink-0">
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        {kind === "tableau" && (
          <g {...common}>
            <circle cx="6" cy="6" r="2.4" /> <circle cx="18" cy="6" r="2.4" />
            <circle cx="6" cy="18" r="2.4" /> <circle cx="18" cy="18" r="2.4" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" opacity="0.85" />
          </g>
        )}
        {kind === "powerbi" && (
          <g {...common}>
            <path d="M5 19V12" /> <path d="M10 19V6" /> <path d="M15 19V10" /> <path d="M20 19V3" opacity="0.55" />
            <path d="M3 19h18" opacity="0.5" />
          </g>
        )}
        {kind === "looker" && (
          <g {...common}>
            <path d="M4 9l8-4 8 4-8 4-8-4Z" />
            <path d="M4 14l8 4 8-4" opacity="0.6" />
          </g>
        )}
        {kind === "sigma" && (
          <g {...common}>
            <path d="M18 6H7l6 6-6 6h11" />
          </g>
        )}
        {kind === "metabase" && (
          <g fill="currentColor" stroke="none">
            <circle cx="7" cy="7" r="1.8" /> <circle cx="12" cy="7" r="1.8" opacity="0.7" /> <circle cx="17" cy="7" r="1.8" opacity="0.4" />
            <circle cx="7" cy="12" r="1.8" opacity="0.7" /> <circle cx="12" cy="12" r="1.8" /> <circle cx="17" cy="12" r="1.8" opacity="0.7" />
            <circle cx="7" cy="17" r="1.8" opacity="0.4" /> <circle cx="12" cy="17" r="1.8" opacity="0.7" /> <circle cx="17" cy="17" r="1.8" />
          </g>
        )}
      </svg>
    </span>
  );
}

function PlatformCard({ p }: { p: PlatformInfo }) {
  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-start gap-3.5">
        <PlatformGlyph kind={p.glyph} />
        <div className="min-w-0">
          <h5 className="font-display font-bold text-[16px] tracking-tight leading-tight">{p.name}</h5>
          <p className="text-[12px] text-mut mt-0.5 leading-snug">{p.tagline}</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div className="rounded-md border border-teal/25 bg-teal/[0.04] p-3">
          <Label color="text-teal/80">onde ganha</Label>
          <ul className="mt-1.5 space-y-1.5">
            {p.pros.map((x) => (
              <li key={x} className="flex gap-1.5 text-[11.5px] text-mut leading-snug">
                <span className="text-teal font-bold shrink-0">+</span>{x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-coral/25 bg-coral/[0.04] p-3">
          <Label color="text-coral/80">onde dói</Label>
          <ul className="mt-1.5 space-y-1.5">
            {p.cons.map((x) => (
              <li key={x} className="flex gap-1.5 text-[11.5px] text-mut leading-snug">
                <span className="text-coral font-bold shrink-0">−</span>{x}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-mut leading-relaxed">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-sky mr-2">escolha quando</span>
        {p.when}
      </p>
      <p className="mt-3 pt-3 border-t border-line text-[12.5px] text-ink/90 leading-relaxed italic">
        “{p.verdict}”
      </p>
    </div>
  );
}

/* ---------------- bolha do mentor ---------------- */

function MentorBubble({ text }: { text: string }) {
  return (
    <div className="card-static mt-6 p-4 md:p-5 flex gap-4 border-l-2 border-l-teal/70">
      <MentorAvatar size={42} />
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-teal">mentor anthony.ia</span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] text-dim">
            <span className="w-1.5 h-1.5 rounded-full bg-teal pulse-dot inline-block" /> respondendo
          </span>
        </div>
        <p className="text-[13.5px] md:text-sm text-mut leading-relaxed mt-2">
          <TypedText text={text} key={text.slice(0, 24)} speed={10} step={3} />
        </p>
      </div>
    </div>
  );
}

/* ---------------- módulo ---------------- */

function ModuleBanner({ m }: { m: MentorModule }) {
  const [broken, setBroken] = useState(false);
  const img = MODULE_IMAGES[m.id] ?? MODULE_IMAGES[IMAGE_ALIAS[m.id] ?? ""];
  return (
    <div className="relative h-40 md:h-52 rounded-[12px] overflow-hidden border border-line group">
      <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, var(--color-panel2), var(--color-abyss) 55%, var(--color-panel))" }} />
      {img && !broken && (
        <img
          src={img}
          alt=""
          onError={() => setBroken(true)}
          className="absolute inset-0 w-full h-full object-cover opacity-95 transition-transform duration-[2800ms] ease-out group-hover:scale-[1.05]"
        />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--color-abyss) 88%, transparent) 0%, color-mix(in srgb, var(--color-abyss) 45%, transparent) 42%, color-mix(in srgb, var(--color-abyss) 6%, transparent) 78%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: "linear-gradient(0deg, color-mix(in srgb, var(--color-abyss) 75%, transparent), transparent)" }} />
      <div className="absolute inset-0 scanline" />
      <div className="absolute left-5 md:left-7 bottom-4 md:bottom-5 right-5">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.3em] text-tealhi/95">
          módulo {m.step} <span className="text-mut">· {m.tagline}</span>
        </p>
        <h2 className="font-display font-bold text-[26px] md:text-[34px] tracking-tight leading-tight mt-1 drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
          {m.title}
        </h2>
      </div>
      <span className="absolute top-4 right-5 font-display font-bold text-[44px] md:text-[56px] leading-none text-white/[0.13] select-none">
        {m.step}
      </span>
    </div>
  );
}

function ModuleView({ m }: { m: MentorModule }) {
  return (
    <div>
      <ModuleBanner m={m} />
      <div className="mt-7">
        <MentorBubble text={m.intro} />
      </div>
      <div className="mt-7 space-y-6">
        {m.sections.map((s, i) => (
          <SectionView key={i} s={s} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- chat flutuante ---------------- */

interface Msg {
  role: "user" | "ai";
  text: string;
  moduleId?: string;
  anim?: boolean;
}

function ChatDock({ onGoModule, level }: { onGoModule: (id: string) => void; level: Level }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing, open]);

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setTyping(true);
    setTimeout(() => {
      const a = askMentor(text, level);
      setMsgs((m) => [...m, { role: "ai", text: a.reply, moduleId: a.moduleId, anim: true }]);
      setTyping(false);
    }, 800);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir chat com o mentor"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-teal text-[#062019] flex items-center justify-center shadow-[0_12px_38px_-10px_rgba(62,220,180,0.6)] hover:scale-105 hover:bg-tealhi active:scale-95 transition-transform"
      >
        <IconChat className="w-6 h-6" />
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-coral border-2 border-abyss" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(390px,calc(100vw-2.5rem))] h-[560px] max-h-[74vh] card-static overflow-hidden flex flex-col shadow-[0_28px_70px_-20px_rgba(0,0,0,0.85)]">
      <div className="px-4 py-3 border-b border-line bg-abyss/60 flex items-center gap-3">
        <MentorAvatar size={38} />
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-[14px] tracking-tight leading-none">Mentor Anthony.ia</p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-dim mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal pulse-dot inline-block" /> online · responde na hora
          </p>
        </div>
        <button onClick={() => setOpen(false)} className="text-dim hover:text-ink transition-colors p-1" aria-label="Fechar chat">
          <IconX className="w-4 h-4" />
        </button>
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
        <div className="flex gap-2.5">
          <div className="rounded-lg rounded-tl-none border border-line bg-panel2 px-3.5 py-2.5 max-w-[88%]">
            <p className="text-[12.5px] text-mut leading-relaxed">
              Pergunte qualquer coisa da trilha — nulos, gráficos, SQL, Pearson, limpeza… Eu respondo e te levo ao módulo certo.
            </p>
          </div>
        </div>

        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="rounded-lg rounded-tr-none bg-teal text-[#062019] px-3.5 py-2.5 max-w-[88%]">
                <p className="text-[12.5px] font-medium leading-relaxed">{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5 fade-line">
              <div className="rounded-lg rounded-tl-none border border-line bg-panel2 px-3.5 py-2.5 max-w-[88%]">
                <p className="text-[12.5px] text-mut leading-relaxed">
                  {m.anim ? <TypedText text={m.text} speed={9} step={3} /> : m.text}
                </p>
                {m.moduleId && (
                  <button
                    onClick={() => {
                      onGoModule(m.moduleId!);
                      setOpen(false);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-teal border border-teal/35 bg-teal/[0.08] rounded px-2.5 py-1.5 hover:bg-teal/[0.16] transition-colors"
                  >
                    abrir módulo <IconChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {typing && (
          <div className="flex gap-2.5 fade-line">
            <div className="rounded-lg rounded-tl-none border border-line bg-panel2 px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {msgs.length === 0 && (
        <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
          {CHAT_SUGGESTIONS.slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="font-mono text-[10px] text-mut hover:text-tealhi border border-line hover:border-teal/40 rounded-full px-2.5 py-1.5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-3 border-t border-line flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao mentor…"
          className="flex-1 min-w-0 bg-panel2 border border-line focus:border-teal/50 rounded-lg px-3 py-2 text-[12.5px] text-ink placeholder:text-dim focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing}
          className="w-9 h-9 rounded-lg bg-teal text-[#062019] flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-tealhi transition-colors shrink-0"
          aria-label="Enviar pergunta"
        >
          <IconSend className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

/* ---------------- tela principal ---------------- */

const loadVisited = (lv: Level): Set<string> => {
  try {
    const arr = JSON.parse(localStorage.getItem(`anthony_trilha_${lv}`) || "[]") as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
};
const loadLevel = (): Level => {
  const saved = localStorage.getItem("anthony_nivel");
  return saved === "pleno" || saved === "senior" ? saved : "junior";
};

export function Academy({ ds, onOpenConsole }: { ds: Dataset | null; onOpenConsole: () => void }) {
  const [level, setLevel] = useState<Level>(loadLevel);
  const playbook = useMemo(() => buildPlaybook(level, ds), [level, ds]);
  const greeting = useMemo(() => mentorGreeting(level, ds), [level, ds]);
  const [activeId, setActiveId] = useState(playbook[0].id);
  const [visited, setVisited] = useState<Set<string>>(() => loadVisited(level));

  /* garante que o módulo ativo exista ao trocar de nível */
  useEffect(() => {
    if (!playbook.some((m) => m.id === activeId)) setActiveId(playbook[0].id);
  }, [playbook, activeId]);

  const persistVisited = (lv: Level, v: Set<string>) => {
    try {
      localStorage.setItem(`anthony_trilha_${lv}`, JSON.stringify([...v]));
    } catch {
      /* privado */
    }
  };

  const go = (id: string) => {
    setActiveId(id);
    setVisited((v) => {
      const nv = new Set(v).add(id);
      persistVisited(level, nv);
      return nv;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeLevel = (lv: Level) => {
    if (lv === level) return;
    setLevel(lv);
    localStorage.setItem("anthony_nivel", lv);
    const v = loadVisited(lv);
    setVisited(v);
    setActiveId(buildPlaybook(lv, ds)[0].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const active = playbook.find((m) => m.id === activeId) ?? playbook[0];
  const idx = playbook.indexOf(active);
  const visitedHere = playbook.filter((m) => visited.has(m.id)).length;
  const progress = Math.round((visitedHere / playbook.length) * 100);
  const levelMeta = LEVELS.find((l) => l.id === level)!;
  const countFor = (lv: Level) =>
    lv === level ? visitedHere : buildPlaybook(lv, ds).filter((m) => loadVisited(lv).has(m.id)).length;

  return (
    <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8 pb-28">
      {/* abertura: o próprio mentor */}
      <Reveal className="pt-8">
        <div className="card-static overflow-hidden">
          <div className="p-5 md:p-7 flex flex-wrap items-center gap-5">
            <MentorAvatar size={72} />
            <div className="flex-1 min-w-[260px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal flex items-center gap-2">
                <IconCap className="w-3.5 h-3.5" /> zona data analytics · trilhas júnior → sênior
              </p>
              <h1 className="font-display font-bold text-[26px] md:text-[36px] tracking-tight leading-[1.05] mt-2">
                Do dado bruto à decisão, <span className="text-tealhi">sem se perder</span>
              </h1>
              <p className="text-[13.5px] md:text-sm text-mut leading-relaxed mt-3 max-w-3xl">
                <TypedText text={greeting} speed={8} step={4} />
              </p>
            </div>
            <div className="shrink-0 flex flex-col gap-2.5">
              {ds ? (
                <div className="border border-teal/30 bg-teal/[0.06] rounded-lg px-4 py-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-dim">dataset conectado</p>
                  <p className="font-mono text-[12px] text-tealhi mt-1">{ds.name}</p>
                  <p className="font-mono text-[10px] text-dim mt-0.5">
                    {ds.finalRows.toLocaleString("pt-BR")} linhas · {ds.columns.length} colunas
                  </p>
                </div>
              ) : (
                <button className="btn-ghost" onClick={onOpenConsole}>
                  <IconCap className="w-3.5 h-3.5" /> carregar um dataset
                </button>
              )}
              <div className="border border-line rounded-lg px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-dim">trilha {levelMeta.name.toLowerCase()}</p>
                  <p className="font-mono text-[11px] text-teal">{visitedHere}/{playbook.length}</p>
                </div>
                <div className="h-1.5 rounded-full bg-line mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* seletor de trilhas */}
      <Reveal className="mt-6" delay={80}>
        <div className="grid sm:grid-cols-3 gap-3">
          {LEVELS.map((lv) => {
            const isOn = lv.id === level;
            const done = countFor(lv.id);
            const pct = Math.round((done / 6) * 100);
            return (
              <button
                key={lv.id}
                onClick={() => changeLevel(lv.id)}
                className={`text-left rounded-[10px] border p-4 transition-all relative overflow-hidden group ${
                  isOn
                    ? "border-teal/45 bg-teal/[0.06]"
                    : "border-line bg-panel/60 hover:border-line2 hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-display font-bold text-[17px] tracking-tight ${isOn ? "text-tealhi" : "text-ink"}`}>
                    {lv.name}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-dim">{done}/6 módulos</span>
                </div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-teal/80 mt-0.5">{lv.focus}</p>
                <p className="text-[11.5px] text-mut leading-relaxed mt-2">{lv.desc}</p>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {lv.skills.map((sk) => (
                    <span key={sk} className="font-mono text-[8.5px] uppercase tracking-wider text-dim border border-line rounded px-1.5 py-0.5 group-hover:text-mut transition-colors">
                      {sk}
                    </span>
                  ))}
                </div>
                <div className="h-1 rounded-full bg-line mt-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>

              </button>
            );
          })}
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-[292px_1fr] gap-6 mt-6 items-start">
        {/* trilha */}
        <aside className="lg:sticky lg:top-20">
          <Reveal>
            <div className="card-static overflow-hidden">
              <div className="px-4 py-3 border-b border-line flex items-center gap-2">
                <IconCap className="w-4 h-4 text-teal" />
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mut">trilha {levelMeta.name.toLowerCase()} · módulos</p>
              </div>
              <div className="p-2">
                {playbook.map((m) => {
                  const is = m.id === activeId;
                  const done = visited.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => go(m.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-0.5 ${
                        is ? "bg-teal/[0.09] border border-teal/30" : "border border-transparent hover:bg-panel2 hover:border-line"
                      }`}
                    >
                      <span className={`font-mono text-[11px] font-bold shrink-0 ${is ? "text-tealhi" : done ? "text-teal/70" : "text-dim"}`}>
                        {m.step}
                      </span>
                      <span className={`flex-1 text-[12.5px] leading-tight ${is ? "text-ink font-semibold" : "text-mut"}`}>{m.title}</span>
                      {done ? (
                        <IconCheck className="w-3.5 h-3.5 text-teal shrink-0" />
                      ) : (
                        <IconChevronRight className={`w-3.5 h-3.5 shrink-0 ${is ? "text-teal" : "text-dim"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-line">
                <p className="text-[11px] text-dim leading-relaxed">
                  Siga na ordem ou pule para sua dúvida — o chat do mentor (canto inferior) te leva ao módulo certo.
                </p>
              </div>
            </div>
          </Reveal>
        </aside>

        {/* conteúdo do módulo */}
        <main className="min-w-0">
          <div key={active.id} className="fade-line">
            <ModuleView m={active} />
          </div>

          <div className="mt-10 flex items-center justify-between gap-3 flex-wrap">
            {idx > 0 ? (
              <button className="btn-ghost" onClick={() => go(playbook[idx - 1].id)}>
                <IconArrowLeft className="w-3.5 h-3.5" /> módulo {playbook[idx - 1].step}
              </button>
            ) : (
              <span />
            )}
            {idx < playbook.length - 1 ? (
              <button className="btn-teal" onClick={() => go(playbook[idx + 1].id)}>
                módulo {playbook[idx + 1].step} · {playbook[idx + 1].title.split("—")[0].trim()}
                <IconChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-teal flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5" /> trilha {levelMeta.name.toLowerCase()} completa
                </span>
                {LEVELS[LEVELS.findIndex((l) => l.id === level) + 1] && (
                  <button
                    className="btn-teal"
                    onClick={() => changeLevel(LEVELS[LEVELS.findIndex((l) => l.id === level) + 1].id)}
                  >
                    trilha {LEVELS[LEVELS.findIndex((l) => l.id === level) + 1].name.toLowerCase()}
                    <IconChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <ChatDock onGoModule={go} level={level} />
    </div>
  );
}
