/* Anthony.ia · motor de análise — roda 100% no navegador.
   parse → tipagem → limpeza (duplicatas, nulos, outliers) → perfilamento
   → correlação de Pearson → insights automáticos. */

import Papa from "papaparse";

export type TimePoint = { t: string; v: number };

export function fmtSmart(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (abs >= 10_000) return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  if (Number.isInteger(n)) return n.toLocaleString("pt-BR");
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export interface TopCat { value: string; count: number; pct: number }

export interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "date";
  missing: number;
  missingPct: number;
  unique: number;
  values?: number[];
  mean?: number; median?: number; std?: number; min?: number; max?: number;
  q1?: number; q3?: number; iqr?: number; skew?: number; outlierCount?: number;
  top?: TopCat[];
  dateMin?: string; dateMax?: string;
}

export interface CleanAction { kind: "remove" | "impute" | "flag"; label: string; count: number }
export interface Insight { kind: "warn" | "good" | "info"; title: string; detail: string }

export interface Dataset {
  name: string;
  originalRows: number;
  finalRows: number;
  columns: string[];
  rows: (string | number | null)[][];
  numericCols: string[];
  categoricalCols: string[];
  dateCols: string[];
  profiles: ColumnProfile[];
  actions: CleanAction[];
  correlation: { cols: string[]; matrix: number[][] };
  insights: Insight[];
  quality: number;
}

const NULL_TOKENS = new Set(["", "null", "n/a", "na", "n.a", "nan", "none", "nil", "—", "–", "-", "?", "#n/d", "#ref!"]);

export function parseNum(raw: string): number | null {
  let s = raw.trim().replace(/^(R\$|US\$|U\$|€|£)\s*/i, "").replace(/[\s\u00a0]/g, "");
  if (!s) return null;
  s = s.replace(/%$/, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})([T\s](\d{2}):(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[5] || 0), +(m[6] || 0));
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(\s(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const yy = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(yy, +m[2] - 1, +m[1], +(m[5] || 0), +(m[6] || 0));
  }
  return null;
}

