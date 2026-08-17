import { useMemo, useState } from "react";
import type { Dataset } from "../lib/analyze";
import { buildTimeSeries } from "../lib/analyze";
import {
  AnimatedNumber, ChartCard, IconAlert, IconArrowLeft, IconCheck, IconDownload,
  IconWave, IconX, QualityRing, Reveal, SectionHead, Select, fmtNum, truncate,
} from "./ui";
import {
  BoxPlots, CategoryBars, Donut, Heatmap, Histogram, MissingBars, ScatterFit, TimeSeries,
} from "./charts";

const KIND_META = {
  remove: { icon: IconX, color: "#f2796b", label: "remoção" },
  impute: { icon: IconCheck, color: "#3edcb4", label: "imputação" },
  flag: { icon: IconAlert, color: "#f4b860", label: "sinalização" },
  normalize: { icon: IconWave, color: "#66b7f0", label: "normalização" },
} as const;

const INSIGHT_STYLE = {
  warn: { color: "#f4b860", tag: "atenção", border: "border-amber/30", bg: "bg-amber/[0.07]" },
  good: { color: "#3edcb4", tag: "sinal forte", border: "border-teal/30", bg: "bg-teal/[0.07]" },
  info: { color: "#66b7f0", tag: "leitura", border: "border-sky/30", bg: "bg-sky/[0.07]" },
} as const;

