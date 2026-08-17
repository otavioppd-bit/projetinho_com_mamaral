import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area,
  LabelList, Brush,
} from "recharts";
import type { ColumnProfile, TimePoint } from "../lib/analyze";
import { fmtSmart } from "../lib/analyze";
import { truncate } from "./ui";

/* Paleta via tokens — reage ao tema ativo (Prisma / Ameba) */
export const PALETTE = [
  "var(--color-teal)",
  "var(--color-amber)",
  "var(--color-coral)",
  "var(--color-sky)",
  "var(--color-mint)",
  "var(--color-vio)",
  "var(--color-sand)",
  "var(--color-steel)",
];

const GRID = "var(--color-line)";
const CURSOR = "var(--color-line2)";
const MONO = "'Spline Sans Mono', ui-monospace, monospace";

const AXIS = { stroke: "transparent", tickLine: false as const, axisLine: { stroke: GRID } };

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      {label !== undefined && label !== "" && <div className="text-dim mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[3px] inline-block shrink-0" style={{ background: p.color || p.fill || "var(--color-teal)" }} />
          <span className="text-mut">{p.name}:</span>
          <span className="font-semibold">
            {typeof p.value === "number"
              ? p.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="h-full min-h-[180px] border border-dashed border-line rounded-lg flex items-center justify-center p-6">
      <p className="font-mono text-xs text-dim text-center">{msg}</p>
    </div>
  );
}

/* ================= histograma ================= */

