import { useEffect, useRef, useState } from "react";
import { analyze, type Dataset } from "./lib/analyze";
import { getSession, recommendedLevel, roleLabel, signOut, type Session } from "./lib/auth";
import { IntakeView, PipelineView } from "./components/intake";
import { Dashboard } from "./components/dashboard";
import { Academy } from "./components/academy";
import { ArchitecturePage } from "./components/arch";
import { LoginView } from "./components/login";
import { IconCap, IconLayers, IconTable, LogoMark } from "./components/icons";

type Area = "console" | "academy" | "arch";
type ConsoleView = "intake" | "pipeline" | "dashboard";

const AREAS: { id: Area; label: string; Icon: typeof IconTable }[] = [
  { id: "console", label: "console", Icon: IconTable },
  { id: "academy", label: "analytics", Icon: IconCap },
  { id: "arch", label: "arquitetura", Icon: IconLayers },
];

/* partículas ambiente */
const MOTES = [
  { left: "7%", top: "24%", s: 3, d: -1, dur: 8.5 },
  { left: "16%", top: "64%", s: 2, d: -3, dur: 10 },
  { left: "27%", top: "18%", s: 2.5, d: -5, dur: 9 },
  { left: "38%", top: "76%", s: 2, d: -2, dur: 11 },
  { left: "49%", top: "32%", s: 3, d: -7, dur: 8 },
  { left: "61%", top: "68%", s: 2, d: -4, dur: 12 },
  { left: "72%", top: "22%", s: 2.5, d: -6, dur: 9.5 },
  { left: "84%", top: "58%", s: 2, d: -1.5, dur: 10.5 },
  { left: "93%", top: "34%", s: 3, d: -3.5, dur: 8.5 },
  { left: "55%", top: "88%", s: 2, d: -5.5, dur: 11.5 },
];

function Background() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <div
        className="glow-slow absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(55,230,195,0.11), transparent 65%)" }}
      />
      <div
        className="glow-slow absolute -bottom-52 -right-40 w-[720px] h-[720px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(110,168,255,0.10), transparent 65%)", animationDelay: "-5.5s" }}
      />
      <div
        className="absolute top-1/4 right-[16%] w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,180,84,0.05), transparent 65%)" }}
      />
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
            opacity: 0.55,
          }}
        />
      ))}
    </div>
  );
}

