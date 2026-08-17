import Papa from "papaparse";

/* ============================================================
   Anthony.ia · motor de análise
   ingestão → tipagem → limpeza → perfilamento → insights
   ============================================================ */

export type ColType = "numeric" | "categorical" | "date";

export interface TopValue {
  value: string;
  count: number;
  pct: number;
}

export interface ColumnProfile {
  name: string;
  type: ColType;
  missing: number;
  missingPct: number;
  unique: number;
  values?: number[];
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  skew?: number;
  outlierCount: number;
  top?: TopValue[];
}

export interface CleanAction {
  label: string;
  count: number;
  kind: "remove" | "impute" | "flag" | "normalize";
}

export interface Insight {
  kind: "warn" | "good" | "info";
  title: string;
  detail: string;
}

export interface Dataset {
  name: string;
  columns: string[];
  rows: (string | null)[][];
  profiles: ColumnProfile[];
  numericCols: string[];
  categoricalCols: string[];
  dateCols: string[];
  originalRows: number;
  finalRows: number;
  actions: CleanAction[];
  missingFound: number;
  quality: number;
  insights: Insight[];
  correlation: { cols: string[]; matrix: number[][] };
}

/* ---------------- parsing de texto ---------------- */

const NULL_TOKENS = new Set([
  "", "null", "nil", "n/a", "na", "nan", "-", "—", "none",
  "indefinido", "não informado", "nao informado", "vazio", "?",
]);

function normalizeCell(raw: string): string | null {
  const s = raw.trim();
  if (NULL_TOKENS.has(s.toLowerCase())) return null;
  return s;
}

export function parseNumber(s: string): number | null {
  let v = s.trim();
  if (!v) return null;
  v = v.replace(/[R$\s%]/gi, "");
  const lastC = v.lastIndexOf(",");
  const lastD = v.lastIndexOf(".");
  if (lastC >= 0 && lastD >= 0) {
    if (lastC > lastD) v = v.replace(/\./g, "").replace(",", ".");
    else v = v.replace(/,/g, "");
  } else if (lastC >= 0) {
    const decimals = v.length - lastC - 1;
    if (decimals === 3 && v.length > 5 && lastC === v.indexOf(",")) v = v.replace(",", "");
    else v = v.replace(",", ".");
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(s: string): number | null {
  const t = s.trim();
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})([T\s](\d{1,2}):(\d{2}))?/);
  if (iso) {
    const d = new Date(
      Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +(iso[5] ?? 0), +(iso[6] ?? 0))
    );
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(\s(\d{1,2}):(\d{2}))?/);
  if (br) {
    const year = br[3].length === 2 ? 2000 + +br[3] : +br[3];
    const d = new Date(Date.UTC(year, +br[2] - 1, +br[1], +(br[5] ?? 0), +(br[6] ?? 0)));
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}

function jsonToGrid(text: string): string[][] {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  if (!arr.length || typeof arr[0] !== "object" || arr[0] === null) {
    throw new Error("JSON sem estrutura tabular reconhecível.");
  }
  const header = Object.keys(arr[0]);
  const rows = arr.map((obj: Record<string, unknown>) =>
    header.map((h) => {
      const v = obj[h];
      return v === null || v === undefined ? "" : String(v);
    })
  );
  return [header, ...rows];
}

export function textToGrid(text: string): string[][] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Nenhum dado recebido.");
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return jsonToGrid(trimmed);
  const res = Papa.parse<string[]>(trimmed, { skipEmptyLines: "greedy" });
  const grid = res.data.filter((r) => r.some((c) => String(c).trim() !== ""));
  if (grid.length < 2) throw new Error("Dados insuficientes — envie ao menos 3 linhas.");
  return grid.map((r) => r.map((c) => String(c)));
}

/* ---------------- estatística ---------------- */

const sortAsc = (a: number[]) => [...a].sort((x, y) => x - y);

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

export function std(a: number[], m?: number): number {
  if (a.length < 2) return 0;
  const mu = m ?? mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - mu) ** 2, 0) / (a.length - 1));
}

export function skewness(a: number[]): number {
  if (a.length < 3) return 0;
  const mu = mean(a);
  const s = std(a, mu);
  if (s === 0) return 0;
  const n = a.length;
  const m3 = a.reduce((acc, v) => acc + ((v - mu) / s) ** 3, 0) / n;
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * m3;
}

export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

/* ---------------- pipeline principal ---------------- */

