import { useMemo, useState } from "react";
import type { Dataset } from "../lib/analyze";
import { fmtCompact, fmtNum } from "./ui";

/* Mapa coroplético estilizado do Brasil por macrorregião.
   Orientado a dados: detecta uma coluna de região no dataset,
   agrega a métrica escolhida e colore cada região. */

interface Region {
  id: string;
  label: string;
  path: string;
  lx: number;
  ly: number;
}

const REGIONS: Region[] = [
  { id: "norte", label: "Norte", lx: 195, ly: 88, path: "M150,22 L300,50 L348,118 L292,148 L150,142 L96,118 L40,148 L56,96 Z" },
  { id: "nordeste", label: "Nordeste", lx: 333, ly: 178, path: "M348,118 L382,168 L344,232 L296,196 L292,148 Z" },
  { id: "centro-oeste", label: "Centro-Oeste", lx: 212, ly: 203, path: "M150,142 L292,148 L296,196 L288,252 L178,268 L132,220 Z" },
  { id: "sudeste", label: "Sudeste", lx: 297, ly: 258, path: "M296,196 L344,232 L330,278 L290,300 L254,282 L288,252 Z" },
  { id: "sul", label: "Sul", lx: 228, ly: 318, path: "M178,268 L288,252 L254,282 L290,300 L292,330 L240,365 L190,330 L160,300 Z" },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

function toRegionId(raw: string): string | null {
  const n = norm(raw);
  if (n === "norte") return "norte";
  if (n === "nordeste") return "nordeste";
  if (n === "sudeste") return "sudeste";
  if (n === "sul") return "sul";
  if (n.startsWith("centro")) return "centro-oeste";
  return null;
}

const DEMO: Record<string, { value: number; count: number }> = {
  norte: { value: 18, count: 18 },
  nordeste: { value: 52, count: 52 },
  "centro-oeste": { value: 31, count: 31 },
  sudeste: { value: 128, count: 128 },
  sul: { value: 64, count: 64 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function heat(t: number): string {
  const e = Math.pow(t, 0.72);
  const ameba = typeof document !== "undefined" && document.documentElement.dataset.theme === "ameba";
  if (ameba) {
    /* midnight → signal blue elétrico */
    const r = Math.round(lerp(8, 63, e));
    const g = Math.round(lerp(15, 91, e));
    const b = Math.round(lerp(70, 255, e));
    return `rgb(${r},${g},${b})`;
  }
  const r = Math.round(lerp(16, 124, e));
  const g = Math.round(lerp(29, 245, e));
  const b = Math.round(lerp(27, 214, e));
  return `rgb(${r},${g},${b})`;
}

export function GeoMap({
  ds,
  metricCol,
  onMetricCol,
}: {
  ds: Dataset;
  metricCol: string; // "__count__" ou nome de coluna numérica
  onMetricCol: (c: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  /* detecta coluna de região */
  const regionCol = useMemo(() => {
    for (const c of ds.categoricalCols) {
      const prof = ds.profiles.find((p) => p.name === c);
      const tops = prof?.top ?? [];
      if (!tops.length) continue;
      const matched = tops.filter((t) => toRegionId(t.value) !== null).length;
      if (matched >= Math.min(3, tops.length) && matched / tops.length >= 0.5) return c;
    }
    return null;
  }, [ds]);

  const hasRegion = regionCol !== null;
  const useDemo = demo || !hasRegion;

  const agg = useMemo(() => {
    const out: Record<string, { value: number; count: number }> = {};
    REGIONS.forEach((r) => (out[r.id] = { value: 0, count: 0 }));

    if (useDemo) {
      REGIONS.forEach((r) => (out[r.id] = { ...DEMO[r.id] }));
      return out;
    }

    const ci = ds.columns.indexOf(regionCol!);
    const isCount = metricCol === "__count__";
    const mi = isCount ? -1 : ds.columns.indexOf(metricCol);

    ds.rows.forEach((row) => {
      const rid = toRegionId(String(row[ci] ?? ""));
      if (!rid) return;
      const v = isCount ? 1 : Number(row[mi]);
      out[rid].count += 1;
      if (!Number.isNaN(v)) out[rid].value += isCount ? 1 : v;
    });
    return out;
  }, [ds, regionCol, metricCol, useDemo]);

  const max = Math.max(1, ...REGIONS.map((r) => agg[r.id].value));
  const total = REGIONS.reduce((s, r) => s + agg[r.id].value, 0);
  const ranked = [...REGIONS].sort((a, b) => agg[b.id].value - agg[a.id].value);
  const metricLabel = metricCol === "__count__" ? "nº de registros" : metricCol;

  const metricOptions = ["__count__", ...ds.numericCols];

  return (
    <div className="flex flex-col h-full">
      {/* controles */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim">métrica</span>
        <select
          value={metricCol}
          onChange={(e) => onMetricCol(e.target.value)}
          className="appearance-none bg-panel2 border border-line hover:border-line2 rounded-md px-2.5 py-1.5 text-[11px] font-mono text-ink focus:outline-none focus:border-teal/60 cursor-pointer max-w-[170px] truncate"
        >
          {metricOptions.map((o) => (
            <option key={o} value={o} className="bg-panel2">
              {o === "__count__" ? "nº de registros" : o}
            </option>
          ))}
        </select>

        {useDemo && !demo && (
          <span className="font-mono text-[9px] text-amber border border-amber/30 bg-amber/[0.07] rounded px-2 py-1">
            sem coluna de região — exibindo demonstração
          </span>
        )}
        {demo && (
          <button
            onClick={() => setDemo(false)}
            className="font-mono text-[9px] uppercase tracking-widest text-teal border border-teal/35 bg-teal/[0.08] rounded px-2 py-1 hover:bg-teal/[0.16] transition-colors"
          >
            voltar aos meus dados
          </button>
        )}
        {hasRegion && !demo && (
          <span className="font-mono text-[9px] text-teal border border-teal/30 bg-teal/[0.07] rounded px-2 py-1">
            região detectada: {regionCol}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 flex-1 items-stretch">
        {/* mapa */}
        <div className="relative flex-1 min-w-0">
          <svg viewBox="0 0 400 380" className="w-full h-auto">
            <defs>
              <filter id="mapGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {REGIONS.map((r) => {
              const t = agg[r.id].value / max;
              const active = hover === r.id;
              const empty = agg[r.id].count === 0;
              return (
                <g
                  key={r.id}
                  onMouseEnter={() => setHover(r.id)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "default" }}
                >
                  <path
                    d={r.path}
                    fill={empty ? "var(--color-panel)" : heat(t)}
                    fillOpacity={empty ? 1 : active ? 1 : 0.88}
                    stroke={active ? "var(--color-tealhi)" : "var(--color-line)"}
                    strokeWidth={active ? 2 : 1.2}
                    strokeDasharray={empty ? "4 4" : undefined}
                    filter={active ? "url(#mapGlow)" : undefined}
                    style={{ transition: "fill 0.4s ease, stroke 0.2s ease" }}
                  />
                  <text
                    x={r.lx}
                    y={r.ly}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={700}
                    fontFamily="var(--font-display)"
                    fill={
                      document.documentElement.dataset.theme === "ameba"
                        ? t > 0.3
                          ? "var(--color-ink)"
                          : "var(--color-dim)"
                        : t > 0.55
                          ? "var(--color-abyss)"
                          : "var(--color-mut)"
                    }
                    pointerEvents="none"
                  >
                    {r.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* legenda de cor */}
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-[9px] text-dim">menos</span>
            <div
              className="flex-1 h-2 rounded-full"
              style={{ background: `linear-gradient(90deg, ${heat(0.02)}, ${heat(0.5)}, ${heat(1)})` }}
            />
            <span className="font-mono text-[9px] text-dim">mais · {metricLabel}</span>
          </div>
        </div>

        {/* painel de detalhe + ranking */}
        <div className="sm:w-[190px] shrink-0 flex flex-col gap-3">
          <div className="rounded-lg border border-line bg-abyss/50 px-3.5 py-3 min-h-[74px]">
            {hover ? (
              <>
                <p className="font-display font-semibold text-[15px] text-tealhi">
                  {REGIONS.find((r) => r.id === hover)?.label}
                </p>
                <p className="font-mono text-[11px] text-ink mt-1">
                  {fmtNum(agg[hover].value, metricCol === "__count__" ? 0 : 1)}
                  <span className="text-dim"> · {metricLabel}</span>
                </p>
                <p className="font-mono text-[10px] text-mut mt-0.5">
                  {total > 0 ? ((agg[hover].value / total) * 100).toFixed(1).replace(".", ",") : "0"}% do total ·{" "}
                  {fmtNum(agg[hover].count)} linhas
                </p>
              </>
            ) : (
              <p className="font-mono text-[10px] text-dim leading-relaxed">
                Passe o cursor sobre uma região para inspecionar {metricLabel}.
              </p>
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            {ranked.map((r, i) => (
              <button
                key={r.id}
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover(null)}
                className={`w-full flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                  hover === r.id ? "border-teal/45 bg-teal/[0.07]" : "border-line bg-panel/60 hover:bg-panel2"
                }`}
              >
                <span className="font-mono text-[10px] text-dim w-4">{i + 1}º</span>
                <span className="text-[11.5px] text-ink flex-1 truncate">{r.label}</span>
                <span className="font-mono text-[11px] font-semibold text-tealhi">
                  {fmtCompact(agg[r.id].value)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