const q = (sorted: number[], p: number) => {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

export function analyze(text: string, name: string): Dataset | null {
  const res = Papa.parse<string[]>(text.trim(), { skipEmptyLines: "greedy" });
  const grid = res.data.filter((r) => r.some((c) => String(c).trim() !== ""));
  if (grid.length < 3) return null;

  const header = grid[0].map((h, i) => (String(h).trim() || `coluna_${i + 1}`));
  const body = grid.slice(1).map((r) => header.map((_, i) => {
    const v = String(r[i] ?? "").trim();
    return NULL_TOKENS.has(v.toLowerCase()) ? null : v;
  }));

  const originalRows = body.length;
  const ncols = header.length;

  /* ---- tipagem ---- */
  const types: ("numeric" | "categorical" | "date")[] = header.map((_, c) => {
    let num = 0, dat = 0, tot = 0;
    for (const row of body) {
      const v = row[c];
      if (v === null) continue;
      tot++;
      if (parseNum(v) !== null) num++;
      else if (parseDate(v)) dat++;
    }
    if (tot === 0) return "categorical";
    if (num / tot > 0.78) return "numeric";
    if (dat / tot > 0.78) return "date";
    return "categorical";
  });

  /* ---- duplicatas exatas ---- */
  const seen = new Set<string>();
  let dupes = 0;
  const dedup: (string | null)[][] = [];
  for (const row of body) {
    const key = row.join("\u0001");
    if (seen.has(key)) { dupes++; continue; }
    seen.add(key);
    dedup.push(row);
  }

  /* ---- valores numéricos (antes da imputação) ---- */
  const numVals: (number | null)[][] = dedup.map((row) =>
    row.map((v, c) => (types[c] === "numeric" ? (v === null ? null : parseNum(v)) : null))
  );

  /* ---- imputação ---- */
  const medians: (number | null)[] = header.map((_, c) => {
    if (types[c] !== "numeric") return null;
    const vals = numVals.map((r) => r[c]).filter((v): v is number => v !== null && Number.isFinite(v));
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
    return q(vals, 0.5);
  });

  let imputed = 0;
  const cleanNum: (number | null)[][] = numVals.map((row) =>
    row.map((v, c) => {
      if (types[c] !== "numeric") return null;
      if (v === null || !Number.isFinite(v)) { imputed++; return medians[c]; }
      return v;
    })
  );

  const modes: string[] = header.map((_, c) => {
    if (types[c] === "numeric") return "";
    const freq = new Map<string, number>();
    for (const row of dedup) {
      const v = row[c];
      if (v !== null) freq.set(v, (freq.get(v) || 0) + 1);
    }
    let best = "não informado", bestN = -1;
    freq.forEach((n, k) => { if (n > bestN) { best = k; bestN = n; } });
    return best;
  });

  let imputedCat = 0;
  const cleanRows: (string | number | null)[][] = dedup.map((row, r) =>
    row.map((v, c) => {
      if (v !== null) return types[c] === "numeric" ? (cleanNum[r][c] as number) : v;
      if (types[c] === "numeric") return cleanNum[r][c];
      imputedCat++;
      return modes[c];
    })
  );

  /* ---- outliers (Tukey 1,5×IQR) ---- */
  let outlierTotal = 0;
  const outlierCounts: number[] = header.map((_, c) => {
    if (types[c] !== "numeric") return 0;
    const vals = cleanNum.map((r) => r[c]).filter((v): v is number => v !== null);
    if (vals.length < 8) return 0;
    const sorted = [...vals].sort((a, b) => a - b);
    const q1v = q(sorted, 0.25), q3v = q(sorted, 0.75);
    const iqr = q3v - q1v;
    const lo = q1v - 1.5 * iqr, hi = q3v + 1.5 * iqr;
    const n = vals.filter((v) => v < lo || v > hi).length;
    outlierTotal += n;
    return n;
  });

  /* ---- perfis ---- */
  const profiles: ColumnProfile[] = header.map((colName, c) => {
    const missing = dedup.filter((r) => r[c] === null).length;
    const base: ColumnProfile = {
      name: colName,
      type: types[c],
      missing,
      missingPct: (missing / dedup.length) * 100,
      unique: new Set(dedup.map((r) => r[c]).filter((v) => v !== null)).size,
    };
    if (types[c] === "numeric") {
      const vals = cleanNum.map((r) => r[c]).filter((v): v is number => v !== null);
      const sorted = [...vals].sort((a, b) => a - b);
      const n = sorted.length;
      const mean = vals.reduce((s, v) => s + v, 0) / Math.max(1, n);
      const variance = vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / Math.max(1, n - 1);
      const std = Math.sqrt(variance);
      const q1v = n ? q(sorted, 0.25) : 0;
      const q3v = n ? q(sorted, 0.75) : 0;
      let skew = 0;
      if (std > 0 && n > 2) {
        const m3 = vals.reduce((s, v) => s + Math.pow(v - mean, 3), 0) / n;
        skew = m3 / Math.pow(std, 3);
      }
      Object.assign(base, {
        values: vals, mean, median: n ? q(sorted, 0.5) : 0, std,
        min: sorted[0] ?? 0, max: sorted[n - 1] ?? 0,
        q1: q1v, q3: q3v, iqr: q3v - q1v, skew,
        outlierCount: outlierCounts[c],
      });
    } else if (types[c] === "categorical") {
      const freq = new Map<string, number>();
      for (const r of cleanRows) {
        const v = r[c];
        if (v !== null) freq.set(String(v), (freq.get(String(v)) || 0) + 1);
      }
      const total = cleanRows.length;
      const top: TopCat[] = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count, pct: (count / total) * 100 }));
      base.top = top;
    } else {
      const dates = dedup.map((r) => (r[c] === null ? null : parseDate(r[c] as string)))
        .filter((d): d is Date => d !== null);
      if (dates.length) {
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        const min = new Date(Math.min(...dates.map((d) => d.getTime())));
        const max = new Date(Math.max(...dates.map((d) => d.getTime())));
        base.dateMin = fmt(min);
        base.dateMax = fmt(max);
      }
    }
    return base;
  });

  /* ---- correlação ---- */
  const numColsIdx = header.map((_, c) => c).filter((c) => types[c] === "numeric" && (profiles[c].values?.length ?? 0) > 4).slice(0, 8);
  const corCols = numColsIdx.map((c) => header[c]);
  const corMat: number[][] = numColsIdx.map((ci) =>
    numColsIdx.map((cj) => {
      const xs: number[] = [], ys: number[] = [];
      for (let r = 0; r < cleanNum.length; r++) {
        const a = cleanNum[r][ci], b = cleanNum[r][cj];
        if (a !== null && b !== null) { xs.push(a); ys.push(b); }
      }
      return ci === cj ? 1 : pearson(xs, ys);
    })
  );

  /* ---- ações ---- */
  const actions: CleanAction[] = [];
  if (dupes) actions.push({ kind: "remove", label: `Duplicatas exatas removidas`, count: dupes });
  const imputedNum = imputed;
  if (imputedNum) actions.push({ kind: "impute", label: `Células numéricas imputadas (mediana)`, count: imputedNum });
  if (imputedCat) actions.push({ kind: "impute", label: `Células categóricas imputadas (moda)`, count: imputedCat });
  if (outlierTotal) actions.push({ kind: "flag", label: `Outliers sinalizados (Tukey 1,5×IQR)`, count: outlierTotal });

  /* ---- insights ---- */
  const insights: Insight[] = [];
  let bestR = 0, bi = -1, bj = -1;
  for (let i = 0; i < corCols.length; i++)
    for (let j = i + 1; j < corCols.length; j++)
      if (Math.abs(corMat[i][j]) > Math.abs(bestR)) { bestR = corMat[i][j]; bi = i; bj = j; }
  if (bi >= 0 && Math.abs(bestR) >= 0.55) {
    insights.push({
      kind: "good",
      title: `Correlação ${bestR > 0 ? "positiva" : "negativa"} forte`,
      detail: `${corCols[bi]} e ${corCols[bj]} dançam juntas com r = ${bestR.toFixed(2).replace(".", ",")}. ` +
        `O gráfico de dispersão com regressão OLS mostra a reta — investigue causalidade antes de afirmar causa.`,
    });
  }
  const skewProf = profiles.find((p) => p.type === "numeric" && Math.abs(p.skew ?? 0) > 1);
  if (skewProf) {
    insights.push({
      kind: "warn",
      title: `Distribuição assimétrica em ${skewProf.name}`,
      detail: `Assimetria g₁ = ${(skewProf.skew ?? 0).toFixed(2).replace(".", ",")}: a média é puxada pela cauda ` +
        `e discorda da mediana. Para falar em “típico”, cite a mediana — e o histograma mostra exatamente o porquê.`,
    });
  }
  const outProf = profiles.find((p) => (p.outlierCount ?? 0) > 0);
  if (outProf) {
    insights.push({
      kind: "info",
      title: `${outProf.outlierCount} ponto(s) fora das cercas em ${outProf.name}`,
      detail: `Valores além de Q3 + 1,5×IQR (ou abaixo de Q1 − 1,5×IQR). Podem ser erros de digitação ou os casos mais ` +
        `interessantes do conjunto — o boxplot exibe cada um como ponto vermelho.`,
    });
  }
  const missingProf = profiles.find((p) => p.missingPct > 2);
  if (missingProf) {
    insights.push({
      kind: "warn",
      title: `Lacunas relevantes em ${missingProf.name}`,
      detail: `${missingProf.missing} células (${missingProf.missingPct.toFixed(1).replace(".", ",")}%) chegaram vazias e foram ` +
        `imputadas por ${missingProf.type === "numeric" ? "mediana" : "moda"}. Nulo raramente é aleatório: questione a origem.`,
    });
  }
  const domProf = profiles.find((p) => p.type === "categorical" && (p.top?.[0]?.pct ?? 0) > 45 && (p.top?.length ?? 0) > 1);
  if (domProf) {
    insights.push({
      kind: "info",
      title: `Concentração em ${domProf.name}`,
      detail: `“${domProf.top![0].value}” responde por ${domProf.top![0].pct.toFixed(0)}% das linhas. Quando uma categoria domina, ` +
        `médias globais escondem o comportamento das minorias — segmente antes de concluir.`,
    });
  }
  if (!insights.length) {
    insights.push({
      kind: "info",
      title: "Conjunto íntegro",
      detail: "Sem duplicatas, lacunas ou outliers relevantes. O que este dado contar, conta com confiança — aproveite para explorar as relações.",
    });
  }

  /* ---- qualidade ---- */
  const cells = dedup.length * ncols;
  const missingCells = profiles.reduce((s, p) => s + p.missing, 0);
  let qualityScore = 100;
  qualityScore -= Math.min(18, (dupes / Math.max(1, originalRows)) * 100 * 2);
  qualityScore -= Math.min(25, (missingCells / Math.max(1, cells)) * 100 * 0.8);
  qualityScore -= Math.min(8, (outlierTotal / Math.max(1, dedup.length)) * 100);
  const quality = Math.round(Math.max(40, Math.min(100, qualityScore)));

  return {
    name,
    originalRows,
    finalRows: dedup.length,
    columns: header,
    rows: cleanRows,
    numericCols: header.filter((_, c) => types[c] === "numeric"),
    categoricalCols: header.filter((_, c) => types[c] === "categorical"),
    dateCols: header.filter((_, c) => types[c] === "date"),
    profiles,
    actions,
    correlation: { cols: corCols, matrix: corMat },
    insights: insights.slice(0, 6),
    quality,
  };
}