export function Histogram({ profile }: { profile: ColumnProfile | undefined }) {
  const [k, setK] = useState(() =>
    Math.max(9, Math.min(26, Math.round(Math.sqrt(profile?.values?.length ?? 100))))
  );
  const bins = useMemo(() => {
    const v = profile?.values;
    if (!v || !v.length) return [];
    const min = profile!.min!;
    const max = profile!.max!;
    const w = (max - min) / k || 1;
    const arr = Array.from({ length: k }, (_, i) => ({
      x0: min + i * w,
      x1: min + (i + 1) * w,
      label: fmtSmart(min + i * w),
      count: 0,
    }));
    v.forEach((x) => {
      const i = Math.min(k - 1, Math.max(0, Math.floor((x - min) / w)));
      arr[i].count++;
    });
    return arr;
  }, [profile, k]);

  if (!profile?.values?.length) return <EmptyChart msg="Sem valores numéricos suficientes para distribuição." />;

  const w = bins.length ? bins[0].x1 - bins[0].x0 : 1;
  const idxOf = (val: number) =>
    Math.min(bins.length - 1, Math.max(0, Math.floor((val - profile.min!) / (w || 1))));
  const meanBin = bins[idxOf(profile.mean!)].label;
  const medBin = bins[idxOf(profile.median!)].label;

  return (
    <div className="flex flex-col h-full">
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="12%">
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 6" />
            <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={30} />
            <YAxis {...AXIS} width={54} tickFormatter={(v: number) => fmtSmart(v)} />
            <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in srgb, var(--color-teal) 6%, transparent)" }} />
            <ReferenceLine x={meanBin} stroke="var(--color-amber)" strokeDasharray="5 4" label={{ value: "média", fill: "var(--color-amber)", fontSize: 10, fontFamily: MONO, position: "insideTopRight" }} />
            <ReferenceLine x={medBin} stroke="var(--color-tealhi)" strokeDasharray="5 4" label={{ value: "mediana", fill: "var(--color-tealhi)", fontSize: 10, fontFamily: MONO, position: "insideTopLeft" }} />
            <Bar dataKey="count" name="frequência" fill="var(--color-teal)" fillOpacity={0.82} radius={[3, 3, 0, 0]} maxBarSize={42} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-line">
        <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim shrink-0">bins</label>
        <input
          type="range"
          min={6}
          max={44}
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
          className="flex-1 accent-teal cursor-pointer"
        />
        <span className="font-mono text-[11px] font-bold text-tealhi w-7 text-right tabular-nums">{k}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {[
          ["média", fmtSmart(profile.mean!)],
          ["mediana", fmtSmart(profile.median!)],
          ["desvio σ", fmtSmart(profile.std!)],
          ["assimetria g₁", (profile.skew ?? 0).toFixed(2).replace(".", ",")],
        ].map(([key, v]) => (
          <div key={key} className="text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">{key}</div>
            <div className="font-mono text-sm font-semibold text-ink mt-0.5">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= barras categóricas ================= */

export function CategoryBars({ profile }: { profile: ColumnProfile | undefined }) {
  const [sort, setSort] = useState<"desc" | "asc" | "abc">("desc");
  const [mode, setMode] = useState<"count" | "pct">("count");

  const data = useMemo(() => {
    const base = (profile?.top ?? []).slice(0, 8).map((t) => ({
      value: truncate(t.value, 16),
      full: t.value,
      count: t.count,
      pct: t.pct,
    }));
    if (sort === "asc") return [...base].sort((a, b) => a.count - b.count);
    if (sort === "abc") return [...base].sort((a, b) => a.full.localeCompare(b.full, "pt-BR"));
    return base;
  }, [profile, sort]);

  if (!data.length) return <EmptyChart msg="Nenhuma coluna categórica disponível." />;

  const Toggle = ({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: any) => void }) => (
    <div className="flex rounded-md border border-line overflow-hidden">
      {options.map(([id, lb]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-colors ${
            value === id ? "bg-teal/[0.14] text-tealhi" : "text-dim hover:text-mut"
          }`}
        >
          {lb}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Toggle options={[["desc", "↓ valor"], ["asc", "↑ valor"], ["abc", "A–Z"]]} value={sort} onChange={setSort} />
        <Toggle options={[["count", "nº"], ["pct", "%"]]} value={mode} onChange={setMode} />
        <span className="font-mono text-[9px] text-dim ml-auto">{(profile?.unique ?? 0)} categorias únicas</span>
      </div>
      <div className="flex-1 min-h-[200px]" style={{ minHeight: Math.max(200, data.length * 34 + 10) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 42, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 6" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="value"
              width={112}
              tick={{ fill: "var(--color-mut)", fontSize: 10.5, fontFamily: MONO }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in srgb, var(--color-teal) 5%, transparent)" }} />
            <Bar dataKey={mode} name={mode === "count" ? "registros" : "%"} fill="var(--color-teal)" fillOpacity={0.85} radius={[0, 3, 3, 0]} barSize={17} isAnimationActive={false}>
              <LabelList
                dataKey={mode === "count" ? "count" : "pct"}
                position="right"
                formatter={(v: any) => (mode === "count" ? Number(v).toLocaleString("pt-BR") : `${Number(v).toFixed(0)}%`)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ================= donut ================= */

export function Donut({ profile }: { profile: ColumnProfile | undefined }) {
  const [active, setActive] = useState<number | null>(null);
  const top = (profile?.top ?? []).slice(0, 5);
  const rest = (profile?.top ?? []).slice(5);
  const data = [
    ...top,
    ...(rest.length ? [{ value: "Demais", count: rest.reduce((s, t) => s + t.count, 0), pct: rest.reduce((s, t) => s + t.pct, 0) }] : []),
  ];
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!data.length) return <EmptyChart msg="Nenhuma coluna categórica disponível." />;

  const sel = active !== null ? data[active] : null;

  return (
    <div className="flex items-center gap-4 h-full min-h-[220px]">
      <div className="relative w-[46%] h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="value"
              innerRadius="62%"
              outerRadius={sel ? "96%" : "92%"}
              paddingAngle={2}
              stroke="none"
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{ outline: "none", cursor: "pointer", transition: "outer-radius .2s" }}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={PALETTE[i % PALETTE.length]}
                  fillOpacity={active === null || active === i ? 0.92 : 0.28}
                  style={{ transition: "fill-opacity .25s ease" }}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
          {sel ? (
            <>
              <span className="font-display font-bold text-[17px] leading-tight" style={{ color: PALETTE[active! % PALETTE.length] }}>
                {sel.pct.toFixed(1).replace(".", ",")}%
              </span>
              <span className="font-mono text-[9px] text-mut mt-0.5 truncate max-w-full">{sel.value}</span>
            </>
          ) : (
            <>
              <span className="font-display font-bold text-xl leading-none">{total.toLocaleString("pt-BR")}</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-dim mt-1">registros</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        {data.map((d, i) => (
          <button
            key={d.value}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={`w-full flex items-center gap-2 text-xs rounded-md px-1.5 py-1 -mx-1.5 text-left transition-colors ${
              active === i ? "bg-panel2" : ""
            } ${active !== null && active !== i ? "opacity-45" : ""}`}
          >
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-mut truncate flex-1">{d.value}</span>
            <span className="font-mono text-ink font-semibold">{d.pct.toFixed(0)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================= dispersão + regressão ================= */

export function ScatterFit({ xName, yName, xs, ys }: { xName: string; yName: string; xs?: number[]; ys?: number[] }) {
  const model = useMemo(() => {
    if (!xs || !ys) return null;
    const n = Math.min(xs.length, ys.length);
    if (n < 3) return null;
    const step = Math.max(1, Math.ceil(n / 380));
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i += step) pts.push({ x: xs[i], y: ys[i] });
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    let cov = 0, vx = 0, vy = 0;
    pts.forEach((p) => {
      cov += (p.x - mx) * (p.y - my);
      vx += (p.x - mx) ** 2;
      vy += (p.y - my) ** 2;
    });
    const slope = vx ? cov / vx : 0;
    const intercept = my - slope * mx;
    const r = vx && vy ? cov / Math.sqrt(vx * vy) : 0;
    const xmin = Math.min(...pts.map((p) => p.x));
    const xmax = Math.max(...pts.map((p) => p.x));
    return { pts, slope, intercept, r, xmin, xmax };
  }, [xs, ys]);

  const [showFit, setShowFit] = useState(true);

  if (!model) return <EmptyChart msg="São necessárias duas colunas numéricas com variância." />;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[9.5px] text-dim">n = {model.pts.length} pontos amostrados</span>
        <button
          onClick={() => setShowFit((v) => !v)}
          className={`flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-widest rounded border px-2 py-1 transition-colors ${
            showFit ? "text-amber border-amber/40 bg-amber/[0.08]" : "text-dim border-line hover:text-mut"
          }`}
        >
          <span className={`w-2 h-2 rounded-full inline-block ${showFit ? "bg-amber" : "bg-line2"}`} />
          reta OLS
        </button>
      </div>
      <div className="h-[222px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 12, left: -6, bottom: 2 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 6" />
            <XAxis type="number" dataKey="x" name={xName} domain={["auto", "auto"]} {...AXIS} tickFormatter={(v: number) => fmtSmart(v)} tickCount={7} />
            <YAxis type="number" dataKey="y" name={yName} domain={["auto", "auto"]} width={56} tickFormatter={(v: number) => fmtSmart(v)} tickLine={false} axisLine={{ stroke: GRID }} />
            <Tooltip content={<ChartTip />} cursor={{ strokeDasharray: "4 4", stroke: CURSOR }} />
            {showFit && (
              <ReferenceLine
                segment={[
                  { x: model.xmin, y: model.slope * model.xmin + model.intercept },
                  { x: model.xmax, y: model.slope * model.xmax + model.intercept },
                ]}
                stroke="var(--color-amber)"
                strokeWidth={2}
                strokeDasharray="7 5"
              />
            )}
            <Scatter data={model.pts} fill="var(--color-teal)" fillOpacity={0.62} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3 pt-3 border-t border-line font-mono text-[11px] flex-wrap">
        <span className="text-dim">ŷ = {model.slope.toFixed(3).replace(".", ",")}·x {model.intercept >= 0 ? "+" : "−"} {Math.abs(model.intercept).toFixed(1).replace(".", ",")}</span>
        <span className="text-amber ml-auto">r = {model.r.toFixed(2).replace(".", ",")}</span>
        <span className="text-teal">r² = {(model.r ** 2).toFixed(2).replace(".", ",")}</span>
      </div>
    </div>
  );
}

/* ================= série temporal ================= */

export function TimeSeries({ points, yName }: { points: TimePoint[]; yName: string }) {
  if (!points.length) return <EmptyChart msg="Sem pares data × valor suficientes." />;
  const avg = points.reduce((s, p) => s + p.v, 0) / points.length;
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-teal)" stopOpacity={0.34} />
              <stop offset="100%" stopColor="var(--color-teal)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 6" />
          <XAxis dataKey="t" {...AXIS} minTickGap={36} />
          <YAxis {...AXIS} width={56} tickFormatter={(v: number) => fmtSmart(v)} domain={["auto", "auto"]} />
          <Tooltip
            content={({ active, payload, label }: any) =>
              active && payload?.length ? (
                <div className="tip">
                  <div className="text-dim mb-1">{label}</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-[3px] bg-teal inline-block" />
                    <span className="text-mut">média de {yName}:</span>
                    <span className="font-semibold">{fmtSmart(payload[0].value)}</span>
                  </div>
                  <div className="text-dim mt-0.5">n = {payload[0].payload.c} amostras</div>
                </div>
              ) : null
            }
          />
          <ReferenceLine
            y={avg}
            stroke="var(--color-amber)"
            strokeDasharray="6 5"
            label={{ value: `média ${fmtSmart(avg)}`, fill: "var(--color-amber)", fontSize: 10, fontFamily: MONO, position: "insideTopRight" }}
          />
          <Area type="monotone" dataKey="v" name={yName} stroke="var(--color-teal)" strokeWidth={2.2} fill="url(#tsGrad)" activeDot={{ r: 4, fill: "var(--color-tealhi)", stroke: "var(--color-abyss)" }} />
          {points.length > 14 && (
            <Brush
              dataKey="t"
              height={24}
              travellerWidth={9}
              stroke={CURSOR}
              fill="var(--color-abyss)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      {points.length > 14 && (
        <p className="font-mono text-[9.5px] text-dim mt-1.5 text-right">
          arraste as alças para dar zoom no período
        </p>
      )}
    </div>
  );
}

/* ================= boxplots (SVG próprio) ================= */

export function BoxPlots({ profiles }: { profiles: ColumnProfile[] }) {
  const rows = profiles.filter((p) => p.values?.length).slice(0, 6);
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return <EmptyChart msg="Sem colunas numéricas para boxplot." />;

  const W = 760;
  const rowH = 56;
  const top = 8;
  const H = top + rows.length * rowH + 6;
  const x0 = 176;
  const x1 = W - 26;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {rows.map((p, i) => {
          const vals = p.values!;
          const lo = p.min!;
          const hi = p.max!;
          const pad = (hi - lo) * 0.05 || 1;
          const sc = (v: number) => x0 + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (x1 - x0);
          const fenceLo = p.q1! - 1.5 * p.iqr!;
          const fenceHi = p.q3! + 1.5 * p.iqr!;
          const inside = vals.filter((v) => v >= fenceLo && v <= fenceHi);
          const wLo = inside.length ? Math.min(...inside) : p.q1!;
          const wHi = inside.length ? Math.max(...inside) : p.q3!;
          const outliers = vals.filter((v) => v < fenceLo || v > fenceHi).slice(0, 28);
          const cy = top + i * rowH + rowH / 2;
          const active = hover === i;
          return (
            <g key={p.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
              <rect x={0} y={top + i * rowH} width={W} height={rowH} fill={active ? "color-mix(in srgb, var(--color-teal) 4.5%, transparent)" : "transparent"} rx={6} />
              <text x={12} y={cy - 3} fill={active ? "var(--color-ink)" : "var(--color-mut)"} fontSize="11.5" fontFamily={MONO} fontWeight={600}>
                {truncate(p.name, 18)}
              </text>
              <text x={12} y={cy + 12} fill="var(--color-dim)" fontSize="9" fontFamily={MONO}>
                n={vals.length} · {p.outlierCount} outl.
              </text>
              {/* bigodes */}
              <line x1={sc(wLo)} x2={sc(p.q1!)} y1={cy} y2={cy} stroke={CURSOR} strokeWidth={1.4} />
              <line x1={sc(p.q3!)} x2={sc(wHi)} y1={cy} y2={cy} stroke={CURSOR} strokeWidth={1.4} />
              <line x1={sc(wLo)} x2={sc(wLo)} y1={cy - 7} y2={cy + 7} stroke={CURSOR} strokeWidth={1.4} />
              <line x1={sc(wHi)} x2={sc(wHi)} y1={cy - 7} y2={cy + 7} stroke={CURSOR} strokeWidth={1.4} />
              {/* caixa */}
              <rect
                x={sc(p.q1!)}
                y={cy - 12}
                width={Math.max(2, sc(p.q3!) - sc(p.q1!))}
                height={24}
                rx={4}
                fill={active ? "color-mix(in srgb, var(--color-teal) 28%, transparent)" : "color-mix(in srgb, var(--color-teal) 16%, transparent)"}
                stroke="var(--color-teal)"
                strokeWidth={1.3}
              />
              <line x1={sc(p.median!)} x2={sc(p.median!)} y1={cy - 12} y2={cy + 12} stroke="var(--color-amber)" strokeWidth={2.2} />
              {/* outliers */}
              {outliers.map((v, j) => (
                <circle key={j} cx={sc(v)} cy={cy + ((j % 3) - 1) * 4} r={2.6} fill="var(--color-coral)" fillOpacity={0.85} />
              ))}
            </g>
          );
        })}
      </svg>
      {hover !== null && rows[hover] && (
        <div className="tip absolute right-0 top-0">
          <div className="text-dim mb-1">{rows[hover].name}</div>
          <div>Q1 <b>{fmtSmart(rows[hover].q1!)}</b> · mediana <b className="text-amber">{fmtSmart(rows[hover].median!)}</b> · Q3 <b>{fmtSmart(rows[hover].q3!)}</b></div>
          <div className="text-mut">IQR {fmtSmart(rows[hover].iqr!)} · cercas 1,5×IQR · <span className="text-coral">{rows[hover].outlierCount} outliers</span></div>
        </div>
      )}
    </div>
  );
}

/* ================= heatmap de correlação (SVG próprio) ================= */

export function Heatmap({ cols, matrix }: { cols: string[]; matrix: number[][] }) {
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const n = cols.length;
  if (n < 2) return <EmptyChart msg="São necessárias ao menos duas colunas numéricas." />;

  const cell = n > 8 ? 30 : n > 6 ? 36 : 46;
  const labelW = 122;
  const topH = 88;
  const W = labelW + n * cell + 6;
  const H = topH + n * cell + 6;

  const colorOf = (r: number) => {
    const a = Math.round((0.1 + Math.abs(r) * 0.8) * 100);
    return r >= 0
      ? `color-mix(in srgb, var(--color-teal) ${a}%, transparent)`
      : `color-mix(in srgb, var(--color-coral) ${a}%, transparent)`;
  };

  return (
    <div className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[420px]">
        {cols.map((c, j) => (
          <text
            key={`t${j}`}
            x={labelW + j * cell + cell / 2 + 4}
            y={topH - 10}
            fill={hover?.j === j ? "var(--color-ink)" : "var(--color-dim)"}
            fontSize="9.5"
            fontFamily={MONO}
            transform={`rotate(-40 ${labelW + j * cell + cell / 2 + 4} ${topH - 10})`}
            textAnchor="start"
          >
            {truncate(c, 14)}
          </text>
        ))}
        {cols.map((r, i) => (
          <text
            key={`l${i}`}
            x={labelW - 10}
            y={topH + i * cell + cell / 2 + 3.5}
            fill={hover?.i === i ? "var(--color-ink)" : "var(--color-mut)"}
            fontSize="10"
            fontFamily={MONO}
            textAnchor="end"
          >
            {truncate(r, 15)}
          </text>
        ))}
        {matrix.map((row, i) =>
          row.map((r, j) => {
            const active = hover?.i === i && hover?.j === j;
            return (
              <g key={`${i}-${j}`} onMouseEnter={() => setHover({ i, j })} onMouseLeave={() => setHover(null)}>
                <rect
                  x={labelW + j * cell + 1.5}
                  y={topH + i * cell + 1.5}
                  width={cell - 3}
                  height={cell - 3}
                  rx={5}
                  fill={colorOf(r)}
                  stroke={active ? "var(--color-ink)" : "transparent"}
                  strokeWidth={1.2}
                />
                {n <= 8 && i !== j && (
                  <text
                    x={labelW + j * cell + cell / 2}
                    y={topH + i * cell + cell / 2 + 3.5}
                    textAnchor="middle"
                    fontSize={n > 6 ? 8.5 : 10}
                    fontFamily={MONO}
                    fontWeight={600}
                    fill={Math.abs(r) > 0.55 ? "var(--color-abyss)" : "var(--color-mut)"}
                    pointerEvents="none"
                  >
                    {r.toFixed(2).replace("0.", ".").replace("-0.", "-.").replace("1.00", "1")}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
      <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-dim">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] inline-block" style={{ background: "color-mix(in srgb, var(--color-coral) 80%, transparent)" }} /> inversa
        </span>
        {hover ? (
          <span className="text-ink">
            {cols[hover.i]} × {cols[hover.j]} → <b style={{ color: matrix[hover.i][hover.j] >= 0 ? "var(--color-teal)" : "var(--color-coral)" }}>r = {matrix[hover.i][hover.j].toFixed(2).replace(".", ",")}</b>
          </span>
        ) : (
          <span>Pearson · passe o cursor para inspecionar</span>
        )}
        <span className="flex items-center gap-2">
          direta <span className="w-3 h-3 rounded-[3px] inline-block" style={{ background: "color-mix(in srgb, var(--color-teal) 80%, transparent)" }} />
        </span>
      </div>
    </div>
  );
}

/* ================= matriz de lacunas ================= */

export function MissingBars({ profiles }: { profiles: ColumnProfile[] }) {
  const total = profiles.reduce((s, p) => s + p.missing, 0);
  if (total === 0) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs text-teal">
        <span className="w-1.5 h-1.5 rounded-full bg-teal pulse-dot inline-block" />
        nenhuma lacuna encontrada — conjunto íntegro
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {profiles.map((p) => {
        const pct = p.missingPct;
        const color = pct === 0 ? "var(--color-line2)" : pct < 5 ? "var(--color-sky)" : pct < 12 ? "var(--color-amber)" : "var(--color-coral)";
        return (
          <div key={p.name} className="flex items-center gap-3 group">
            <span className="w-36 truncate font-mono text-[11px] text-mut group-hover:text-ink transition-colors">{p.name}</span>
            <div className="flex-1 h-[7px] bg-line/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pct, pct > 0 ? 1.6 : 0.4)}%`, background: color, opacity: pct === 0 ? 0.4 : 1 }}
              />
            </div>
            <span className="w-14 text-right font-mono text-[11px]" style={{ color: pct > 0 ? color : "var(--color-dim)" }}>
              {pct.toFixed(1).replace(".", ",")}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
