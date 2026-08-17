import { useState } from "react";
import { IconCheck } from "./ui";

/* Mini-highlighter de sintaxe (Python & SQL) — tokenizador por regex,
   sem dependências externas. Cores alinhadas à paleta do PRISMA. */

type Lang = "python" | "sql";
interface Tok { t: string; c: string }

const PY_RULES: [string, RegExp][] = [
  ["c-com", /^#[^\n]*/],
  ["c-str", /^("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/],
  ["c-kw", /^(import|from|as|def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|lambda|with|try|except|finally|pass|class|raise|del|yield|break|continue|global)\b/],
  ["c-fn", /^(pd|np|df|print|len|range|str|int|float|round|sorted|sum|min|max|abs|enumerate|zip|list|dict|set|map|filter|open|isinstance|type|read_csv|read_sql|json_normalize|create_engine|get|fillna|dropna|astype|groupby|merge|to_numeric|to_datetime|describe|value_counts|duplicated|drop_duplicates|assign|query|rename|sort_values|head|tail|info|shape|mean|median|std|quantile|corr|apply|between|isna|nunique|memory_usage|strip|title|replace|requests|sqlalchemy|json|re|os|f)\b/],
  ["c-num", /^\d[\d_]*(\.\d+)?/],
  ["c-op", /^[+\-*/%=<>!&|^~]+/],
  ["c-pun", /^[()[\]{},.:;]/],
  ["c-id", /^[A-Za-z_][A-Za-z0-9_]*/],
  ["c-ws", /^\s+/],
];

const SQL_RULES: [string, RegExp][] = [
  ["c-com", /^--[^\n]*/],
  ["c-str", /^('(?:''|[^'\n])*')/],
  ["c-kw", /^(SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|JOIN|LEFT|RIGHT|INNER|FULL|OUTER|CROSS|ON|AS|WITH|CASE|WHEN|THEN|ELSE|END|HAVING|AND|OR|NOT|NULL|IS|IN|BETWEEN|LIKE|LIMIT|OFFSET|DISTINCT|UNION|ALL|EXISTS|OVER|PARTITION\s+BY|ROWS|RANGE|DESC|ASC|DATE|INTERVAL|USING|BY)\b/i],
  ["c-fn", /^(COUNT|SUM|AVG|MIN|MAX|ROUND|COALESCE|CAST|DATE_TRUNC|EXTRACT|LAG|LEAD|ROW_NUMBER|RANK|DENSE_RANK|NTILE|PERCENT_RANK|ABS|LOWER|UPPER|TRIM|NOW|CURRENT_DATE|CONCAT|LENGTH|SUBSTRING|FIRST_VALUE|LAST_VALUE)\b/i],
  ["c-num", /^\d+(\.\d+)?/],
  ["c-op", /^[+\-*/%=<>!]+/],
  ["c-pun", /^[()[\],.;]/],
  ["c-id", /^[A-Za-z_][A-Za-z0-9_]*/],
  ["c-ws", /^\s+/],
];

const COLORS: Record<string, string> = {
  "c-kw": "#f4b860",
  "c-str": "#7cf5d6",
  "c-num": "#f2796b",
  "c-com": "#5e7770",
  "c-fn": "#66b7f0",
  "c-op": "#8fa9a1",
  "c-pun": "#5e7770",
  "c-id": "#dcebe6",
  "c-ws": "",
};

function tokenizeLine(line: string, rules: [string, RegExp][]): Tok[] {
  const toks: Tok[] = [];
  let rest = line;
  let guard = 0;
  while (rest.length && guard++ < 2000) {
    let matched = false;
    for (const [cls, re] of rules) {
      const m = re.exec(rest);
      if (m && m[0].length) {
        toks.push({ t: m[0], c: cls });
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      toks.push({ t: rest[0], c: "" });
      rest = rest.slice(1);
    }
  }
  return toks;
}

export function CodeBlock({
  lang,
  title,
  caption,
  code,
}: {
  lang: Lang;
  title: string;
  caption?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const rules = lang === "python" ? PY_RULES : SQL_RULES;
  const lines = code.replace(/\n$/, "").split("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível — silencioso */
    }
  };

  return (
    <div className="rounded-[10px] border border-line bg-[#08110f] overflow-hidden group/code transition-colors hover:border-line2">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-line bg-abyss/60">
        <span className="flex gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-coral/70 inline-block" />
          <i className="w-2.5 h-2.5 rounded-full bg-amber/70 inline-block" />
          <i className="w-2.5 h-2.5 rounded-full bg-teal/70 inline-block" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] text-ink truncate">{title}</p>
          {caption && <p className="font-mono text-[9.5px] text-dim truncate">{caption}</p>}
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-teal border border-teal/30 bg-teal/[0.08] rounded px-1.5 py-0.5">
          {lang === "python" ? "python" : "sql"}
        </span>
        <button
          onClick={copy}
          className="font-mono text-[9px] uppercase tracking-widest text-dim hover:text-tealhi border border-line hover:border-teal/40 rounded px-2 py-1 transition-colors flex items-center gap-1.5 shrink-0"
        >
          {copied ? (
            <>
              <IconCheck className="w-3 h-3 text-teal" /> copiado
            </>
          ) : (
            "copiar"
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="font-mono text-[12px] leading-[1.7] py-3 min-w-max">
          {lines.map((ln, i) => (
            <div key={i} className="flex px-0 hover:bg-teal/[0.035] transition-colors">
              <span className="select-none w-11 shrink-0 text-right pr-3 text-[10px] leading-[1.95] text-[#3d554e] border-r border-line/70">
                {i + 1}
              </span>
              <code className="pl-4 pr-5 whitespace-pre">
                {tokenizeLine(ln, rules).map((tk, j) => (
                  <span key={j} style={tk.c ? { color: COLORS[tk.c] } : undefined}>
                    {tk.t}
                  </span>
                ))}
              </code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
