import { useCallback, useEffect, useState } from "react";
import { analyzeDataset, type Dataset } from "./lib/analyze";
import { IntakeView, PipelineView } from "./components/intake";
import { Dashboard } from "./components/dashboard";
import { Academy } from "./components/academy";
import { ArchitecturePage } from "./components/arch";
import { LogoMark, IconTable, IconCap, IconLayers } from "./components/ui";

type View = "intake" | "pipeline" | "dashboard";
type Area = "console" | "academy" | "arch";

/* partículas ambientes com posições fixas (sem aleatoriedade por render) */
const MOTES = [
  { left: "6%", top: "22%", s: 5, d: 0, dur: 9 },
  { left: "12%", top: "68%", s: 3, d: -2, dur: 11 },
  { left: "18%", top: "38%", s: 4, d: -4, dur: 8 },
  { left: "27%", top: "82%", s: 3, d: -1, dur: 12 },
  { left: "36%", top: "14%", s: 4, d: -6, dur: 10 },
  { left: "47%", top: "58%", s: 3, d: -3, dur: 9 },
  { left: "55%", top: "26%", s: 5, d: -7, dur: 13 },
  { left: "64%", top: "74%", s: 3, d: -2.5, dur: 10 },
  { left: "72%", top: "18%", s: 4, d: -5, dur: 8.5 },
  { left: "81%", top: "46%", s: 3, d: -1.5, dur: 12 },
  { left: "88%", top: "70%", s: 5, d: -8, dur: 9.5 },
  { left: "93%", top: "30%", s: 3, d: -4.5, dur: 11 },
  { left: "40%", top: "90%", s: 4, d: -6.5, dur: 10.5 },
  { left: "77%", top: "88%", s: 3, d: -3.5, dur: 9 },
];

/* campo extra de partículas para o tema ameba (esfera atmosférica) */
const AMEBA_MOTES = [
  { left: "8%", top: "30%", s: 2.5, d: -1, dur: 8 }, { left: "15%", top: "55%", s: 2, d: -3, dur: 10 },
  { left: "22%", top: "20%", s: 3, d: -5, dur: 9 }, { left: "30%", top: "70%", s: 2, d: -2, dur: 12 },
  { left: "38%", top: "34%", s: 2.5, d: -7, dur: 8.5 }, { left: "45%", top: "80%", s: 2, d: -4, dur: 11 },
  { left: "52%", top: "16%", s: 3, d: -6, dur: 9.5 }, { left: "58%", top: "62%", s: 2, d: -1.5, dur: 10 },
  { left: "66%", top: "28%", s: 2.5, d: -8, dur: 8 }, { left: "74%", top: "52%", s: 2, d: -3.5, dur: 12 },
  { left: "82%", top: "22%", s: 3, d: -5.5, dur: 9 }, { left: "90%", top: "60%", s: 2, d: -2.5, dur: 11 },
  { left: "95%", top: "38%", s: 2.5, d: -4.5, dur: 8.5 }, { left: "34%", top: "12%", s: 2, d: -6.5, dur: 10.5 },
  { left: "62%", top: "88%", s: 2.5, d: -0.5, dur: 9 }, { left: "18%", top: "86%", s: 2, d: -7.5, dur: 11.5 },
];