export function analyzeDataset(text: string, sourceName: string): Dataset {
  const grid = textToGrid(text);
  const rawHeader = grid[0];
  const header = rawHeader.map((h, i) => {
    const base = h.trim() || `coluna_${i + 1}`;
    const dupe = rawHeader.slice(0, i).filter((x) => x === h).length;
    return dupe ? `${base}_${dupe + 1}` : base;
  });
  const width = header.length;
  const bodyRaw = grid.slice(1).map((r) => {
    const r2 = [...r];
    while (r2.length < width) r2.push("");
    return r2.slice(0, width);
  });

  const originalRows = bodyRaw.length;

  // 1. normalização de células
  let normalized = 0;
  const body: (string | null)[][] = bodyRaw.map((row) =>
    row.map((cell) => {
      const n = normalizeCell(cell);
      if (n === null && cell.trim() !== "") normalized++;
      return n;
    })
  );

  // 2. remoção de duplicatas exatas
  const seen = new Set<string>();
  let duplicatesRemoved = 0;
  const deduped = body.filter((row) => {
    const key = row.map((c) => c ?? "∅").join("\u0001");
    if (seen.has(key)) {
      duplicatesRemoved++;
      return false;
    }
    seen.add(key);
    return true;
  });

  // 3. tipagem automática
  const types: ColType[] = header.map((_, c) => {
    const vals = deduped.map((r) => r[c]).filter((v): v is string => v !== null);
    if (vals.length === 0) return "categorical";
    const sample = vals.slice(0, 200);
    const dateScore = sample.filter((v) => parseDate(v) !== null).length / sample.length;
    if (dateScore >= 0.9) return "date";
    const numScore = sample.filter((v) => parseNumber(v) !== null).length / sample.length;
    if (numScore >= 0.85) return "numeric";
    return "categorical";
  });

  // 4. limpeza + perfilamento por coluna
  let missingFound = 0;
  let numericImputed = 0;
  let categoricalImputed = 0;
  let outliersTotal = 0;

  const profiles: ColumnProfile[] = header.map((name, c) => {
    const col = deduped.map((r) => r[c]);
    const missing = col.filter((v) => v === null).length;
    missingFound += missing;
    const present = col.filter((v): v is string => v !== null);
    const unique = new Set(present).size;
    const type = types[c];

    const profile: ColumnProfile = {
      name,
      type,
      missing,
      missingPct: (missing / Math.max(1, col.length)) * 100,
      unique,
      outlierCount: 0,
    };

    if (type === "numeric") {
      const nums = present
        .map(parseNumber)
        .filter((v): v is number => v !== null);
      const sorted = sortAsc(nums);
      const med = quantile(sorted, 0.5);
      const q1 = quantile(sorted, 0.25);
      const q3 = quantile(sorted, 0.75);
      const iqr = q3 - q1;
      const fenceLo = q1 - 1.5 * iqr;
      const fenceHi = q3 + 1.5 * iqr;
      const outliers = nums.filter((v) => v < fenceLo || v > fenceHi);
      profile.outlierCount = outliers.length;
      outliersTotal += outliers.length;

      // imputação de nulos pela mediana (gravada no dataset)
      col.forEach((v, i) => {
        if (v === null) {
          deduped[i][c] = med.toFixed(4).replace(/\.?0+$/, "");
          numericImputed++;
        }
      });

      const finalNums = col.map((v) => parseNumber(v as string) ?? med);
      const sortedF = sortAsc(finalNums);
      const mu = mean(finalNums);
      profile.values = finalNums;
      profile.min = sortedF[0];
      profile.max = sortedF[sortedF.length - 1];
      profile.mean = mu;
      profile.median = quantile(sortedF, 0.5);
      profile.std = std(finalNums, mu);
      profile.q1 = quantile(sortedF, 0.25);
      profile.q3 = quantile(sortedF, 0.75);
      profile.iqr = profile.q3 - profile.q1;
      profile.skew = skewness(finalNums);
    } else if (type === "categorical") {
      col.forEach((v, i) => {
        if (v === null) {
          deduped[i][c] = "N/D";
          categoricalImputed++;
        }
      });
      const freq = new Map<string, number>();
      present.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
      profile.top = [...freq.entries()]
        .map(([value, count]) => ({ value, count, pct: (count / Math.max(1, present.length)) * 100 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }
    return profile;
  });

  const numericCols = profiles.filter((p) => p.type === "numeric").map((p) => p.name);
  const categoricalCols = profiles.filter((p) => p.type === "categorical").map((p) => p.name);
  const dateCols = profiles.filter((p) => p.type === "date").map((p) => p.name);

  // 5. matriz de correlação (Pearson)
  const corrCols = numericCols.slice(0, 10);
  const matrix = corrCols.map((a) =>
    corrCols.map((b) => {
      if (a === b) return 1;
      const pa = profiles.find((p) => p.name === a)!;
      const pb = profiles.find((p) => p.name === b)!;
      return pearson(pa.values ?? [], pb.values ?? []);
    })
  );

  // 6. score de qualidade
  const cells = originalRows * width;
  const quality = Math.round(
    Math.min(
      99,
      Math.max(
        35,
        100 -
          (missingFound / Math.max(1, cells)) * 260 -
          (duplicatesRemoved / Math.max(1, originalRows)) * 140 -
          (outliersTotal / Math.max(1, cells)) * 90
      )
    )
  );

  // 7. ações de limpeza
  const actions: CleanAction[] = [];
  if (normalized) actions.push({ label: "Células inválidas normalizadas para nulo", count: normalized, kind: "normalize" });
  if (duplicatesRemoved) actions.push({ label: "Linhas duplicadas removidas", count: duplicatesRemoved, kind: "remove" });
  if (numericImputed) actions.push({ label: "Nulos numéricos imputados pela mediana", count: numericImputed, kind: "impute" });
  if (categoricalImputed) actions.push({ label: "Nulos categóricos imputados por N/D", count: categoricalImputed, kind: "impute" });
  if (outliersTotal) actions.push({ label: "Outliers sinalizados (cerca de 1,5×IQR)", count: outliersTotal, kind: "flag" });

  // 8. insights automáticos
  const insights = buildInsights({
    profiles, matrix, corrCols, duplicatesRemoved, missingFound,
    originalRows, quality, outliersTotal, numericCols, dateCols,
  });

  return {
    name: sourceName.replace(/\.(csv|json|tsv|txt)$/i, ""),
    columns: header,
    rows: deduped,
    profiles,
    numericCols,
    categoricalCols,
    dateCols,
    originalRows,
    finalRows: deduped.length,
    actions,
    missingFound,
    quality,
    insights,
    correlation: { cols: corrCols, matrix },
  };
}

/* ---------------- insights ---------------- */

function buildInsights(ctx: {
  profiles: ColumnProfile[];
  matrix: number[][];
  corrCols: string[];
  duplicatesRemoved: number;
  missingFound: number;
  originalRows: number;
  quality: number;
  outliersTotal: number;
  numericCols: string[];
  dateCols: string[];
}): Insight[] {
  const out: Insight[] = [];

  if (ctx.duplicatesRemoved > 0) {
    out.push({
      kind: "warn",
      title: `${ctx.duplicatesRemoved} duplicatas exatas removidas`,
      detail: `${((ctx.duplicatesRemoved / ctx.originalRows) * 100).toFixed(1)}% do volume original era repetição — já expurgado antes do perfilamento.`,
    });
  }

  const dirtiest = [...ctx.profiles].sort((a, b) => b.missingPct - a.missingPct)[0];
  if (dirtiest && dirtiest.missingPct > 8) {
    out.push({
      kind: "warn",
      title: `“${dirtiest.name}” chegou com ${dirtiest.missingPct.toFixed(1)}% de lacunas`,
      detail:
        dirtiest.type === "numeric"
          ? `Nulos imputados pela mediana (${fmtSmart(dirtiest.median ?? 0)}) para preservar a distribuição. Avalie descarte se o viés importar.`
          : "Lacunas preenchidas com N/D para não inflar categorias reais.",
    });
  }

  let best = { r: 0, a: "", b: "" };
  for (let i = 0; i < ctx.corrCols.length; i++) {
    for (let j = i + 1; j < ctx.corrCols.length; j++) {
      const r = ctx.matrix[i][j];
      if (Math.abs(r) > Math.abs(best.r)) best = { r, a: ctx.corrCols[i], b: ctx.corrCols[j] };
    }
  }
  if (Math.abs(best.r) >= 0.6) {
    out.push({
      kind: "good",
      title: `Correlação ${best.r > 0 ? "positiva" : "inversa"} forte: ${best.a} × ${best.b}`,
      detail: `Pearson r = ${best.r.toFixed(2)} (r² = ${(best.r ** 2).toFixed(2)}). ${Math.abs(best.r) >= 0.85 ? "Candidatas a colinearidade em modelos regressivos." : "Relação digna de investigação causal."}`,
    });
  }

  const outCol = [...ctx.profiles].sort((a, b) => b.outlierCount - a.outlierCount)[0];
  if (outCol && outCol.outlierCount > 0) {
    out.push({
      kind: "info",
      title: `${ctx.outliersTotal} outliers além das cercas de Tukey`,
      detail: `Concentrados em “${outCol.name}” (${outCol.outlierCount}). Pontos visíveis no boxplot — verifique se são erros de medição ou eventos legítimos.`,
    });
  }

  const skewed = ctx.profiles.filter((p) => p.type === "numeric" && Math.abs(p.skew ?? 0) > 1.1)
    .sort((a, b) => Math.abs(b.skew ?? 0) - Math.abs(a.skew ?? 0))[0];
  if (skewed) {
    out.push({
      kind: "info",
      title: `“${skewed.name}” tem assimetria ${ (skewed.skew ?? 0) > 0 ? "à direita" : "à esquerda"} (g₁ = ${(skewed.skew ?? 0).toFixed(2)})`,
      detail: "Para inferência paramétrica, considere transformação logarítmica ou testes não paramétricos.",
    });
  }

  if (ctx.dateCols.length && ctx.numericCols.length) {
    out.push({
      kind: "info",
      title: "Eixo temporal detectado",
      detail: `“${ctx.dateCols[0]}” habilita a série histórica — agregações automáticas por dia, semana ou mês conforme a amplitude.`,
    });
  }

  if (ctx.quality >= 90) {
    out.push({
      kind: "good",
      title: "Confiabilidade alta do conjunto",
      detail: `Score de qualidade ${ctx.quality}/100 após a higienização — seguro para reportes executivos.`,
    });
  } else if (ctx.quality < 75) {
    out.push({
      kind: "warn",
      title: "Qualidade moderada — interprete com cautela",
      detail: `Score ${ctx.quality}/100. O volume de lacunas ou duplicatas sugere revisão da coleta na origem.`,
    });
  }

  if (ctx.numericCols.length >= 3) {
    out.push({
      kind: "info",
      title: `${ctx.numericCols.length} variáveis numéricas perfiladas`,
      detail: "Matriz de Pearson, quartis e desvio-padrão prontos para alimentar modelos multivariados.",
    });
  }

  return out.slice(0, 6);
}

export function fmtSmart(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(".", ",") + "M";
  if (abs >= 10_000) return (n / 1000).toFixed(1).replace(".", ",") + "k";
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 1) return n.toFixed(2).replace(".", ",");
  return n.toFixed(3).replace(".", ",");
}

/* ---------------- séries temporais ---------------- */

export interface TimePoint {
  t: string;
  ts: number;
  v: number;
  c: number;
}

export function buildTimeSeries(
  rows: (string | null)[][],
  dateCol: string,
  numCol: string,
  columns: string[]
): TimePoint[] {
  const di = columns.indexOf(dateCol);
  const ni = columns.indexOf(numCol);
  if (di < 0 || ni < 0) return [];
  const pairs: { ts: number; v: number }[] = [];
  for (const r of rows) {
    const d = r[di] ? parseDate(r[di] as string) : null;
    const v = r[ni] !== null ? parseNumber(r[ni] as string) : null;
    if (d !== null && v !== null) pairs.push({ ts: d, v });
  }
  if (!pairs.length) return [];
  pairs.sort((a, b) => a.ts - b.ts);
  const spanDays = (pairs[pairs.length - 1].ts - pairs[0].ts) / 86_400_000;
  const mode: "day" | "week" | "month" = spanDays <= 45 ? "day" : spanDays <= 400 ? "week" : "month";

  const bucketKey = (ts: number) => {
    const d = new Date(ts);
    if (mode === "day") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    if (mode === "week") {
      const day = d.getUTCDay();
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((day + 6) % 7));
    }
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  };

  const groups = new Map<number, { sum: number; c: number }>();
  pairs.forEach((p) => {
    const k = bucketKey(p.ts);
    const g = groups.get(k) ?? { sum: 0, c: 0 };
    g.sum += p.v;
    g.c++;
    groups.set(k, g);
  });

  const fmt = (ts: number) => {
    const d = new Date(ts);
    if (mode === "month")
      return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, g]) => ({ t: fmt(ts), ts, v: g.sum / g.c, c: g.c }));
}