export function Dashboard({ ds, onNew }: { ds: Dataset; onNew: () => void }) {
  const prof = (n: string) => ds.profiles.find((p) => p.name === n);

  /* --- estado dos seletores --- */
  const [histCol, setHistCol] = useState(ds.numericCols[0] ?? "");
  const [barCol, setBarCol] = useState(ds.categoricalCols[0] ?? "");
  const [donutCol, setDonutCol] = useState(ds.categoricalCols[Math.min(1, Math.max(0, ds.categoricalCols.length - 1))] ?? ds.categoricalCols[0] ?? "");

  const bestPair = useMemo(() => {
    const { cols, matrix } = ds.correlation;
    let best = { x: cols[0] ?? "", y: cols[1] ?? cols[0] ?? "", r: 0 };
    for (let i = 0; i < cols.length; i++)
      for (let j = i + 1; j < cols.length; j++)
        if (Math.abs(matrix[i][j]) > Math.abs(best.r)) best = { x: cols[i], y: cols[j], r: matrix[i][j] };
    return best;
  }, [ds]);

  const [scatX, setScatX] = useState(bestPair.x);
  const [scatY, setScatY] = useState(bestPair.y);
  const [tsCol, setTsCol] = useState(ds.numericCols[0] ?? "");

  const timePoints = useMemo(
    () => (ds.dateCols.length && tsCol ? buildTimeSeries(ds.rows, ds.dateCols[0], tsCol, ds.columns) : []),
    [ds, tsCol]
  );

  /* --- métricas --- */
  const imputed = ds.actions.filter((a) => a.kind === "impute").reduce((s, a) => s + a.count, 0);
  const outliers = ds.actions.find((a) => a.kind === "flag")?.count ?? 0;
  const dupes = ds.actions.find((a) => a.kind === "remove")?.count ?? 0;

  const kpis = [
    { label: "linhas limpas", value: ds.finalRows, sub: `de ${fmtNum(ds.originalRows)} originais` },
    { label: "variáveis", value: ds.columns.length, sub: `${ds.numericCols.length} numéricas` },
    { label: "células imputadas", value: imputed, sub: "mediana · N/D" },
    { label: "outliers", value: outliers, sub: "Tukey 1,5×IQR" },
    { label: "duplicatas removidas", value: dupes, sub: "correspondência exata" },
  ];

  const exportReport = () => {
    const report = {
      gerador: "PRISMA · motor local v2.4",
      exportadoEm: new Date().toISOString(),
      fonte: ds.name,
      resumo: {
        linhasOriginais: ds.originalRows,
        linhasLimpas: ds.finalRows,
        colunas: ds.columns.length,
        scoreQualidade: ds.quality,
      },
      limpeza: ds.actions.map((a) => ({ intervencao: a.label, quantidade: a.count, tipo: a.kind })),
      perfilamento: ds.profiles.map((p) => ({
        coluna: p.name,
        tipo: p.type,
        nulos: p.missing,
        nulosPct: +p.missingPct.toFixed(2),
        unicos: p.unique,
        ...(p.type === "numeric"
          ? {
              media: +p.mean!.toFixed(4), mediana: p.median!, desvioPadrao: +p.std!.toFixed(4),
              minimo: p.min!, maximo: p.max!, q1: p.q1!, q3: p.q3!, iqr: +p.iqr!.toFixed(4),
              assimetria: +p.skew!.toFixed(4), outliers: p.outlierCount,
            }
          : {}),
        ...(p.top ? { categoriasPrincipais: p.top.slice(0, 6) } : {}),
      })),
      correlacaoPearson: { colunas: ds.correlation.cols, matriz: ds.correlation.matrix.map((r) => r.map((v) => +v.toFixed(3))) },
      insights: ds.insights,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prisma_dossie_${ds.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const numericProfiles = ds.profiles.filter((p) => p.type === "numeric");
  const typeBadge = (t: string) =>
    t === "numeric"
      ? { txt: "Nº", cls: "text-teal border-teal/40 bg-teal/[0.08]" }
      : t === "date"
        ? { txt: "dt", cls: "text-amber border-amber/40 bg-amber/[0.08]" }
        : { txt: "Aa", cls: "text-sky border-sky/40 bg-sky/[0.08]" };

  return (
    <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8 pb-24">
      {/* ============ barra de comando ============ */}
      <Reveal className="pt-8">
        <div className="card-static p-4 md:p-5 flex flex-wrap items-center gap-4">
          <button className="btn-ghost" onClick={onNew}>
            <IconArrowLeft className="w-3.5 h-3.5" /> novo dataset
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight truncate">{ds.name}</h1>
              <span className="font-mono text-[9px] uppercase tracking-widest text-teal border border-teal/30 bg-teal/10 rounded px-1.5 py-0.5 shrink-0">
                dossiê pronto
              </span>
            </div>
            <p className="font-mono text-[11px] text-dim mt-1">
              {fmtNum(ds.finalRows)} linhas × {ds.columns.length} colunas · {ds.numericCols.length} numéricas ·{" "}
              {ds.categoricalCols.length} categóricas · {ds.dateCols.length} temporais
            </p>
          </div>
          <QualityRing score={ds.quality} size={76} />
          <button className="btn-teal" onClick={exportReport}>
            <IconDownload className="w-3.5 h-3.5" /> exportar dossiê
          </button>
        </div>
      </Reveal>

      {/* ============ faixa de KPIs ============ */}
      <Reveal className="mt-5" delay={90}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-px bg-line rounded-[10px] overflow-hidden border border-line">
          {kpis.map((k) => (
            <div key={k.label} className="bg-panel px-5 py-4 hover:bg-panel2 transition-colors group">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim group-hover:text-mut transition-colors">{k.label}</p>
              <p className="font-display font-bold text-[28px] leading-tight mt-1 tabular-nums">
                <AnimatedNumber value={k.value} />
              </p>
              <p className="font-mono text-[10px] text-dim mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ============ 01 · higiene ============ */}
      <section className="mt-16">
        <SectionHead
          index="01"
          kicker="auditoria de limpeza"
          title="Higiene dos dados"
          desc="Tudo o que o motor encontrou e corrigiu antes de qualquer gráfico — cada intervenção fica registrada e é auditável."
        />
        <div className="grid grid-cols-12 gap-5">
          <Reveal className="col-span-12 lg:col-span-4">
            <div className="card-static p-5 h-full">
              <h3 className="font-display font-semibold text-[16px] tracking-tight">Registro de limpeza</h3>
              <p className="text-xs text-mut mt-0.5">
                {ds.actions.length ? `${ds.actions.length} intervenções aplicadas` : "nenhuma intervenção foi necessária"}
              </p>
              <div className="mt-5 space-y-2.5">
                {ds.actions.map((a) => {
                  const m = KIND_META[a.kind];
                  const Icon = m.icon;
                  return (
                    <div key={a.label} className="flex items-center gap-3 rounded-lg border border-line bg-abyss/40 px-3 py-2.5 hover:border-line2 transition-colors">
                      <span className="w-7 h-7 rounded-md border flex items-center justify-center shrink-0" style={{ borderColor: `${m.color}55`, background: `${m.color}14`, color: m.color }}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] leading-tight">{a.label}</p>
                        <p className="font-mono text-[9px] uppercase tracking-widest mt-0.5" style={{ color: m.color }}>{m.label}</p>
                      </div>
                      <span className="font-mono font-bold text-lg tabular-nums" style={{ color: m.color }}>
                        {fmtNum(a.count)}
                      </span>
                    </div>
                  );
                })}
                {!ds.actions.length && (
                  <p className="font-mono text-xs text-dim border border-dashed border-line rounded-lg p-4">
                    Conjunto chegou íntegro: sem duplicatas, nulos ou valores fora das cercas.
                  </p>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal className="col-span-12 lg:col-span-4" delay={90}>
            <div className="card-static p-5 h-full">
              <h3 className="font-display font-semibold text-[16px] tracking-tight">Matriz de lacunas</h3>
              <p className="text-xs text-mut mt-0.5">percentual de nulos detectado por coluna</p>
              <div className="mt-5">
                <MissingBars profiles={ds.profiles} />
              </div>
            </div>
          </Reveal>

          <Reveal className="col-span-12 lg:col-span-4" delay={160}>
            <div className="card-static p-5 h-full">
              <h3 className="font-display font-semibold text-[16px] tracking-tight">Tipagem inferida</h3>
              <p className="text-xs text-mut mt-0.5">classificação automática de cada variável</p>
              <div className="mt-4 space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {ds.profiles.map((p) => {
                  const b = typeBadge(p.type);
                  return (
                    <div key={p.name} className="flex items-center gap-2.5 py-1 border-b border-line/60 last:border-0 group">
                      <span className={`font-mono text-[9px] font-bold w-7 text-center rounded border py-0.5 shrink-0 ${b.cls}`}>{b.txt}</span>
                      <span className="font-mono text-[11.5px] text-mut group-hover:text-ink transition-colors truncate flex-1">{p.name}</span>
                      <span className="font-mono text-[10px] text-dim shrink-0">{fmtNum(p.unique)} ún.</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal className="col-span-12" delay={200}>
            <div className="card-static overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div>
                  <h3 className="font-display font-semibold text-[16px] tracking-tight">Amostra dos dados limpos</h3>
                  <p className="text-xs text-mut mt-0.5">
                    primeiras {Math.min(10, ds.rows.length)} de {fmtNum(ds.rows.length)} linhas · valores já imputados
                  </p>
                </div>
                <span className="font-mono text-[10px] text-dim hidden sm:block">role para ver todas as colunas →</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-t border-line">
                  <thead>
                    <tr className="bg-abyss/50">
                      <th className="text-left font-mono text-[9px] uppercase tracking-widest text-dim px-5 py-2.5 w-10">#</th>
                      {ds.columns.map((c) => {
                        const t = prof(c)?.type ?? "categorical";
                        const b = typeBadge(t);
                        return (
                          <th key={c} className="text-left px-4 py-2.5 whitespace-nowrap">
                            <span className="font-mono text-[10px] text-mut font-medium">{c}</span>{" "}
                            <span className={`font-mono text-[8px] font-bold rounded border px-1 py-px ${b.cls}`}>{b.txt}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {ds.rows.slice(0, 10).map((r, i) => (
                      <tr key={i} className={`${i % 2 ? "bg-abyss/30" : ""} hover:bg-teal/[0.04] transition-colors`}>
                        <td className="px-5 py-2 text-dim text-[10px]">{i + 1}</td>
                        {r.map((cell, j) => {
                          const isNum = prof(ds.columns[j])?.type === "numeric";
                          return (
                            <td key={j} className={`px-4 py-2 whitespace-nowrap ${isNum ? "text-tealhi/90 text-right tabular-nums" : "text-mut"}`}>
                              {cell !== null ? truncate(String(cell), 22) : <span className="text-coral">∅</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 02 · análise exploratória ============ */}
      <section className="mt-16">
        <SectionHead
          index="02"
          kicker="análise exploratória"
          title="Dossiê visual"
          desc="Lentes estatísticas geradas automaticamente a partir do perfil de cada variável. Troque as colunas nos seletores para explorar."
        />
        <div className="grid grid-cols-12 gap-5">
          <ChartCard
            className="col-span-12 lg:col-span-7"
            title="Distribuição"
            subtitle="Histograma com linhas de média (âmbar) e mediana (verde)"
            badge="auto"
            actions={ds.numericCols.length > 1 ? <Select value={histCol} onChange={setHistCol} options={ds.numericCols} /> : undefined}
          >
            <Histogram profile={prof(histCol)} />
          </ChartCard>

          <ChartCard
            className="col-span-12 lg:col-span-5"
            title="Ranking categórico"
            subtitle="frequência das categorias dominantes"
            actions={ds.categoricalCols.length > 1 ? <Select value={barCol} onChange={setBarCol} options={ds.categoricalCols} /> : undefined}
          >
            <CategoryBars profile={prof(barCol)} />
          </ChartCard>

          <ChartCard
            className="col-span-12 lg:col-span-5"
            title="Boxplots comparativos"
            subtitle="quartis, bigodes de Tukey e outliers em vermelho"
            badge="svg nativo"
          >
            <BoxPlots profiles={numericProfiles} />
          </ChartCard>

          <ChartCard
            className="col-span-12 lg:col-span-7"
            title="Matriz de correlação"
            subtitle="coeficientes de Pearson entre as variáveis numéricas"
            badge="svg nativo"
          >
            <Heatmap cols={ds.correlation.cols} matrix={ds.correlation.matrix} />
          </ChartCard>

          <ChartCard
            className="col-span-12 lg:col-span-7"
            title="Dispersão & regressão OLS"
            subtitle={`par iniciado por maior |r|: ${bestPair.x} × ${bestPair.y}`}
            actions={
              ds.numericCols.length > 1 ? (
                <div className="flex gap-2 flex-wrap">
                  <Select label="x" value={scatX} onChange={setScatX} options={ds.numericCols} />
                  <Select label="y" value={scatY} onChange={setScatY} options={ds.numericCols} />
                </div>
              ) : undefined
            }
          >
            <ScatterFit xName={scatX} yName={scatY} xs={prof(scatX)?.values} ys={prof(scatY)?.values} />
          </ChartCard>

          <ChartCard
            className="col-span-12 lg:col-span-5"
            title="Composição"
            subtitle="participação das categorias no total"
            actions={ds.categoricalCols.length > 1 ? <Select value={donutCol} onChange={setDonutCol} options={ds.categoricalCols} /> : undefined}
          >
            <Donut profile={prof(donutCol)} />
          </ChartCard>

          {ds.dateCols.length > 0 && (
            <ChartCard
              className="col-span-12"
              title="Série histórica"
              subtitle={`média de cada período em “${ds.dateCols[0]}” — agregação automática por dia, semana ou mês`}
              badge="temporal"
              actions={ds.numericCols.length > 1 ? <Select value={tsCol} onChange={setTsCol} options={ds.numericCols} /> : undefined}
            >
              <TimeSeries points={timePoints} yName={tsCol} />
            </ChartCard>
          )}
        </div>
      </section>

      {/* ============ 03 · insights ============ */}
      <section className="mt-16">
        <SectionHead
          index="03"
          kicker="motor de insights"
          title="Leituras automáticas"
          desc="Conclusões derivadas das estatísticas do próprio conjunto — não de achismo."
        />
        {ds.insights.length ? (
          <div className="grid md:grid-cols-2 gap-5">
            {ds.insights.map((ins, i) => {
              const st = INSIGHT_STYLE[ins.kind];
              return (
                <Reveal key={i} delay={i * 70}>
                  <div className="card p-5 flex gap-4 h-full">
                    <span className="font-display font-bold text-[32px] leading-none shrink-0" style={{ color: st.color, opacity: 0.9 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-semibold text-[15px] tracking-tight leading-snug">{ins.title}</h4>
                        <span className={`font-mono text-[9px] uppercase tracking-widest rounded border px-1.5 py-0.5 ${st.border} ${st.bg}`} style={{ color: st.color }}>
                          {st.tag}
                        </span>
                      </div>
                      <p className="text-sm text-mut mt-1.5 leading-relaxed">{ins.detail}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <p className="font-mono text-sm text-dim border border-dashed border-line rounded-lg p-6 text-center">
            Sem leituras relevantes — o conjunto é pequeno ou homogêneo demais para conclusões.
          </p>
        )}
      </section>

      <Reveal className="mt-16">
        <div className="border-t border-line pt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-dim">
            PRISMA · análise exploratória local — Pearson · Tukey 1,5×IQR · imputação por mediana
          </p>
          <button className="btn-ghost" onClick={onNew}>
            <IconArrowLeft className="w-3.5 h-3.5" /> analisar outro dataset
          </button>
        </div>
      </Reveal>
    </div>
  );
}