/* ---- chip do usuário com menu ---- */
function UserChip({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2.5 rounded-lg border px-2 py-1.5 transition-all ${
          open
            ? "border-[var(--color-teal)]/45 bg-[rgba(55,230,195,0.07)]"
            : "border-[var(--color-line)] hover:border-[var(--color-line2)]"
        }`}
      >
        <span className="w-7 h-7 rounded-md bg-[rgba(55,230,195,0.14)] border border-[var(--color-teal)]/35 flex items-center justify-center font-display font-bold text-[11px] text-[var(--color-tealhi)]">
          {session.initials}
        </span>
        <span className="hidden md:block text-left leading-none">
          <span className="block text-[12px] font-semibold max-w-[130px] truncate">{session.name.split(" ")[0]}</span>
          <span className="block font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-dim)] mt-0.5">
            {roleLabel(session.role)}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`w-3 h-3 text-[var(--color-dim)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[264px] rounded-xl border border-[var(--color-line2)] bg-[var(--color-panel)] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)] fade-line z-50 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[var(--color-line)]">
            <p className="text-[13.5px] font-bold truncate">{session.name}</p>
            <p className="font-mono text-[10.5px] text-[var(--color-mut)] truncate mt-0.5">{session.email}</p>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              <span className="font-mono text-[8.5px] uppercase tracking-widest text-[var(--color-tealhi)] border border-[var(--color-teal)]/35 bg-[rgba(55,230,195,0.08)] rounded px-1.5 py-0.5">
                {roleLabel(session.role)}
              </span>
              <span className="font-mono text-[8.5px] uppercase tracking-widest text-[var(--color-mut)] border border-[var(--color-line2)] rounded px-1.5 py-0.5 truncate max-w-[120px]">
                {session.company}
              </span>
            </div>
          </div>
          <div className="px-4 py-3 border-b border-[var(--color-line)]">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-dim)] mb-1.5">trilha sugerida pelo mentor</p>
            <p className="text-[12px] text-[var(--color-mut)]">
              Pela sua função, o Analytics abre na trilha{" "}
              <b className="text-[var(--color-tealhi)] capitalize">{recommendedLevel(session.role)}</b>.
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="w-full text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-coral)] hover:bg-[rgba(255,107,129,0.07)] transition-colors"
          >
            ⎋ encerrar sessão
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [area, setArea] = useState<Area>("console");
  const [view, setView] = useState<ConsoleView>("intake");
  const [ds, setDs] = useState<Dataset | null>(null);

  const openArea = (a: Area) => {
    setArea(a);
    window.scrollTo({ top: 0 });
  };
  const handleAnalyze = (text: string, name: string): string | null => {
    const parsed = analyze(text, name);
    if (!parsed) return "Não consegui ler esse arquivo — confira se tem cabeçalho e pelo menos 2 linhas de dados.";
    setDs(parsed);
    setView("pipeline");
    window.scrollTo({ top: 0 });
    return null;
  };

  const reset = () => {
    setDs(null);
    setView("intake");
    window.scrollTo({ top: 0 });
  };

  const handleSignOut = () => {
    signOut();
    setSession(null);
    setArea("console");
    reset();
    window.scrollTo({ top: 0 });
  };

  /* ---- portal de acesso ---- */
  if (!session) {
    return (
      <div className="min-h-screen relative">
        <Background />
        <LoginView onAuthed={(s) => setSession(s)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <Background />

      <header className="relative z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3.5 flex items-center gap-3">
          <button className="flex items-center gap-3 group shrink-0" onClick={() => openArea("console")}>
            <div className="w-9 h-9 rounded-lg border border-[var(--color-line2)] bg-[rgba(55,230,195,0.08)] flex items-center justify-center shadow-[0_0_28px_-6px_rgba(55,230,195,0.4)] group-hover:border-[var(--color-teal)]/50 transition-colors">
              <LogoMark className="w-5 h-5" />
            </div>
            <div className="leading-none text-left hidden sm:block">
              <span className="font-display font-bold text-[18px] tracking-[0.01em]">
                Anthony<span className="text-[var(--color-teal)]">.ia</span>
              </span>
              <span className="block font-mono text-[8.5px] uppercase tracking-[0.3em] text-[var(--color-dim)] mt-1">
                data · ia · mentoria
              </span>
            </div>
          </button>

          <nav className="ml-1 sm:ml-5 flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-1">
            {AREAS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => openArea(id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-[0.12em] border transition-all ${
                  area === id
                    ? "bg-[rgba(55,230,195,0.13)] text-[var(--color-tealhi)] border-[var(--color-teal)]/35"
                    : "text-[var(--color-dim)] border-transparent hover:text-[var(--color-mut)] hover:bg-[var(--color-panel2)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden xl:flex items-center gap-2 font-mono text-[10.5px] text-[var(--color-mut)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-teal)] pulse-dot inline-block" />
              motor local · online
            </span>
            <span className="hidden xl:block w-px h-5 bg-[var(--color-line2)]" />
            {area === "console" && view !== "intake" && (
              <button
                onClick={reset}
                className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-dim)] hover:text-[var(--color-teal)] transition-colors hidden sm:block"
              >
                reiniciar
              </button>
            )}
            <UserChip session={session} onSignOut={handleSignOut} />
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-line2)] to-transparent" />
      </header>

      <main className="flex-1">
        {area === "academy" ? (
          <Academy
            ds={ds}
            initialLevel={recommendedLevel(session.role)}
            onOpenConsole={() => {
              setArea("console");
              window.scrollTo({ top: 0 });
            }}
          />
        ) : area === "arch" ? (
          <ArchitecturePage />
        ) : (
          <>
            {view === "intake" && <IntakeView onAnalyze={handleAnalyze} />}
            {view === "pipeline" && ds && <PipelineView ds={ds} onDone={() => setView("dashboard")} />}
            {view === "dashboard" && ds && <Dashboard ds={ds} onNew={reset} />}
          </>
        )}
      </main>

      <footer className="relative z-10 border-t border-[var(--color-line)] mt-2">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] text-[var(--color-dim)]">
            Anthony.ia © 2026 — dados, limpeza e mentoria rodando direto no navegador.
          </p>
          <p className="font-mono text-[10px] text-[var(--color-dim)]">
            sessão: <span className="text-[var(--color-mut)]">{session.email}</span> · nenhuma linha de dados sai da sua máquina
          </p>
        </div>
      </footer>
    </div>
  );
}
