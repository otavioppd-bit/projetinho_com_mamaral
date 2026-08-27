import { AILab } from "./components/ailab";

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

export default function App() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Background />

      <header className="relative z-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-[var(--color-cyan)]/40 bg-[rgba(55,230,195,0.08)] flex items-center justify-center shadow-[0_0_28px_-6px_rgba(55,230,195,0.4)]">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 5 28 27H4L16 5Z" stroke="var(--color-cyan)" strokeWidth="2" />
              <path d="M10.4 20h11.2" stroke="var(--color-cyan)" strokeWidth="1.6" opacity="0.85" />
              <circle cx="16" cy="5" r="2" fill="var(--color-amber)" stroke="none" />
            </svg>
          </div>
          <div className="leading-none">
            <span className="font-display font-bold text-[18px] tracking-[0.01em]">
              Anthony<span className="text-[var(--color-cyan)]">.ia</span>
            </span>
            <span className="hidden sm:block font-mono text-[8.5px] uppercase tracking-[0.3em] text-[var(--color-dim)] mt-1">
              inteligência aplicada
            </span>
          </div>

          <span className="ml-2 sm:ml-4 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-amber)] border border-[var(--color-amber)]/35 bg-[rgba(255,180,84,0.08)] rounded px-2 py-1">
            ia lab
          </span>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden md:flex items-center gap-2 font-mono text-[10.5px] text-[var(--color-mut)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)] pulse-dot inline-block" />
              12 modelos · inferência local
            </span>
            <span className="hidden md:block w-px h-5 bg-[var(--color-line2)]" />
            <span className="font-mono text-[10.5px] text-[var(--color-dim)]">v1.0</span>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-line2)] to-transparent" />
      </header>

      <main className="flex-1">
        <AILab />
      </main>

      <footer className="relative z-10 border-t border-[var(--color-line)] mt-2">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] text-[var(--color-dim)]">
            Anthony.ia · IA Lab — respostas simuladas localmente para demonstração; nenhuma API externa é chamada.
          </p>
          <p className="font-mono text-[10px] text-[var(--color-dim)]">
            ranking composto: raciocínio · código · velocidade · custo
          </p>
        </div>
      </footer>
    </div>
  );
}
