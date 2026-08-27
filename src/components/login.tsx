import { useEffect, useMemo, useRef, useState } from "react";
import {
  authMode, EMAIL_RE, ROLES, passwordScore, signIn, signUp,
  type RoleId, type Session,
} from "../lib/auth";
import { LogoMark } from "./icons";

/* ================= canvas de dados ao vivo ================= */

function DataCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const points: number[] = Array.from({ length: 90 }, (_, i) => 0.5 + Math.sin(i / 9) * 0.12);
    const motes = Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 2.2,
      v: 0.0004 + Math.random() * 0.0012,
      o: 0.15 + Math.random() * 0.5,
    }));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      /* grade fina */
      ctx.strokeStyle = "rgba(110,168,255,0.07)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 46) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 46) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      /* motas flutuando */
      for (const m of motes) {
        m.y -= m.v;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(55,230,195,${m.o})`;
        ctx.fill();
      }

      /* série streaming */
      points.shift();
      const last = points[points.length - 1];
      const drift = Math.sin(t / 40) * 0.03 + (Math.random() - 0.5) * 0.045;
      points.push(Math.min(0.92, Math.max(0.08, last + drift)));

      const chartH = h * 0.42;
      const y0 = h * 0.52;
      const step = w / (points.length - 1);

      /* área */
      const grad = ctx.createLinearGradient(0, y0 - chartH / 2, 0, y0 + chartH / 2 + 40);
      grad.addColorStop(0, "rgba(55,230,195,0.20)");
      grad.addColorStop(1, "rgba(55,230,195,0)");
      ctx.beginPath();
      ctx.moveTo(0, y0 + chartH / 2 + 40);
      points.forEach((p, i) => ctx.lineTo(i * step, y0 + chartH / 2 - p * chartH));
      ctx.lineTo(w, y0 + chartH / 2 + 40);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      /* linha */
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = i * step;
        const y = y0 + chartH / 2 - p * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#37e6c3";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(55,230,195,0.7)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      /* ponto vivo na ponta */
      const tipX = (points.length - 1) * step;
      const tipY = y0 + chartH / 2 - points[points.length - 1] * chartH;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4 + Math.sin(t / 8) * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#8df5e0";
      ctx.fill();

      /* barras espectro no rodapé */
      const bars = 34;
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        const bh = 8 + Math.abs(Math.sin(t / 24 + i * 0.7)) * 42;
        ctx.fillStyle = i % 7 === 0 ? "rgba(255,180,84,0.5)" : "rgba(110,168,255,0.22)";
        ctx.fillRect(i * bw + 2, h - bh, bw - 4, bh);
      }

      t++;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden />;
}

/* ================= ticker de eventos ================= */

const EVENTS = [
  ["12:04:11", "duplicatas removidas · 8 linhas", "var(--color-coral)"],
  ["12:04:12", "perfilamento concluído · 8 colunas", "var(--color-teal)"],
  ["12:04:12", "matriz de Pearson gerada · r = 0,84", "var(--color-sky)"],
  ["12:04:13", "3 outliers sinalizados · Tukey 1,5×IQR", "var(--color-amber)"],
  ["12:04:13", "dossiê pronto em 1,2s · local-first", "var(--color-teal)"],
] as const;

function EventTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % EVENTS.length), 2400);
    return () => clearInterval(id);
  }, []);
  const ev = EVENTS[i];
  return (
    <div key={i} className="fade-line flex items-center gap-3 font-mono text-[11px]">
      <span className="w-1.5 h-1.5 rotate-45 inline-block shrink-0" style={{ background: ev[2] }} />
      <span className="text-[var(--color-dim)]">{ev[0]}</span>
      <span className="text-[var(--color-mut)] truncate">{ev[1]}</span>
    </div>
  );
}

/* ================= formulário ================= */

type Mode = "login" | "signup";

interface FieldErrors {
  name?: string;
  email?: string;
  secret?: string;
  role?: string;
}

const inputCls =
  "w-full bg-[var(--color-panel)] border border-[var(--color-line2)] rounded-lg px-3.5 py-2.5 text-[13.5px] text-[var(--color-ink)] placeholder:text-[var(--color-dim)] focus:outline-none focus:border-[var(--color-teal)]/60 focus:shadow-[0_0_0_3px_rgba(55,230,195,0.08)] transition-all";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-mut)] mb-1.5 block">
      {children}
    </span>
  );
}

function ErrorLine({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="font-mono text-[10.5px] text-[var(--color-coral)] mt-1.5 fade-line">▲ {msg}</p>;
}

export function LoginView({ onAuthed }: { onAuthed: (s: Session) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<RoleId | null>(null);
  const [remember, setRemember] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [recovery, setRecovery] = useState(false);

  const strength = useMemo(() => passwordScore(secret), [secret]);

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (mode === "signup" && name.trim().length < 2) e.name = "Informe seu nome completo.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Informe um e-mail corporativo válido.";
    if (secret.length < 6) e.secret = "A senha precisa de pelo menos 6 caracteres.";
    if (mode === "signup" && !role) e.role = "Selecione sua função — ela define a trilha sugerida.";
    setErrors(e);
    if (Object.keys(e).length) {
      setShake((s) => s + 1);
      return false;
    }
    return true;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGlobalError(null);
    if (busy) return;
    if (!validate()) return;
    setBusy(true);
    const res =
      mode === "login"
        ? await signIn(email, secret, remember)
        : await signUp({ name, email, secret, role: role!, company, remember });
    setBusy(false);
    if (res.ok) {
      onAuthed(res.session);
    } else {
      setGlobalError(res.error);
      setShake((s) => s + 1);
    }
  };

  const fillDemo = () => {
    setMode("login");
    setEmail("analista@anthony.ia");
    setSecret("demo1234");
    setErrors({});
    setGlobalError(null);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setGlobalError(null);
    setRecovery(false);
  };

  return (
    <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.15fr_1fr]">
      {/* ---------------- painel de marca ---------------- */}
      <section className="relative hidden lg:flex flex-col overflow-hidden border-r border-[var(--color-line)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#081120] via-[#05080f] to-[#071318]" />
        <DataCanvas />
        <div className="scanline" />

        <div className="relative flex flex-col h-full p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border border-[var(--color-teal)]/40 bg-[rgba(55,230,195,0.08)] flex items-center justify-center shadow-[0_0_30px_-6px_rgba(55,230,195,0.45)]">
              <LogoMark className="w-6 h-6" />
            </div>
            <div className="leading-none">
              <span className="font-display font-bold text-[20px] tracking-[0.01em]">
                Anthony<span className="text-[var(--color-teal)]">.ia</span>
              </span>
              <span className="block font-mono text-[8.5px] uppercase tracking-[0.3em] text-[var(--color-dim)] mt-1">
                data · ia · mentoria
              </span>
            </div>
          </div>

          <div className="mt-auto max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-teal)] mb-4">
              console de análise · acesso restrito
            </p>
            <h1 className="font-display font-bold text-[38px] xl:text-[50px] leading-[1.04] tracking-[-0.02em]">
              Seus dados entram crus.<br />
              <span className="text-[var(--color-mut)] font-light">Saem como decisão.</span>
            </h1>
            <p className="text-[14px] text-[var(--color-mut)] leading-relaxed mt-5 max-w-md">
              Higienização auditável, dossiê visual com gráficos de nível científico e trilhas de
              mentoria por senioridade — tudo rodando na sua máquina.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
              {[
                ["100%", "local-first"],
                ["8", "gráficos interativos"],
                ["3", "trilhas de mentoria"],
              ].map(([v, k]) => (
                <div key={k} className="rounded-lg border border-[var(--color-line)] bg-[rgba(10,18,32,0.6)] px-4 py-3">
                  <p className="font-display font-bold text-[22px] text-[var(--color-tealhi)]">{v}</p>
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[var(--color-dim)] mt-0.5">{k}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-[var(--color-line)] bg-[rgba(10,18,32,0.7)] px-4 py-3 max-w-md">
              <p className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[var(--color-dim)] mb-2">event summary</p>
              <EventTicker />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- painel do formulário ---------------- */}
      <section className="flex items-center justify-center px-5 py-10 md:px-10 relative">
        <div className="lg:hidden absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-line2)] to-transparent" />
        <div className={`w-full max-w-[440px] ${shake ? "shake" : ""}`} key={shake}>
          {/* topo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg border border-[var(--color-teal)]/40 bg-[rgba(55,230,195,0.08)] flex items-center justify-center">
              <LogoMark className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-[18px]">
              Anthony<span className="text-[var(--color-teal)]">.ia</span>
            </span>
          </div>

          <div className={shake ? "fade-line" : "fade-line"}>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-teal)]">
              {mode === "login" ? "acesso da equipe" : "criar conta"}
            </p>
            <h2 className="font-display font-bold text-[28px] md:text-[32px] tracking-[-0.015em] leading-tight mt-2">
              {mode === "login" ? "Bem-vindo(a) de volta." : "Entre para o time."}
            </h2>
            <p className="text-[13px] text-[var(--color-mut)] mt-2 leading-relaxed">
              {mode === "login"
                ? "Entre com seu e-mail corporativo para abrir o console."
                : "Sua função define a trilha de mentoria que o mentor vai sugerir primeiro."}
            </p>
          </div>

          {/* alternador */}
          <div className="flex rounded-lg border border-[var(--color-line)] overflow-hidden mt-6">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  mode === m
                    ? "bg-[rgba(55,230,195,0.13)] text-[var(--color-tealhi)]"
                    : "text-[var(--color-dim)] hover:text-[var(--color-mut)]"
                }`}
              >
                {m === "login" ? "entrar" : "criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            {mode === "signup" && (
              <div>
                <Label>nome completo</Label>
                <input
                  className={inputCls}
                  placeholder="Ana Ribeiro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
                <ErrorLine msg={errors.name} />
              </div>
            )}

            <div>
              <Label>e-mail corporativo</Label>
              <input
                className={inputCls}
                placeholder="voce@empresa.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <ErrorLine msg={errors.email} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>senha</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setRecovery((r) => !r)}
                    className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--color-dim)] hover:text-[var(--color-teal)] transition-colors"
                  >
                    esqueci a senha
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  className={`${inputCls} pr-16`}
                  placeholder="••••••••"
                  type={showSecret ? "text" : "password"}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-widest text-[var(--color-dim)] hover:text-[var(--color-tealhi)] transition-colors"
                >
                  {showSecret ? "ocultar" : "mostrar"}
                </button>
              </div>
              {mode === "signup" && secret.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: strength.score >= n ? strength.color : "var(--color-line)",
                        }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: strength.color }}>
                    força: {strength.label}
                  </p>
                </div>
              )}
              <ErrorLine msg={errors.secret} />
              {recovery && (
                <p className="font-mono text-[10.5px] text-[var(--color-sky)] mt-2 fade-line leading-relaxed">
                  No transporte real, um link de redefinição seria enviado ao seu e-mail.
                  Para a demonstração, use o perfil demo abaixo.
                </p>
              )}
            </div>

            {mode === "signup" && (
              <>
                <div>
                  <Label>função na empresa</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setRole(r.id);
                          setErrors((e) => ({ ...e, role: undefined }));
                        }}
                        className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                          role === r.id
                            ? "border-[var(--color-teal)]/60 bg-[rgba(55,230,195,0.08)] shadow-[0_0_18px_-8px_rgba(55,230,195,0.5)]"
                            : "border-[var(--color-line)] hover:border-[var(--color-line2)] hover:-translate-y-px"
                        }`}
                      >
                        <span className={`text-[12px] font-semibold block ${role === r.id ? "text-[var(--color-tealhi)]" : "text-[var(--color-ink)]"}`}>
                          {r.label}
                        </span>
                        <span className="font-mono text-[8.5px] uppercase tracking-widest text-[var(--color-dim)]">
                          trilha sugerida: {r.level}
                        </span>
                      </button>
                    ))}
                  </div>
                  <ErrorLine msg={errors.role} />
                </div>

                <div>
                  <Label>empresa <span className="text-[var(--color-dim)] normal-case tracking-normal">(opcional)</span></Label>
                  <input
                    className={inputCls}
                    placeholder="Acme Analytics"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    autoComplete="organization"
                  />
                </div>
              </>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
              <button
                type="button"
                role="switch"
                aria-checked={remember}
                onClick={() => setRemember((r) => !r)}
                className={`w-9 h-5 rounded-full border transition-colors relative shrink-0 ${
                  remember ? "bg-[rgba(55,230,195,0.25)] border-[var(--color-teal)]/50" : "bg-[var(--color-panel)] border-[var(--color-line2)]"
                }`}
              >
                <span
                  className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    remember ? "left-[18px] bg-[var(--color-teal)]" : "left-[3px] bg-[var(--color-dim)]"
                  }`}
                />
              </button>
              <span className="text-[12px] text-[var(--color-mut)]">
                Manter conectado por {remember ? "30 dias" : "12 horas"}
              </span>
            </label>

            {globalError && (
              <div className="rounded-lg border border-[var(--color-coral)]/40 bg-[rgba(255,107,129,0.08)] px-3.5 py-2.5 fade-line">
                <p className="font-mono text-[11px] text-[var(--color-coral)] leading-relaxed">✕ {globalError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-teal w-full justify-center py-3 disabled:opacity-50 disabled:cursor-wait"
            >
              {busy ? (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 ring-spin" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                  autenticando…
                </>
              ) : mode === "login" ? (
                "entrar no console"
              ) : (
                "criar conta e entrar"
              )}
            </button>

            <button
              type="button"
              onClick={fillDemo}
              className="w-full font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-dim)] hover:text-[var(--color-tealhi)] border border-dashed border-[var(--color-line2)] hover:border-[var(--color-teal)]/40 rounded-lg py-2.5 transition-colors"
            >
              ◈ usar perfil demo — analista@anthony.ia
            </button>
          </form>

          <p className="font-mono text-[9.5px] text-[var(--color-dim)] leading-relaxed mt-6 text-center">
            {authMode === "supabase" ? (
              <>
                Autenticando via <span className="text-[var(--color-teal)]">Supabase Auth</span> · RLS ativo por usuário
              </>
            ) : (
              <>
                Sessão com expiração · senha com hash + salt ·<br className="hidden sm:block" />
                transporte pronto para Supabase (modo atual: local-first)
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