/* ---- série temporal com agregação automática ---- */
export function buildTimeSeries(
  rows: (string | number | null)[][],
  dateCol: string,
  numCol: string,
  columns: string[]
): { t: string; v: number }[] {
  const di = columns.indexOf(dateCol);
  const ni = columns.indexOf(numCol);
  if (di < 0 || ni < 0) return [];
  const pts: { d: Date; v: number }[] = [];
  for (const r of rows) {
    const raw = r[di];
    const val = r[ni];
    if (raw === null || val === null) continue;
    const d = typeof raw === "string" ? parseDate(raw) : null;
    const v = typeof val === "number" ? val : parseNum(String(val));
    if (d && v !== null) pts.push({ d, v });
  }
  if (!pts.length) return [];
  const min = Math.min(...pts.map((p) => p.d.getTime()));
  const max = Math.max(...pts.map((p) => p.d.getTime()));
  const days = (max - min) / 86_400_000;
  const buckets = new Map<string, { s: number; n: number }>();
  const keyOf = (d: Date) => {
    if (days <= 45) return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (days <= 400) {
      const wk = new Date(d.getTime());
      wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7));
      return `${String(wk.getDate()).padStart(2, "0")}/${String(wk.getMonth() + 1).padStart(2, "0")}`;
    }
    const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${names[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
  };
  for (const p of pts) {
    const k = keyOf(p.d);
    const b = buckets.get(k) || { s: 0, n: 0 };
    b.s += p.v; b.n++;
    buckets.set(k, b);
  }
  return [...buckets.entries()].map(([t, b]) => ({ t, v: b.s / b.n }));
}