function Background({ theme }: { theme: "prisma" | "ameba" }) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <div className="glow-slow absolute -top-44 -left-44 w-[660px] h-[660px] rounded-full blur-3xl bg-glow-1" />
      <div
        className="glow-slow absolute -bottom-56 -right-44 w-[760px] h-[760px] rounded-full blur-3xl bg-glow-2"
        style={{ animationDelay: "-5.5s" }}
      />
      <div className="absolute top-1/3 right-[18%] w-[440px] h-[440px] rounded-full blur-3xl bg-glow-3" />
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="mote"
          style={{
            left: m.left,
            top: m.top,
            width: m.s,
            height: m.s,
            animationDelay: `${m.d}s`,
            animationDuration: `${m.dur}s`,
            opacity: theme === "ameba" ? 0.28 : 0.5,
          }}
        />
      ))}
      {theme === "ameba" &&
        AMEBA_MOTES.map((m, i) => (
          <span
            key={`a${i}`}
            className="mote"
            style={{
              left: m.left,
              top: m.top,
              width: m.s,
              height: m.s,
              animationDelay: `${m.d}s`,
              animationDuration: `${m.dur}s`,
              opacity: 0.75,
            }}
          />
        ))}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("intake");
  const [area, setArea] = useState<Area>("console");
  const [ds, setDs] = useState<Dataset | null>(null);

  /* versão visual: prisma (original) ou ameba (midnight control room) */
  const [theme, setTheme] = useState<"prisma" | "ameba">(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("prisma-versao") : null;
    const t = saved === "ameba" ? ("ameba" as const) : ("prisma" as const);
    if (typeof document !== "undefined") document.documentElement.dataset.theme = t;
    return t;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("prisma-versao", theme);
    document.title =
      theme === "ameba"
        ? "AMEBA · Control room de dados"
        : "PRISMA · Análise de dados no navegador";
  }, [theme]);

  const openArea = (a: Area) => {
    setArea(a);
    window.scrollTo({ top: 0 });
  };

  const handleAnalyze = useCallback((text: string, name: string): string | null => {
    try {
      const d = analyzeDataset(text, name);
      setDs(d);
      setView("pipeline");
      window.scrollTo({ top: 0 });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Não foi possível interpretar os dados. Verifique o formato.";
    }
  }, []);

  const pipelineDone = useCallback(() => {
    setView("dashboard");
    window.scrollTo({ top: 0 });
  }, []);

  const reset = useCallback(() => {
    setView("intake");
    setDs(null);
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      <Background theme={theme} />

      <header className="sticky top-0 z-40 border-b border-line bg-abyss/85 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 h-16 flex items-center gap-3">
          <LogoMark className="w-8 h-8" />
          <div className="leading-none">
            <span className="font-display font-bold text-[19px] tracking-[0.14em]">
              {theme === "ameba" ? "AMEBA" : "PRISMA"}
            </span>
            <span className="hidden sm:block font-mono text-[8.5px] uppercase tracking-[0.3em] text-dim mt-1">
              {theme === "ameba" ? "control room" : "data engine"}
            </span>
          </div>

          {/* seletor de versão visual */}
          <div className="ml-2 flex items-center rounded-lg border border-line bg-panel/70 p-1" title="Trocar versão visual">
            {(["prisma", "ameba"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-2 py-1 rounded-md font-mono text-[9px] uppercase tracking-[0.16em] border transition-all ${
                  theme === t
                    ? "bg-teal/[0.13] text-tealhi border-teal/35"
                    : "text-dim border-transparent hover:text-mut"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <nav className="ml-3 sm:ml-6 flex items-center gap-1 rounded-lg border border-line bg-panel/70 p-1">
            {(
              [
                { id: "console", label: "console", Icon: IconTable },
                { id: "academy", label: "analytics", Icon: IconCap },
                { id: "arch", label: "arquitetura", Icon: IconLayers },
              ] as { id: Area; label: string; Icon: typeof IconTable }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => openArea(id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-[0.12em] border transition-all ${
                  area === id
                    ? "bg-teal/[0.13] text-tealhi border-teal/35"
                    : "text-dim border-transparent hover:text-mut hover:bg-panel2"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-mut">
              <span className="w-1.5 h-1.5 rounded-full bg-teal pulse-dot inline-block" />
              motor local · online
            </span>
            <span className="hidden lg:block w-px h-5 bg-line" />
            <span className="font-mono text-[11px] text-dim hidden sm:inline">v2.4</span>
            {area === "console" && view !== "intake" && (
              <button
                onClick={reset}
                className="font-mono text-[10px] uppercase tracking-widest text-dim hover:text-teal transition-colors"
              >
                reiniciar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {area === "academy" ? (
          <Academy
            ds={ds}
            onOpenConsole={() => {
              setArea("console");
              window.scrollTo({ top: 0 });
            }}
          />
        ) : area === "arch" ? (
          <ArchitecturePage />
        ) : (
          <>
            {view === "intake" && <IntakeView onAnalyze={handleAnalyze} theme={theme} />}
            {view === "pipeline" && ds && <PipelineView ds={ds} onDone={pipelineDone} />}
            {view === "dashboard" && ds && <Dashboard ds={ds} onNew={reset} />}
          </>
        )}
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-5 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] text-dim">PRISMA © 2026 — ciência de dados direto no navegador</p>
          <p className="font-mono text-[10px] text-dim">Pearson · Tukey 1,5×IQR · OLS · quartis · g₁</p>
        </div>
      </footer>
    </div>
  );
}
