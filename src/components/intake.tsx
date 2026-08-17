import { useEffect, useMemo, useRef, useState } from "react";
import type { Dataset } from "../lib/analyze";
import { SAMPLES } from "../lib/samples";
import {
  IconAlert, IconArrowLeft, IconCheck, IconLock, IconPaste, IconUpload, IconZap,
} from "./ui";

/* ============================================================
   INTAKE — console de ingestão
   ============================================================ */

const STEPS = [
  ["Ingestão & tipagem", "parser próprio + inferência de tipos"],
  ["Limpeza auditável", "duplicatas, nulos, outliers (1,5×IQR)"],
  ["Estatística descritiva", "média · mediana · σ · quartis · Pearson"],
  ["Dossiê visual", "7+ gráficos e insights automáticos"],
];

export function IntakeView({
  onAnalyze,
  theme = "prisma",
}: {
  onAnalyze: (text: string, name: string) => string | null;
  theme?: "prisma" | "ameba";
}) {
  const [tab, setTab] = useState<"arquivo" | "colar">("arquivo");
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (text: string, name: string) => setError(onAnalyze(text, name));
  const onFile = (f: File | null | undefined) => {
    if (!f) return;
    f.text().then((t) => run(t, f.name));
  };

  return (
    <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8">
      <div className="grid lg:grid-cols-[1.04fr_1fr] gap-12 lg:gap-16 items-center min-h-[calc(100vh-140px)] py-12 lg:py-8">
        {/* -------- cards flutuantes (registro ameba) -------- */}
        {theme === "ameba" && (
          <>
            <div
              className="hidden lg:block absolute right-0 top-4 w-[248px] rounded-lg border border-line2/60 bg-panel p-4 z-20"
              style={{ animation: "float-y 7.5s ease-in-out infinite" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tealhi pulse-dot inline-block" />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">order update</span>
              </div>
              <p className="text-[12.5px] text-ink mt-2 leading-snug">
                Lote <span className="font-mono text-tealhi">#4821</span> analisado — 342 linhas limpas em 1,2s
              </p>
              <p className="font-mono text-[9px] text-dim mt-2">agora · fila 0 · worker 3</p>
            </div>
            <div
              className="hidden lg:block absolute left-[36%] bottom-4 w-[262px] rounded-lg border border-line2/60 bg-panel p-4 z-20"
              style={{ animation: "float-y 9s ease-in-out infinite", animationDelay: "-3.2s" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">event summary</p>
              <div className="mt-2.5 space-y-2">
                {[
                  ["12:04:11", "duplicatas removidas · 8", "var(--color-coral)"],
                  ["12:04:12", "perfilamento concluído · 8 colunas", "var(--color-teal)"],
                ].map(([t, ev, c]) => (
                  <div key={t} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rotate-45 inline-block shrink-0" style={{ background: c }} />
                    <span className="font-mono text-[9.5px] text-dim">{t}</span>
                    <span className="text-[11.5px] text-mut truncate">{ev}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* -------- narrativa -------- */}
        <div>
          <p className="font-mono text-xs text-teal tracking-[0.22em] uppercase flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal pulse-dot inline-block" />
            console de ingestão · v2.4
          </p>
          <h1 className="font-display font-bold tracking-tight text-[42px] leading-[1.02] md:text-[64px] mt-5">
            Dados brutos entram.
            <br />
            <span className="text-teal">Ciência sai.</span>
          </h1>
          <p className="text-mut text-base md:text-lg mt-6 max-w-xl leading-relaxed">
            O {theme === "ameba" ? "AMEBA" : "Anthony.ia"} recebe seu CSV ou JSON, <b className="text-ink font-semibold">higieniza cada célula</b>,
            perfila as variáveis e devolve um dossiê visual digno de revista científica —
            sem servidor, sem upload, sem espera.
          </p>

          <div className="mt-10 relative pl-1">
            <span className="absolute left-[13px] top-2 bottom-2 w-px bg-line" aria-hidden />
            <div className="space-y-5">
              {STEPS.map(([t, d], i) => (
                <div key={t} className="flex items-start gap-4 group">
                  <span className="relative z-10 w-[27px] h-[27px] rounded-md border border-line2 bg-panel flex items-center justify-center font-mono text-[10px] text-teal font-semibold group-hover:border-teal/60 group-hover:bg-teal/10 transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="pt-0.5">
                    <p className="font-semibold text-[15px] tracking-tight">{t}</p>
                    <p className="font-mono text-[11px] text-dim mt-0.5">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-10 flex items-center gap-2 font-mono text-[11px] text-dim">
            <IconLock className="w-3.5 h-3.5 text-teal" />
            processamento 100% local — seus dados nunca saem do navegador
          </p>
        </div>

        {/* -------- console -------- */}
        <div>
          <div className="card-static overflow-hidden">
            <div className="flex items-center gap-1 border-b border-line px-3 pt-3">
              {(
                [
                  ["arquivo", "Arquivo", <IconUpload key="u" className="w-4 h-4" />],
                  ["colar", "Colar dados", <IconPaste key="p" className="w-4 h-4" />],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-mono text-[11px] uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                    tab === id
                      ? "text-teal border-teal bg-teal/[0.06]"
                      : "text-dim border-transparent hover:text-mut"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
              <span className="ml-auto pb-2 font-mono text-[10px] text-dim">CSV · TSV · JSON</span>
            </div>

            <div className="p-5">
              {tab === "arquivo" ? (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDrag(true);
                    }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDrag(false);
                      onFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`relative h-52 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all duration-300 select-none ${
                      drag
                        ? "border-teal bg-teal/[0.07] scale-[1.015] shadow-[0_0_44px_-12px_rgba(62,220,180,0.4)]"
                        : "border-line2 hover:border-teal/60 hover:bg-teal/[0.03]"
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.tsv,.txt,.json"
                      className="hidden"
                      onChange={(e) => onFile(e.target.files?.[0])}
                    />
                    <span className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-300 ${drag ? "border-teal text-teal bg-teal/10 -translate-y-1" : "border-line2 text-mut"}`}>
                      <IconUpload className="w-5 h-5" />
                    </span>
                    <p className="font-display font-semibold text-[16px]">
                      {drag ? "Solte para analisar" : "Arraste seu arquivo aqui"}
                    </p>
                    <p className="font-mono text-[11px] text-dim">
                      ou clique para escolher · cabeçalho na 1ª linha · até 50 MB
                    </p>
                    {drag && <span className="scanline" />}
                  </div>

                  <div className="flex items-center gap-3 my-5">
                    <span className="h-px flex-1 bg-line" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim">
                      ou comece pelo laboratório
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>

                  <div className="space-y-2.5">
                    {SAMPLES.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => run(s.build(), s.file)}
                        className="w-full text-left group flex items-center gap-4 p-3.5 rounded-lg border border-line hover:border-teal/50 hover:bg-teal/[0.04] transition-all duration-250"
                      >
                        <span className="font-mono text-[11px] text-teal font-semibold w-6 shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm tracking-tight">{s.name}</span>
                            {s.tags.map((t) => (
                              <span key={t} className="font-mono text-[9px] uppercase tracking-wider text-dim border border-line rounded px-1.5 py-px">
                                {t}
                              </span>
                            ))}
                          </span>
                          <span className="block text-xs text-mut mt-1 leading-snug">{s.desc}</span>
                        </span>
                        <span className="font-mono text-[10px] text-dim shrink-0 hidden sm:block">
                          {s.rows}×{s.cols}
                        </span>
                        <IconZap className="w-4 h-4 text-dim group-hover:text-teal group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div>
                  <textarea
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    placeholder={"data,regiao,receita\n05/01/2024,Sul,1230.50\n06/01/2024,Norte,\n…\n\nou JSON: [{\"data\":\"2024-01-05\",\"receita\":1230.5}]"}
                    className="w-full h-44 bg-abyss border border-line rounded-lg p-3.5 font-mono text-xs text-ink placeholder:text-dim focus:outline-none focus:border-teal/60 transition-colors resize-none"
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between mt-3.5">
                    <p className="font-mono text-[10px] text-dim">
                      {paste.trim() ? `${paste.trim().split("\n").length} linhas detectadas` : "cole CSV com cabeçalho ou um array de objetos JSON"}
                    </p>
                    <button
                      className="btn-teal"
                      disabled={!paste.trim()}
                      style={{ opacity: paste.trim() ? 1 : 0.4, cursor: paste.trim() ? "pointer" : "not-allowed" }}
                      onClick={() => run(paste, "dados_colados.csv")}
                    >
                      <IconZap className="w-3.5 h-3.5" /> analisar agora
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 text-coral font-mono text-xs border border-coral/30 bg-coral/[0.07] rounded-lg px-3 py-2.5 fade-line">
                  <IconAlert className="w-4 h-4 shrink-0 mt-px" />
                  {error}
                </div>
              )}
            </div>
          </div>

          <p className="font-mono text-[10px] text-dim text-center mt-4">
            motor estatístico: Pearson · Tukey 1,5×IQR · imputação por mediana · Freedman–Diaconis
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PIPELINE — processamento animado
   ============================================================ */

export function PipelineView({ ds, onDone }: { ds: Dataset; onDone: () => void }) {
  const { evs, steps } = useMemo(() => {
    const imp = ds.actions.filter((a) => a.kind === "impute").reduce((s, a) => s + a.count, 0);
    const dup = ds.actions.find((a) => a.kind === "remove")?.count ?? 0;
    const outl = ds.actions.find((a) => a.kind === "flag")?.count ?? 0;
    const views = 6 + (ds.dateCols.length ? 1 : 0);
    const defs: [string, string[]][] = [
      ["Ingestão", [`${ds.originalRows} linhas recebidas de "${ds.name}"`, "UTF-8 confirmado · delimitador detectado"]],
      [
        "Tipagem automática",
        [`${ds.numericCols.length} numéricas · ${ds.categoricalCols.length} categóricas · ${ds.dateCols.length} temporais`],
      ],
      [
        "Higienização",
        [
          dup ? `${dup} duplicatas exatas removidas` : "nenhuma duplicata encontrada",
          imp ? `${imp} células nulas imputadas` : "nenhum nulo para imputar",
          outl ? `${outl} outliers além das cercas de Tukey` : "sem outliers relevantes",
        ],
      ],
      [
        "Perfilamento estatístico",
        [
          "média · mediana · σ · quartis · assimetria",
          `matriz de Pearson ${ds.correlation.cols.length}×${ds.correlation.cols.length} computada`,
        ],
      ],
      ["Renderização", [`${views} visualizações montadas`, "motor de insights concluído"]],
    ];
    const list: { kind: "step" | "log"; step: number; text?: string }[] = [];
    defs.forEach((d, i) => {
      list.push({ kind: "step", step: i });
      d[1].forEach((t) => list.push({ kind: "log", step: i, text: t }));
    });
    return { evs: list, steps: defs.map((d) => d[0]) };
  }, [ds]);

  const [ptr, setPtr] = useState(0);

  useEffect(() => {
    if (ptr >= evs.length) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPtr((p) => p + 1), ptr === 0 ? 420 : 240);
    return () => clearTimeout(t);
  }, [ptr, evs.length, onDone]);

  const doneSteps = evs.slice(0, ptr).filter((e) => e.kind === "step");
  const currentStep = doneSteps.length ? doneSteps[doneSteps.length - 1].step : 0;
  const pct = Math.round((ptr / evs.length) * 100);

  return (
    <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-8 min-h-[calc(100vh-140px)] flex flex-col justify-center py-12">
      <p className="font-mono text-xs text-teal tracking-[0.22em] uppercase">processamento local</p>
      <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl mt-3">
        Destilando <span className="text-teal">{ds.name}</span>
      </h2>

      <div className="flex gap-1.5 mt-8">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full overflow-hidden bg-line ${i <= currentStep ? "" : ""}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${i < currentStep ? "w-full bg-teal" : i === currentStep ? "w-full stripes" : "w-0 bg-line2"}`}
              />
            </div>
            <p className={`font-mono text-[9px] uppercase tracking-wider mt-2 truncate transition-colors ${i <= currentStep ? "text-teal" : "text-dim"}`}>
              {s}
            </p>
          </div>
        ))}
      </div>

      <div className="card-static mt-7 p-5 font-mono text-[12px] leading-relaxed min-h-[210px] relative overflow-hidden">
        <span className="scanline" />
        {evs.slice(0, ptr).map((e, i) =>
          e.kind === "step" ? (
            <div key={i} className="text-ink font-semibold mt-2.5 first:mt-0 fade-line">
              <span className="text-teal mr-2">▸</span>
              {steps[e.step]}
            </div>
          ) : (
            <div key={i} className="text-mut pl-5 fade-line">
              <span className="text-teal/70 mr-2">✓</span>
              {e.text}
            </div>
          )
        )}
        {ptr < evs.length && (
          <span className="inline-block w-2 h-4 bg-teal blink align-middle ml-1" />
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <span className="font-mono text-sm text-dim">
          <b className="text-ink text-xl font-display">{pct}%</b> · {ptr}/{evs.length} operações
        </span>
        <button className="btn-ghost" onClick={onDone}>
          pular animação <IconArrowLeft className="w-3.5 h-3.5 rotate-180" />
        </button>
      </div>
    </div>
  );
}
