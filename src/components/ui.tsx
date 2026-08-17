import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------------- formatação pt-BR ---------------- */

export const fmtNum = (n: number, d = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/* ---------------- scroll reveal ---------------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------------- número animado ---------------- */

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const dur = 1000;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(value * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span>
      {prefix}
      {fmtNum(v, decimals)}
      {suffix}
    </span>
  );
}

/* ---------------- cabeçalho de seção ---------------- */

export function SectionHead({
  index,
  kicker,
  title,
  desc,
}: {
  index: string;
  kicker: string;
  title: string;
  desc?: string;
}) {
  return (
    <Reveal className="mb-7">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-teal text-sm font-semibold">{index}</span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-dim mb-1.5">{kicker}</p>
          <h2 className="font-display font-bold text-2xl md:text-[32px] leading-tight tracking-tight">{title}</h2>
          {desc && <p className="text-mut text-sm mt-1.5 max-w-2xl">{desc}</p>}
        </div>
      </div>
    </Reveal>
  );
}

/* ---------------- card de gráfico ---------------- */

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  badge?: string;
}) {
  return (
    <Reveal className={className}>
      <div className="card h-full p-5 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-[16px] tracking-tight">{title}</h3>
              {badge && (
                <span className="font-mono text-[9px] uppercase tracking-widest text-teal border border-teal/30 bg-teal/8 rounded px-1.5 py-0.5">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-mut mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-2 flex-wrap justify-end items-center">{actions}</div>}
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </Reveal>
  );
}

/* ---------------- select ---------------- */

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2">
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim">{label}</span>
      )}
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-panel2 border border-line hover:border-line2 rounded-md pl-2.5 pr-7 py-1.5 text-[11px] font-mono text-ink focus:outline-none focus:border-teal/60 transition-colors cursor-pointer max-w-[150px] truncate"
        >
          {options.map((o) => (
            <option key={o} value={o} className="bg-panel2">
              {o}
            </option>
          ))}
        </select>
        <IconChevron className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-dim pointer-events-none" />
      </span>
    </label>
  );
}

/* ---------------- anel de qualidade ---------------- */

export function QualityRing({ score, size = 116 }: { score: number; size?: number }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);
  const color = score >= 90 ? "#3edcb4" : score >= 75 ? "#f4b860" : "#f2796b";
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(c * (1 - score / 100)));
    return () => cancelAnimationFrame(id);
  }, [score, c]);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display font-bold text-[26px] leading-none" style={{ color }}>
          {score}
        </div>
        <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-dim mt-1">qualidade</div>
      </div>
    </div>
  );
}

/* ---------------- ícones (SVG inline) ---------------- */

type IconProps = { className?: string };
const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const LogoMark = ({ className = "w-7 h-7" }: IconProps) => (
  <svg viewBox="0 0 32 32" className={className} {...S}>
    <path d="M16 4 29 27H3L16 4Z" stroke="#3edcb4" strokeWidth="2" />
    <path d="M16 13v14" stroke="#3edcb4" strokeWidth="1.4" opacity="0.7" />
    <path d="M3 17h6" stroke="#f4b860" strokeWidth="1.6" />
    <path d="M20 22l8-5" stroke="#66b7f0" strokeWidth="1.6" />
    <path d="M20 25l9 2" stroke="#f2796b" strokeWidth="1.6" />
  </svg>
);

export const IconUpload = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const IconPaste = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="6" y="5" width="12" height="16" rx="2" />
    <path d="M9 5a3 3 0 0 1 6 0M9.5 11h5M9.5 14.5h5M9.5 18h3" />
  </svg>
);

export const IconTable = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M9.5 9.5V20M15.5 9.5V20" />
  </svg>
);

export const IconDownload = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 4v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
  </svg>
);

export const IconArrowLeft = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
  </svg>
);

export const IconCheck = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconX = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconAlert = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4.5M12 17.6v.2" />
  </svg>
);

export const IconChevron = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconLock = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);

export const IconZap = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
);

export const IconFlask = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M10 3v6.2L4.6 18a2.4 2.4 0 0 0 2.1 3.5h10.6a2.4 2.4 0 0 0 2.1-3.5L14 9.2V3" />
    <path d="M8.5 3h7M7.5 14.5h9" />
  </svg>
);

export const IconWave = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M3 12c2.2-5 4.3-5 6.5 0s4.3 5 6.5 0 3.3-4.2 5 0" />
  </svg>
);

export const IconGrid = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);

export const IconCap = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m12 4 10 5-10 5L2 9l10-5Z" />
    <path d="M6.5 11.2V15c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-3.8" />
    <path d="M22 9v5" />
  </svg>
);

export const IconChat = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12Z" />
    <path d="M8.5 10.5h7M8.5 13.5h4.5" />
  </svg>
);

export const IconSend = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M21 3 10.5 13.5M21 3l-7 18-3.5-7.5L3 10l18-7Z" />
  </svg>
);

export const IconChevronRight = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconSpark = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

export const IconBook = ({ className = "w-4 h-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
    <path d="M8.5 7.5h7" />
  </svg>
);
