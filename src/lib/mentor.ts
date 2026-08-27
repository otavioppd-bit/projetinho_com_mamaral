/* Motor do Mentor Anthony.ia — trilhas Júnior / Pleno / Sênior,
   personalizadas com as colunas e estatísticas reais do dataset. */

import type { ColumnProfile, Dataset } from "./analyze";

/* ---------------- tipos ---------------- */

export type Level = "junior" | "pleno" | "senior";

export interface LevelMeta {
  id: Level;
  name: string;
  focus: string;
  desc: string;
  skills: string[];
}

export const LEVELS: LevelMeta[] = [
  {
    id: "junior",
    name: "Júnior",
    focus: "fundamentos que sustentam tudo",
    desc: "Do dado bruto à primeira análise confiável: perguntas certas, Python, SQL, gráficos e a matemática essencial.",
    skills: ["pandas", "SQL essencial", "gráficos certos", "estatística básica"],
  },
  {
    id: "pleno",
    name: "Pleno",
    focus: "análise que vira produto",
    desc: "Modelagem dimensional, métricas de negócio, Tableau e Power BI em nível profissional e estatística para decidir.",
    skills: ["star schema", "KPIs & cohorts", "Tableau", "Power BI · DAX"],
  },
  {
    id: "senior",
    name: "Sênior",
    focus: "sistemas, escala e decisão",
    desc: "Arquitetura moderna de dados, governança, experimentação causal, ecossistema de plataformas e previsão em produção.",
    skills: ["dbt & lakehouse", "governança", "causalidade", "liderança técnica"],
  },
];

export type ChartGlyphKind = "line" | "bars" | "hist" | "box" | "scatter" | "donut";

export interface ChartPick {
  name: string;
  glyph: ChartGlyphKind;
  when: string;
  why: string;
  mistake: string;
}

export interface FormulaItem {
  id: "mean" | "median" | "std" | "iqr" | "pct" | "pearson";
  name: string;
  explain: string;
  example: string;
  rule: string;
}

export interface PlatformInfo {
  name: string;
  glyph: "tableau" | "powerbi" | "looker" | "sigma" | "metabase";
  tagline: string;
  pros: string[];
  cons: string[];
  when: string;
  verdict: string;
}

export type MentorSection =
  | { kind: "code"; lang: "python" | "sql"; title: string; caption?: string; code: string }
  | { kind: "list"; title: string; items: { strong: string; text: string }[] }
  | { kind: "tip"; tone: "warn" | "good" | "info"; title: string; text: string }
  | { kind: "charts"; title: string; picks: ChartPick[] }
  | { kind: "picks"; title: string; items: { col: string; chart: string; why: string }[] }
  | { kind: "formulas"; title: string; items: FormulaItem[] }
  | { kind: "platform"; title: string; items: PlatformInfo[] };

export interface MentorModule {
  id: string;
  step: string;
  title: string;
  tagline: string;
  intro: string;
  sections: MentorSection[];
}

/* ---------------- helpers ---------------- */

const f = (n: number, d = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d });

function numProfile(ds: Dataset | null, col: string): ColumnProfile | null {
  return ds?.profiles.find((p) => p.name === col && p.type === "numeric") ?? null;
}

function bestPair(ds: Dataset | null): { x: string; y: string; r: number } | null {
  if (!ds || ds.correlation.cols.length < 2) return null;
  const { cols, matrix } = ds.correlation;
  let best = { x: cols[0], y: cols[1], r: 0 };
  for (let i = 0; i < cols.length; i++)
    for (let j = i + 1; j < cols.length; j++)
      if (Math.abs(matrix[i][j]) > Math.abs(best.r)) best = { x: cols[i], y: cols[j], r: matrix[i][j] };
  return best;
}

const strength = (r: number) => {
  const a = Math.abs(r);
  const dir = r > 0 ? "positiva" : "negativa";
  if (a >= 0.7) return `forte e ${dir}`;
  if (a >= 0.4) return `moderada e ${dir}`;
  return `fraca (${dir})`;
};

/* =====================================================================
   TRILHA JÚNIOR
   ===================================================================== */

function buildJunior(ds: Dataset | null): MentorModule[] {
  const date = ds?.dateCols[0] ?? "data";
  const cat = ds?.categoricalCols[0] ?? "regiao";
  const num = ds?.numericCols[0] ?? "receita";
  const table = ds
    ? (ds.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "dataset")
    : "vendas";
  const file = ds ? `${table}.csv` : "vendas.csv";

  const np = numProfile(ds, num);
  const pair = bestPair(ds);
  const hasStats = !!np;
  const mean = np?.mean ?? 0;
  const median = np?.median ?? 0;
  const std = np?.std ?? 0;
  const q1 = np?.q1 ?? 0;
  const q3 = np?.q3 ?? 0;
  const iqr = np?.iqr ?? 0;
  const skew = np?.skew ?? 0;
  const outN = np?.outlierCount ?? 0;
  const fenceSup = q3 + 1.5 * iqr;

  const fenceComment = hasStats
    ? `# No SEU dado: Q1 = ${f(q1)}, Q3 = ${f(q3)}, IQR = ${f(iqr)} → cerca_sup ≈ ${f(fenceSup)}`
    : `# Com ~350 linhas de e-commerce, a cerca_sup de receita costuma cair perto de R$ 20 mil`;

  const hygieneTip: MentorSection[] =
    ds && ds.actions.length
      ? [{
          kind: "tip", tone: "info",
          title: "No SEU dataset, o motor já fez isso",
          text: `Na trilha do Console eu removi ${ds.actions.find((a) => a.kind === "remove")?.count ?? 0} duplicadas exatas, imputei ${ds.actions.filter((a) => a.kind === "impute").reduce((s, a) => s + a.count, 0)} células vazias pela mediana/moda e sinalizei ${ds.actions.find((a) => a.kind === "flag")?.count ?? 0} outliers pelas cercas de Tukey. Os gráficos que você viu lá já usam a versão limpa — compare com o código deste módulo e veja cada passo.`,
        }]
      : [];

  const m01: MentorModule = {
    id: "perguntas", step: "01", title: "As perguntas certas", tagline: "antes do código, o raciocínio",
    intro:
      "Bem-vindo(a) à trilha Júnior — a base que separa quem digita de quem analisa. Antes de abrir qualquer ferramenta, entenda o jogo: toda análise que não responde pergunta de negócio é exercício de digitação. A gente monta o raciocínio DE TRÁS pra frente — da decisão para o dado. Faça estas perguntas antes de abrir o Jupyter e metade dos seus gráficos futuros deixa de existir (o que é um ótimo sinal).",
    sections: [
      {
        kind: "list", title: "As 6 perguntas que separam júnior de sênior",
        items: [
          { strong: "Qual decisão vai ser tomada com esse número?", text: "Se a resposta for “nenhuma”, a análise não deveria existir. Gráfico bonito que não muda nenhuma decisão é decoração cara — e consome o tempo que faltou para a análise que importa." },
          { strong: "Comparado com o quê?", text: "Todo número isolado é inútil. Receita de R$ 50 mil é ótima? Depende: mês anterior, meta, mesmo período do ano passado. Defina a linha de base ANTES de calcular, senão você escolhe a comparação que favorece a história." },
          { strong: "O que a métrica mede — e o que ela esconde?", text: "“Ticket médio subiu” pode ser cliente comprando mais… ou os clientes baratos indo embora. Toda média esconde uma distribuição. Pergunte sempre o que está atrás do número agregado." },
          { strong: "Qual o período e a granularidade?", text: "Dia, semana ou mês muda a história inteira. E cuidado com armadilhas de calendário: comparar 28 dias de fevereiro com 31 de janeiro sem normalizar é erro que passa em muita reunião." },
          { strong: "Quem vai consumir essa análise?", text: "Diretoria quer manchete e tendência em um gráfico. O time operacional quer a fila de problemas de hoje em uma tabela. A mesma análise gera entregas diferentes — descubra a audiência antes de formatar." },
          { strong: "Que dado eu NÃO tenho?", text: "A pergunta mais madura do ofício. Às vezes o churn não se explica com vendas — falta o dado de suporte. Mapear a lacuna com honestidade já é uma entrega sênior." },
        ],
      },
      { kind: "tip", tone: "good", title: "Framework D·P·C — Decisão → Pergunta → Cálculo", text: "Nessa ordem, sempre. Exemplo: “decidir se expando a linha X” → “X cresce mais que o total da carteira?” → “variação % mensal de X vs. total”. Quando você escreve as três linhas, o gráfico e a query praticamente se desenham sozinhos." },
      { kind: "tip", tone: "warn", title: "Hipótese antes da query", text: `Transforme cada pergunta em hipótese testável: “${cat} vende menos por causa do frete” vira um GROUP BY por ${cat} com frete médio por linha. Sem hipótese, você pesca no escuro — e chama coincidência de descoberta.` },
    ],
  };

  const m02: MentorModule = {
    id: "extracao", step: "02", title: "Extração com Python", tagline: "trazendo o dado para a bancada",
    intro:
      "Dados chegam de três lugares: arquivo, banco de dados ou API. Em 80% dos seus dias você usa os dois primeiros — então domine-os bem antes de qualquer glamour de machine learning. O segredo da extração não é o comando: é conferir o que chegou antes de calcular qualquer coisa.",
    sections: [
      {
        kind: "code", lang: "python", title: "Carregando e farejando o arquivo",
        caption: ds ? `Escrito para o seu arquivo: ${file}` : "O ritual dos primeiros 5 minutos com qualquer CSV",
        code: `import pandas as pd

# O básico que 90% dos juniores pulam:
# 1) avisar separador e decimal (dado brasileiro usa ; e vírgula)
# 2) já converter datas na leitura
df = pd.read_csv(
    "${file}",
    sep=";",
    decimal=",",
    parse_dates=["${date}"],
    dayfirst=True,
)

df.shape              # (linhas, colunas) — o tamanho do problema
df.dtypes             # tipos inferidos: NUNCA calcule sem conferir
df.head()             # 5 primeiras linhas — o "cheiro" do dado
df.info()             # nulos e memória de uma vez só
df.describe()         # resumo estatístico das numéricas
df["${num}"].nunique()  # valores únicos: é 1 por linha ou repetiu?`,
      },
      {
        kind: "code", lang: "python", title: "Extraindo direto do banco (onde os dados moram)",
        code: `from sqlalchemy import create_engine

engine = create_engine("postgresql://usuario:senha@host:5432/analytics")

# Boa prática de gente grande: filtre no SQL, não no Python.
query = """
    SELECT ${date}, ${cat}, ${num}
    FROM ${table}
    WHERE ${date} >= '2024-01-01'
"""
df = pd.read_sql(query, engine)`,
      },
      {
        kind: "code", lang: "python", title: "Quando o dado vem de API",
        code: `import requests

r = requests.get(
    "https://api.empresa.com/v1/vendas",
    headers={"Authorization": "Bearer SEU_TOKEN"},
    timeout=10,               # SEMPRE timeout
)
r.raise_for_status()          # erro 4xx/5xx vira exceção, não silêncio

df = pd.json_normalize(r.json()["results"])  # achata JSON aninhado`,
      },
      {
        kind: "list", title: "Check-list dos primeiros 5 minutos",
        items: [
          { strong: "dtypes batem com a realidade?", text: "Coluna numérica lida como object é o bug nº 1 do júnior — e silencia tudo que vem depois." },
          { strong: "Tem nulo? Onde e quanto?", text: "df.isna().sum() antes de qualquer cálculo. Nulo em 2% é rotina; em 40% é conversa com quem gerou o dado." },
          { strong: "A chave é única?", text: "Se cada linha deveria ser um pedido, o id precisa ser único. Duplicata de join infla receita em silêncio." },
          { strong: "Os ranges fazem sentido?", text: "Idade de 300 anos, receita negativa, data no futuro: range absurdo é dado corrompido pedindo socorro." },
        ],
      },
      { kind: "tip", tone: "info", title: "A regra do cheiro", text: "Se um número te estranhar, PARE e investigue antes de seguir. Estranhamento é o detector de dado sujo mais barato que existe. Os grandes bugs de análise começam com um “ué…” ignorado." },
    ],
  };

  const m03: MentorModule = {
    id: "limpeza", step: "03", title: "Limpeza com Python", tagline: "onde a análise é ganha ou perdida",
    intro:
      "Preste atenção nesta frase: dado sujo não avisa que está sujo — ele só mente com muita confiança. É por isso que limpeza é a etapa onde a análise é ganha ou perdida. Vou te passar o ritual na ordem exata em que os seniores executam: primeiro duplicadas, depois nulos, em seguida tipos, então outliers e por fim texto. A ordem importa: não adianta caçar outlier numa coluna que o pandas ainda enxerga como texto.",
    sections: [
      {
        kind: "code", lang: "python", title: "Passo 1 — Duplicatas: o bug que infla tudo",
        code: `print(df.duplicated().sum())               # linhas 100% repetidas
print(df.duplicated(subset=["id"]).sum())  # repetidas pela chave de negócio

df = df.drop_duplicates()                  # remove as exatas

# Repetição por chave: decida quem fica (aqui, a mais recente)
df = df.sort_values("${date}").drop_duplicates(subset=["id"], keep="last")`,
      },
      {
        kind: "code", lang: "python", title: "Passo 2 — Nulos: medir, decidir, tratar",
        code: `df.isna().sum()    # onde estão os buracos
df.isna().mean()   # em % — acima de ~30%, imputar vira chute

# Numérica: MEDIANA (não média! a média é sequestrada por outliers)
df["${num}"] = df["${num}"].fillna(df["${num}"].median())

# Categórica: moda — ou uma categoria honesta
df["${cat}"] = df["${cat}"].fillna("não informado")

# Nulo que É informação: venda sem desconto é desconto 0
df["desconto"] = df["desconto"].fillna(0)`,
      },
      {
        kind: "code", lang: "python", title: "Passo 3 — Tipos: onde “1.234,56” vira número",
        code: `df["${num}"] = (
    df["${num}"]
    .astype(str)
    .str.replace("R$ ", "", regex=False)
    .str.replace(".", "", regex=False)    # separador de milhar
    .str.replace(",", ".", regex=False)   # separador decimal
)
df["${num}"] = pd.to_numeric(df["${num}"], errors="coerce")

# errors="coerce": o que não virar número vira NaN — tratado no passo 2
df["${date}"] = pd.to_datetime(df["${date}"], dayfirst=True, errors="coerce")`,
      },
      {
        kind: "code", lang: "python", title: "Passo 4 — Outliers com Tukey (sem achismo)",
        code: `q1, q3 = df["${num}"].quantile([0.25, 0.75])
iqr = q3 - q1
cerca_inf = q1 - 1.5 * iqr
cerca_sup = q3 + 1.5 * iqr
${fenceComment}

fora = df[(df["${num}"] < cerca_inf) | (df["${num}"] > cerca_sup)]
print(f"{len(fora)} linhas fora das cercas ({len(fora)/len(df):.1%})")

# Outlier REAL (pedido B2B legítimo) FICA e ganha flag;
# ERRO DE DIGITAÇÃO sai.
df["e_outlier"] = ~df["${num}"].between(cerca_inf, cerca_sup)`,
      },
      {
        kind: "code", lang: "python", title: "Passo 5 — Texto padronizado",
        code: `df["${cat}"] = df["${cat}"].str.strip().str.title()
# " sudeste ", "SUDESTE" e "Sudeste" viram a MESMA categoria`,
      },
      {
        kind: "list", title: "Os 4 pecados da limpeza",
        items: [
          { strong: "Apagar nulo sem perguntar por quê", text: "Nulo raramente é aleatório: cliente sem telefone pode ser exatamente o perfil que você estuda. Antes do fillna, pergunte à origem do dado." },
          { strong: "Imputar numérica com a média", text: "Um outlier de R$ 1 mi puxa a média junto; a mediana não sente nada. Numérica com cauda: sempre mediana." },
          { strong: "Deletar outlier no automático", text: "Outlier é sinal. O sensor que “estraga” o gráfico costuma ser a descoberta — investigue antes de apagar a história." },
          { strong: "Limpar sem deixar rastro", text: "Guarde o df_bruto e anote cada transformação. Quando o número “não bater” na reunião, você refaz o caminho em minutos." },
        ],
      },
      ...hygieneTip,
    ],
  };

  const m04: MentorModule = {
    id: "sql", step: "04", title: "SQL na prática", tagline: "a língua materna dos dados",
    intro:
      "O Python visita o dado; o SQL mora com ele. Estes quatro padrões resolvem ~90% das análises que vão te pedir — agregação, filtro de grupos, join e funções de janela. Domine-os nesta ordem e você responde à maioria das perguntas de negócio sem sair do banco.",
    sections: [
      {
        kind: "code", lang: "sql", title: "Padrão 1 — Agregação bem feita",
        code: `-- Quanto cada ${cat} gerou de ${num}?
SELECT
    ${cat}                     AS grupo,
    COUNT(*)                   AS linhas,
    SUM(${num})                AS total,
    ROUND(AVG(${num}), 2)      AS media,
    MIN(${num})                AS minimo,
    MAX(${num})                AS maximo
FROM ${table}
WHERE ${date} >= DATE '2024-01-01'
GROUP BY ${cat}
ORDER BY total DESC;
-- MIN/MAX "de brinde" denunciam outlier na hora.`,
      },
      {
        kind: "code", lang: "sql", title: "Padrão 2 — HAVING: o filtro dos grupos",
        code: `SELECT
    ${cat}                AS grupo,
    ROUND(AVG(${num}), 2) AS media
FROM ${table}
GROUP BY ${cat}
HAVING COUNT(*) >= 30   -- WHERE filtra linhas ANTES; HAVING filtra grupos DEPOIS
ORDER BY media DESC;
-- Média de 3 linhas não é insight, é anedota.`,
      },
      {
        kind: "code", lang: "sql", title: "Padrão 3 — LEFT JOIN com conferência",
        code: `SELECT
    c.regiao,
    COUNT(DISTINCT p.id)  AS pedidos,
    SUM(p.receita)        AS receita
FROM pedidos p
LEFT JOIN clientes c
       ON c.id = p.cliente_id   -- LEFT mantém pedido sem cliente
GROUP BY c.regiao
ORDER BY receita DESC;

-- Conferência obrigatória: o COUNT(*) DEPOIS do join precisa bater
-- com o de ANTES. Cresceu? O join multiplicou linhas.`,
      },
      {
        kind: "code", lang: "sql", title: "Padrão 4 — CTE + janela",
        code: `WITH mensal AS (
    SELECT
        DATE_TRUNC('month', ${date})  AS mes,
        SUM(${num})                   AS valor
    FROM ${table}
    GROUP BY 1
)
SELECT
    mes,
    valor,
    SUM(valor) OVER (ORDER BY mes)                AS acumulado,
    valor - LAG(valor) OVER (ORDER BY mes)        AS delta_vs_mes_ant,
    ROUND(100.0 * valor / SUM(valor) OVER (), 1)  AS pct_do_total,
    RANK() OVER (ORDER BY valor DESC)             AS posicao
FROM mensal
ORDER BY mes;`,
      },
      {
        kind: "list", title: "Regras de sobrevivência em SQL",
        items: [
          { strong: "SELECT * em produção é crime", text: "Liste as colunas: menos rede, menos memória, menos surpresa." },
          { strong: "Filtre cedo", text: "WHERE antes de JOIN, JOIN antes de GROUP BY. Seu job roda em minutos — não em horas." },
          { strong: "NULL não é zero", text: "NULL é “não sei”. AVG ignora NULL, COUNT(*) conta a linha, COUNT(col) não." },
          { strong: "100.0, não 100", text: "Inteiro ÷ inteiro trunca: 1/2 = 0. Multiplique por 100.0 para forçar decimal." },
        ],
      },
    ],
  };

  const picks: ChartPick[] = [
    { name: "Linha", glyph: "line", when: "Você tem uma data e quer contar como algo mudou.", why: "O olho rastreia inclinação melhor que qualquer outra forma: subida, queda e sazonalidade aparecem em meio segundo.", mistake: "Usar linha quando o eixo x não é tempo. Linha pressupõe continuidade entre os pontos." },
    { name: "Barras horizontais", glyph: "bars", when: "Comparar tamanhos entre grupos: regiões, produtos, canais.", why: "Comparar comprimento é a percepção humana mais precisa que existe (Cleveland & McGill). Na horizontal, rótulo longo cabe sem girar.", mistake: "Ordem alfabética. Sempre ordene por valor: a ordem já é metade da análise." },
    { name: "Histograma", glyph: "hist", when: "Entender como uma métrica se espalha: onde concentra, se tem cauda.", why: "A média esconde a forma. Duas colunas com média R$ 300 podem ser mundos diferentes — o histograma mostra qual é o caso.", mistake: "Bins no chute. Comece por √n e ajuste até a forma “falar”." },
    { name: "Boxplot", glyph: "box", when: "Comparar distribuições entre grupos e apontar extremos com critério.", why: "Resumo de 5 números numa caixa: mediana, quartis, bigodes de Tukey e pontos fora da cerca.", mistake: "Apresentar para quem nunca viu um. Boxplot pede 20 segundos de legenda." },
    { name: "Dispersão + regressão", glyph: "scatter", when: "Testar se duas métricas dançam juntas — e quão juntas.", why: "Mostra direção, força e os pontos que fogem da reta, tudo junto. Com a reta OLS até a diretoria entende.", mistake: "Confundir correlação com causalidade. Sorvete e afogamento correlacionam — um não causa o outro." },
    { name: "Rosca", glyph: "donut", when: "Partes de um todo, com 5 categorias ou menos.", why: "Funciona quando a pergunta é “de cada R$ 100, quanto vem de cada canal?”. O centro guarda o total.", mistake: "Mais de 5 fatias, “outros” gigante — ou torta 3D. Aí ninguém compara mais nada." },
  ];

  const catProf = ds?.profiles.find((p) => p.name === cat);
  const dsPicks: MentorSection[] = ds
    ? [{
        kind: "picks", title: "O que o SEU dataset pede",
        items: [
          ...(ds.dateCols.length ? [{ col: date, chart: "Linha temporal", why: `${f(ds.finalRows)} linhas com a evolução de ${num} por período é a manchete natural — e já está pronta no Console.` }] : []),
          ...(np ? [{ col: num, chart: "Histograma + boxplot", why: `distribuição com g₁ = ${f(skew, 2)}; média (${f(mean)}) e mediana (${f(median)}) ${Math.abs(mean - median) > 0.08 * Math.max(Math.abs(mean), 1) ? "discordam — o histograma mostra o porquê" : "andam juntas"}.` }] : []),
          ...(ds.categoricalCols.length ? [{ col: cat, chart: "Barras horizontais", why: `${catProf?.unique ?? "várias"} categorias únicas: o ranking responde “onde concentrar esforço” em um segundo.` }] : []),
          ...(pair ? [{ col: `${pair.x} × ${pair.y}`, chart: "Dispersão com OLS", why: `r = ${f(pair.r, 2)} — a correlação mais forte do conjunto (${strength(pair.r)}).` }] : []),
        ],
      }]
    : [];

  const m05: MentorModule = {
    id: "graficos", step: "05", title: "Os gráficos certos — e o porquê", tagline: "cada gráfico responde a UMA pergunta",
    intro:
      "Chegamos na parte que todo mundo vê — e onde o júnior mais erra. Gráfico não é enfeite, é argumento visual: cada tipo responde a UMA pergunta específica. Entenda o “quando usar” e o “por que funciona” de cada um — porque é o porquê que te deixa escolher sozinho diante de qualquer dado novo.",
    sections: [
      { kind: "charts", title: "O arsenal mínimo, com justificativa científica", picks },
      ...dsPicks,
      { kind: "tip", tone: "info", title: "A ordem de apresentação dos grandes", text: "Manchete (linha do tempo) → ranking (barras) → profundidade (histograma/boxplot) → evidência (dispersão). Quem apresenta na ordem da curiosidade segura a sala do primeiro ao último slide." },
    ],
  };

  const pearsonEx = pair
    ? `No SEU dataset, o par mais forte é ${pair.x} × ${pair.y} com r = ${f(pair.r, 2)} — uma relação ${strength(pair.r)}. O Console já plota a reta OLS dele.`
    : "Exemplo clássico: horas de estudo × nota costuma dar r ≈ 0,6 (moderada positiva). Já sorvete × afogamento dá r alto no verão — e nenhum causa o outro.";

  const formulas: FormulaItem[] = [
    { id: "mean", name: "Média aritmética (μ)", explain: "Soma tudo e divide pela quantidade. É o “centro de gravidade” dos dados — exatamente por isso qualquer gigante puxa ela para o lado.", example: hasStats ? `No seu dado, ${num}: μ = ${f(mean)} vs. mediana = ${f(median)}.` : "Salários de 5 pessoas: 3k, 3k, 4k, 4k e 50k → média de R$ 12,8 mil. Quatro em cada cinco ganham menos que a “média”.", rule: "Confie quando a distribuição é simétrica (|g₁| < 0,5). Com cauda, ela mente — e mente bonito." },
    { id: "median", name: "Mediana (x̃)", explain: "O valor do meio quando tudo está ordenado: metade abaixo, metade acima. Nenhum gigante consegue puxá-la.", example: hasStats ? `Mediana de ${num} no seu dataset: ${f(median)}. É o número “típico” de verdade.` : "Nos mesmos salários, a mediana é R$ 4 mil — o retrato honesto do grupo.", rule: "Use sempre que houver cauda (|g₁| > 1) ou outliers. Renda, preços e tempos → mediana." },
    { id: "std", name: "Desvio padrão (σ)", explain: "A distância típica de cada ponto até a média. σ pequeno = previsível; σ grande = volátil.", example: hasStats ? `${num}: σ = ${f(std)}. Pela regra 68-95-99,7, ~68% das linhas caem entre ${f(mean - std)} e ${f(mean + std)}.` : "Notas com média 7 e σ = 0,5: turma homogênea. σ = 2,5: metade em risco.", rule: "σ só faz sentido junto da média e na mesma unidade da coluna." },
    { id: "iqr", name: "Quartis e IQR (Tukey)", explain: "Q1 e Q3 delimitam os 50% do meio; IQR = Q3 − Q1. As cercas ficam a 1,5×IQR — quem passa é outlier técnico.", example: hasStats ? `${num}: Q1 = ${f(q1)}, Q3 = ${f(q3)} → IQR = ${f(iqr)}. ${outN} linha(s) passaram da cerca.` : "Preços: Q1 = 90, Q3 = 150 → cercas em 0 e 240.", rule: "Método robusto: prefira ao z-score quando a distribuição é assimétrica — é o mesmo que o motor do Anthony.ia usa." },
    { id: "pct", name: "Variação percentual (Δ%)", explain: "Quanto cresceu sobre a base antiga. Pegadinha: diferença em pontos percentuais NÃO é variação percentual.", example: "Margem de 10% para 12%: são 2 p.p. de ganho — mas em variação relativa é +20%. Apresente os dois.", rule: "Base pequena infla %: “+500%” sobre 2 vendas são 10 vendas. Nunca publique um Δ% sem o número bruto." },
    { id: "pearson", name: "Correlação de Pearson (r)", explain: "Mede a dança LINEAR de duas variáveis, de −1 a +1. O numerador é a covariância; o denominador normaliza pela dispersão de cada uma.", example: pearsonEx, rule: "|r| < 0,4 fraca · 0,4–0,7 moderada · > 0,7 forte. E r ≈ 0 só descarta relação LINEAR." },
  ];

  const m06: MentorModule = {
    id: "matematica", step: "06", title: "A matemática por trás", tagline: "as 6 ferramentas de toda análise séria",
    intro:
      "Reta final da trilha Júnior. Você não precisa demonstrar teorema — precisa saber o que cada número SIGNIFICA e quando ele mente. Estas seis ferramentas aparecem em toda análise séria; com os exemplos calculados no seu próprio dado, elas deixam de ser fórmulas e viram instinto.",
    sections: [
      { kind: "formulas", title: "Fórmulas com leitura de mundo", items: formulas },
      { kind: "tip", tone: "warn", title: "A frase que salva análise", text: "Sempre que alguém disser “a média subiu”, você pergunta: “e a mediana?”. Se as duas andam juntas, a história é real; se divergem, alguém está contando vantagem." },
      { kind: "tip", tone: "good", title: "Trilha Júnior concluída — e agora?", text: "Você dominou o ciclo completo: perguntas → extração → limpeza → query → gráfico → matemática. O próximo degrau é a trilha PLENO: modelagem dimensional, KPIs de negócio e domínio de Tableau e Power BI. Troque o nível no topo da página quando se sentir pronto(a)." },
    ],
  };

  return [m01, m02, m03, m04, m05, m06];
}

/* =====================================================================
   TRILHA PLENO
   ===================================================================== */

function buildPleno(ds: Dataset | null): MentorModule[] {
  const date = ds?.dateCols[0] ?? "data_pedido";
  const cat = ds?.categoricalCols[0] ?? "regiao";
  const num = ds?.numericCols[0] ?? "receita";
  const table = ds
    ? (ds.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "dataset")
    : "vendas";

  const m01: MentorModule = {
    id: "modelagem", step: "01", title: "Modelagem dimensional", tagline: "star schema: o idioma dos dashboards",
    intro:
      "Na trilha Júnior você limpou tabelas. Na Pleno, você projeta MODELOS — porque análise que roda em cima de 40 JOINs morre na produção. O star schema é o formato que todo BI entende: uma tabela FATO no centro (o que aconteceu) cercada de DIMENSÕES (quem, onde, quando). Quem domina isso constrói dashboards que respondem em segundos e sobrevivem a mudanças de negócio.",
    sections: [
      {
        kind: "list", title: "O vocabulário que destrava tudo",
        items: [
          { strong: "Fato = evento medido", text: "Cada linha é algo que aconteceu: uma venda, um clique, um chamado. Fatos têm chaves estrangeiras para as dimensões e colunas numéricas (as medidas)." },
          { strong: "Dimensão = contexto", text: "Cliente, produto, tempo, geografia. Tabelas pequenas, descritivas, que respondem “quem/onde/quando”. NUNCA guarde descrição repetida dentro do fato." },
          { strong: "Granularidade é a decisão nº 1", text: "O fato é por pedido? Por item do pedido? Por dia e loja? Definir granularidade errado é o erro mais caro da modelagem — e o mais difícil de desfazer depois." },
          { strong: "Dimensão tempo é obrigatória", text: "Uma tabela d_calendario com dia, semana, mês, trimestre, feriado e flag de fim de semana. Sem ela, toda pergunta temporal vira gambiarra de DATE_TRUNC." },
          { strong: "SCD tipo 2: o cliente muda, a história fica", text: "Cliente mudou de região em março? Venda de janeiro continua atribuída à região antiga. SCD2 guarda versões com vigência — e salva relatórios históricos." },
        ],
      },
      {
        kind: "code", lang: "sql", title: "Montando o star schema do zero",
        code: `-- DIMENSÕES: pequenas, descritivas, estáveis
CREATE TABLE d_tempo AS
SELECT
    d::date                     AS data,
    EXTRACT(year FROM d)        AS ano,
    EXTRACT(month FROM d)       AS mes,
    DATE_TRUNC('week', d)::date AS semana,
    EXTRACT(dow FROM d) IN (0,6) AS e_fim_de_semana
FROM generate_series('2023-01-01'::date, '2026-12-31', '1 day') d;

CREATE TABLE d_${cat} (
    id     SERIAL PRIMARY KEY,
    nome   TEXT,
    macro  TEXT     -- ex.: agrupa estados em macrorregião
);

-- FATO: um registro por evento, na menor granularidade útil
CREATE TABLE f_${table} (
    id          BIGINT PRIMARY KEY,
    data_sk     INT REFERENCES d_tempo(data),
    ${cat}_sk   INT REFERENCES d_${cat}(id),
    ${num}      NUMERIC(14,2),   -- medida
    quantidade  INT              -- medida aditiva: soma sem medo
);

-- Regra de ouro: medidas ADITIVAS somam em qualquer dimensão.
-- Ticket médio NÃO é aditivo — derive de SUM(receita)/SUM(qtd).`,
      },
      {
        kind: "tip", tone: "warn", title: "O pecado do “fato gordo”",
        text: "Colocar nome do cliente, endereço e CPF dentro da tabela fato parece prático — até o cliente mudar de endereço e seus relatórios históricos mentirem. Fato guarda CHAVE; dimensão guarda DESCRIÇÃO. Sempre.",
      },
      {
        kind: "tip", tone: "good", title: "O teste do star schema bem feito",
        text: `Se qualquer pergunta nova sobre ${num} cabe em “escolher medidas + arrastar dimensões + filtrar”, o modelo está bom. Se a pergunta exige JOIN novo, a modelagem ainda não acabou.`,
      },
    ],
  };

  const m02: MentorModule = {
    id: "metricas", step: "02", title: "KPIs & métricas de negócio", tagline: "números que mudam decisão",
    intro:
      "Júnior calcula o que pedem. Pleno propõe o que DEVE ser medido — e sabe que 90% dos dashboards morrem por métrica errada, não por gráfico feio. Aqui está o repertório: métrica-norte, cohorts, retenção, LTV/CAC e a disciplina de transformar dado em indicador acionável.",
    sections: [
      {
        kind: "list", title: "A hierarquia das métricas",
        items: [
          { strong: "Métrica-norte (North Star)", text: "O ÚNICO número que resume entrega de valor: Spotify = horas ouvidas, Airbnb = noites reservadas. Todo o resto é insumo dela. Empresa sem North Star otimiza vanidade." },
          { strong: "Métricas de input vs. output", text: "Receita é OUTPUT — você não age direto nela. Atue nos INPUTS: conversão, tickets resolvidos, tempo de entrega. Dashboard bom mostra a cadeia causa → efeito." },
          { strong: "Taxa > absoluto, sempre", text: "“+200 vendas” sem a base não diz nada. “Conversão 2,1% → 2,6%” diz. E toda taxa precisa do denominador visível no tooltip." },
          { strong: "Cohort: a máquina do tempo", text: "Agrupe usuários pelo mês de entrada e acompanhe cada turma ao longo do tempo. É a ÚNICA forma honesta de medir retenção — média global esconde a deterioração." },
          { strong: "LTV/CAC: a razão que paga as contas", text: "Quanto um cliente rende na vida (LTV) vs. quanto custa trazer (CAC). Abaixo de 3, o negócio queima dinheiro para crescer. Acima de 5, talvez esteja investindo pouco." },
        ],
      },
      {
        kind: "code", lang: "sql", title: "Cohort de retenção em SQL puro",
        code: `WITH primeiro AS (
    SELECT cliente_id,
           DATE_TRUNC('month', MIN(${date})) AS mes_entrada
    FROM ${table}
    GROUP BY cliente_id
),
atividade AS (
    SELECT t.cliente_id,
           p.mes_entrada,
           EXTRACT(month FROM AGE(DATE_TRUNC('month', t.${date}), p.mes_entrada)) AS meses_desde
    FROM ${table} t
    JOIN primeiro p USING (cliente_id)
)
SELECT
    mes_entrada,
    COUNT(DISTINCT CASE WHEN meses_desde = 0 THEN cliente_id END) AS base,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN meses_desde = 1 THEN cliente_id END)
        / NULLIF(COUNT(DISTINCT CASE WHEN meses_desde = 0 THEN cliente_id END), 0), 1) AS retencao_m1,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN meses_desde = 3 THEN cliente_id END)
        / NULLIF(COUNT(DISTINCT CASE WHEN meses_desde = 0 THEN cliente_id END), 0), 1) AS retencao_m3
FROM atividade
GROUP BY mes_entrada
ORDER BY mes_entrada;
-- Cada linha = uma turma; cada coluna = idade da turma.`,
      },
      {
        kind: "tip", tone: "warn", title: "Métrica de vanidade: o detector",
        text: "Se o número só sobe, nunca gera ação e todo mundo comemora sem saber o que fazer com ele — é vanidade (downloads acumulados, seguidores). Troque por uma métrica que doa: “ativos nos últimos 30 dias” dói, e por isso serve.",
      },
      {
        kind: "tip", tone: "info", title: "A régua do indicador confiável",
        text: "Toda métrica publicada precisa de: definição escrita em uma frase, dono com nome e sobrenome, fonte única no modelo dimensional e meta visível ao lado do número. Sem isso, dois times vão discutir… com números diferentes da mesma coisa.",
      },
    ],
  };

  const m03: MentorModule = {
    id: "plataforma-tableau", step: "03", title: "Tableau de verdade", tagline: "a ferramenta que fala a língua do visual",
    intro:
      "Tableau não é “arrastar e soltar” — é uma linguagem. Quem só arrasta faz gráfico; quem entende LOD, parâmetros e ações faz PRODUTO de dados. Vou te mostrar a arquitetura mental da ferramenta e os 20% de recursos que resolvem 80% dos pedidos de dashboard.",
    sections: [
      {
        kind: "list", title: "O modelo mental do Tableau",
        items: [
          { strong: "Tudo é agregação por marca", text: "O Tableau agrega na granularidade da visualização (o que está nas prateleiras). Entender isso resolve 70% dos “número veio errado”." },
          { strong: "Extração vs. conexão viva", text: "Extração (.hyper) = rápida, agendável, com dados consolidados. Conexão viva = sempre atual, mas cada clique é uma query no banco. Default profissional: extração." },
          { strong: "Campos calculados vivem no modelo", text: "Cálculo usado em 3 dashboards vai para a fonte, não duplicado em cada pasta de trabalho. Repetição de cálculo é dívida técnica visual." },
          { strong: "Parâmetros + ações = aplicativo", text: "Parâmetro deixa o usuário trocar a métrica/periodicidade; ação de filtro conecta as abas. É a diferença entre “relatório” e “ferramenta que o time usa todo dia”." },
        ],
      },
      {
        kind: "code", lang: "python", title: "Campos calculados e LOD (a sintaxe é própria, mas pense como expressão)",
        caption: "Sintaxe de cálculo do Tableau, não Python",
        code: `// 1) Cálculo simples — margem protegida contra divisão por zero
[Receita] - [Custo] / NULLIF([Receita], 0)

// 2) LOD FIXED — agregue por região, independente da visualização
{ FIXED [${cat}] : SUM([${num}]) }

// 3) LOD INCLUDE — granularidade FINER que a viz
{ INCLUDE [Cliente] : SUM([${num}]) }   // receita por cliente…
AVG( { INCLUDE [Cliente] : SUM([${num}]) } )  // …e o ticket médio real

// 4) Datas — o clássico YTD
DATEPART('year', [${date}]) = DATEPART('year', TODAY())

// 5) Parâmetro p_periodo + cálculo dinâmico
CASE [p_periodo]
  WHEN 'Mês'     THEN DATETRUNC('month', [${date}])
  WHEN 'Semana'  THEN DATETRUNC('week',  [${date}])
  WHEN 'Dia'     THEN DATETRUNC('day',   [${date}])
END`,
      },
      {
        kind: "list", title: "O kit de entrega profissional",
        items: [
          { strong: "Hierarquias de data e geografia", text: "Ano > Trimestre > Mês > Dia nativo; CEP/UF viram mapa. Drill-down de graça." },
          { strong: "Tooltips que contam história", text: "Tooltip com contexto (“vs. mesmo mês do ano anterior: +12%”) vale mais que 3 gráficos a mais." },
          { strong: "Publicação com governança", text: "Tableau Server/Cloud com projeto por área, permissão por grupo e extração agendada no horário de menor uso." },
        ],
      },
      {
        kind: "tip", tone: "info", title: "Onde o Tableau brilha — e onde dói",
        text: "Brilha: exploração visual livre, apresentações para diretoria, prototipagem em minutos. Dói: transformações pesadas de dados (faça no banco/dbt antes) e controle fino de layout pixel a pixel. Traga o dado pronto e o Tableau faz mágica; tente limpar dado nele e a mágica acaba.",
      },
    ],
  };

  const m04: MentorModule = {
    id: "plataforma-powerbi", step: "04", title: "Power BI end-to-end", tagline: "Power Query → DAX → Serviço",
    intro:
      "Power BI domina o mercado corporativo brasileiro — e o domínio vem de um pipeline de três atos: Power Query prepara, o modelo relaciona, DAX calcula. Quem pula o primeiro ato paga juros em DAX para sempre. Vou te mostrar o fluxo completo com as expressões que caem em toda entrevista e em todo projeto real.",
    sections: [
      {
        kind: "list", title: "Os 3 atos do Power BI",
        items: [
          { strong: "Ato 1 — Power Query (linguagem M)", text: "Conecta, limpa e transforma ANTES do modelo. Regra: tudo que dá para fazer no Power Query NÃO se faz em DAX. Coluna calculada é último recurso; medida é o padrão." },
          { strong: "Ato 2 — Modelagem relacional", text: "Star schema de novo (olha ele aqui): tabelas fato + dimensões com relacionamentos 1→*, filtro fluindo da dimensão para o fato. Desative “referência cruzada bidirecional” — ela quase sempre esconde um modelo mal desenhado." },
          { strong: "Ato 3 — DAX e tempo", text: "Medidas com inteligência de tempo nativa: YTD, mesmo período do ano anterior, médias móveis. Tudo depende de uma d_calendario marcada como tabela de datas." },
        ],
      },
      {
        kind: "code", lang: "sql", title: "DAX essencial (sintaxe de medidas Power BI)",
        caption: "Cole na guia Modelagem → Nova Medida",
        code: `// Medida base
Receita = SUM(f_vendas[receita])

// O coração do DAX: CALCULATE muda o contexto de filtro
Receita Sudeste =
    CALCULATE([Receita], d_regiao[nome] = "Sudeste")

// Inteligência de tempo — exige d_calendario
Receita YTD =
    TOTALYTD([Receita], d_calendario[data])

Receita Ano Anterior =
    CALCULATE([Receita], SAMEPERIODLASTYEAR(d_calendario[data]))

Variação % YoY =
    DIVIDE([Receita] - [Receita Ano Anterior], [Receita Ano Anterior])

// Ticket médio correto: razão de somas, nunca média de médias
Ticket Médio =
    DIVIDE(SUM(f_vendas[receita]), SUM(f_vendas[quantidade]))

// Ranking dinâmico dentro do visual
Rank Região =
    RANKX(ALL(d_regiao[nome]), [Receita])`,
      },
      {
        kind: "list", title: "Publicar como gente grande",
        items: [
          { strong: "Workspace por domínio", text: "Um workspace por área de negócio, apps para distribuição e gateways configurados para dados on-premise." },
          { strong: "RLS quando o dado é sensível", text: "Row-Level Security: o gerente regional só vê a região dele, com a MESMA base. Segurança no modelo, não no “não compartilha o link”." },
          { strong: "Atualização incremental", text: "Histórico de 3 anos não precisa recarregar todo dia — incremental atualiza só a partição recente." },
        ],
      },
      {
        kind: "tip", tone: "warn", title: "Os 3 erros que denunciam iniciante em Power BI",
        text: "1) Coluna calculada onde cabia medida (explode o arquivo). 2) Relacionamentos muitos-para-muitos “para resolver rápido”. 3) Medida com FILTER(ALL()) em tudo, quebrando qualquer filtro do visual. Se você não sabe explicar o contexto de filtro da sua medida, ela ainda não está pronta.",
      },
    ],
  };

  const m05: MentorModule = {
    id: "sql-avancado", step: "05", title: "SQL em nível de produção", tagline: "performance e padrões avançados",
    intro:
      "Seu SQL da trilha Júnior resolve perguntas. O SQL da Pleno precisa resolver perguntas RÁPIDO, sobre tabelas com centenas de milhões de linhas, sem derrubar o banco do produto. Aqui entram leitura de plano de execução, índices com propósito e os padrões que separam quem consulta de quem projeta consultas.",
    sections: [
      {
        kind: "code", lang: "sql", title: "EXPLAIN: o raio-x da query",
        code: `EXPLAIN (ANALYZE, BUFFERS)
SELECT ${cat}, SUM(${num})
FROM ${table}
WHERE ${date} >= '2024-01-01'
GROUP BY ${cat};

-- Leia o plano de BAIXO para cima. Sinais vermelhos:
--  Seq Scan em tabela gigante    → falta índice no WHERE
--  Nested Loop com milhões       → join sem índice na chave
--  Sort Method: external merge   → work_mem pequeno / ORDER BY caro
--  actual time vs. rows estimado → estatísticas desatualizadas (ANALYZE)`,
      },
      {
        kind: "code", lang: "sql", title: "Índices com propósito (não com superstição)",
        code: `-- Filtro recorrente por período: índice na coluna do WHERE
CREATE INDEX idx_${table}_${"data"} ON ${table} (${date});

-- Filtro + agregação: índice COBERTOR evita ir à tabela
CREATE INDEX idx_coberto ON ${table} (${date}) INCLUDE (${num}, ${cat});

-- Composto: ordem importa — a coluna mais seletiva na frente
CREATE INDEX idx_duplo ON ${table} (${cat}, ${date});

-- Regra: índice acelera leitura e ATRASA escrita.
-- Tabela de evento com 50k inserts/min não quer 12 índices.`,
      },
      {
        kind: "code", lang: "sql", title: "Janelas em profundidade: framing e NTH_VALUE",
        code: `SELECT
    ${date}::date AS dia,
    SUM(${num})   AS receita,

    -- média móvel de 7 dias COMPLETA (frame explícito)
    AVG(SUM(${num})) OVER (
        ORDER BY ${date}::date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS mm7,

    -- melhor dia do mês até agora
    MAX(SUM(${num})) OVER (
        PARTITION BY DATE_TRUNC('month', ${date})
        ORDER BY ${date}::date
    ) AS recorde_do_mes,

    -- segundo maior dia (NTH_VALUE exige frame UNBOUNDED)
    NTH_VALUE(SUM(${num}), 2) OVER (
        PARTITION BY DATE_TRUNC('month', ${date})
        ORDER BY SUM(${num}) DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS segundo_maior
FROM ${table}
GROUP BY 1
ORDER BY 1;`,
      },
      {
        kind: "list", title: "Padrões que pagam o salário",
        items: [
          { strong: "Anti-join para “não tem”", text: "LEFT JOIN … WHERE b.id IS NULL (ou NOT EXISTS) para achar clientes SEM compra. NOT IN com coluna nulável é armadilha clássica — NULL envenena tudo." },
          { strong: "Paginação por keyset", text: "WHERE id > :ultimo_id ORDER BY id LIMIT 50 escala; OFFSET 1000000 faz o banco ler e descartar um milhão de linhas." },
          { strong: "UPSERT idempotente", text: "INSERT … ON CONFLICT (id) DO UPDATE para pipelines que podem rodar duas vezes sem duplicar nada." },
        ],
      },
      { kind: "tip", tone: "info", title: "A ordem mental de otimização", text: "1) Escreva correto. 2) Meça com EXPLAIN ANALYZE. 3) Corte dados cedo (filtro/partição). 4) Indexe o gargalo medido. 5) Só então pense em reescrever exótico. Otimizar sem medir é superstição com teclado." },
    ],
  };

  const m06: MentorModule = {
    id: "estatistica", step: "06", title: "Estatística para decidir", tagline: "testes A/B e intervalos de confiança",
    intro:
      "Último módulo da Pleno — e o divisor de águas. A pergunta muda de “quanto é?” para “isso é real ou ruído?”. Toda mudança de produto, preço ou campanha precisa dessa disciplina: sem ela, você chama de vitória o que foi sorte. Vou te dar o kit mínimo de inferência com honestidade — incluindo quando o teste NÃO serve.",
    sections: [
      {
        kind: "list", title: "O vocabulário da inferência",
        items: [
          { strong: "Hipótese nula (H₀)", text: "“Não existe diferença entre os grupos.” O teste tenta REJEITAR H₀ — nunca “provar” a alternativa. Sutil, mas muda como você fala do resultado." },
          { strong: "p-valor", text: "Probabilidade de ver um resultado TÃO extremo quanto o observado SE H₀ fosse verdade. p = 0,03 NÃO é “97% de chance de funcionar”. É só um alerta de raridade." },
          { strong: "Intervalo de confiança", text: "Faixa plausível para o efeito real. “Conversão subiu 0,5 p.p. (IC 95%: 0,1 a 0,9)” — se o IC cruza o zero, o efeito pode ser nada." },
          { strong: "Poder estatístico e tamanho amostral", text: "Antes de rodar: quantas amostras preciso para detectar um efeito de 5%? Teste sem poder é loteria — e resultado “não significativo” vira falso conforto." },
          { strong: "Significância prática ≠ estatística", text: "Com 5 milhões de linhas, até 0,01% de diferença “significa”. A pergunta certa: esse efeito paga o custo da mudança?" },
        ],
      },
      {
        kind: "code", lang: "python", title: "Teste A/B de conversão, do jeito certo",
        code: `import numpy as np
from scipy import stats

# contagens reais de cada grupo
conv_a, n_a = 1240, 58_000    # controle
conv_b, n_b = 1355, 57_500    # variante

p_a = conv_a / n_a
p_b = conv_b / n_b

# teste z para duas proporções
p_pool = (conv_a + conv_b) / (n_a + n_b)
se = np.sqrt(p_pool * (1 - p_pool) * (1/n_a + 1/n_b))
z = (p_b - p_a) / se
p_valor = 2 * (1 - stats.norm.cdf(abs(z)))

# intervalo de confiança da DIFERENÇA
diff = p_b - p_a
ic = 1.96 * np.sqrt(p_a*(1-p_a)/n_a + p_b*(1-p_b)/n_b)

print(f"controle {p_a:.3%} · variante {p_b:.3%}")
print(f"diferença {diff:+.3%}  (IC95: {diff-ic:+.3%} a {diff+ic:+.3%})")
print(f"p-valor {p_valor:.4f}")

# leitura honesta:
# p < 0.05 E IC fora do zero E efeito paga o custo → lançar
# IC cruzando o zero → rodar mais tempo, não "aceitar H0"`,
      },
      {
        kind: "list", title: "Quando o A/B NÃO serve",
        items: [
          { strong: "Mudança visível ou contagiosa", text: "Novo layout que gera buzz, mudança de preço que vaza: o grupo controle “contamina”. Aí entra pré/pós com grupo de controle sintético." },
          { strong: "Efeito de rede", text: "Marketplace: tratar metade dos vendedores muda o jogo dos outros. Unidade de randomização precisa ser o ecossistema (cidade, rede)." },
          { strong: "Métrica rara e cara", text: "Churn de contrato anual não espera 6 semanas de teste. Use métrica proxy antecipada (engajamento) validada contra a final." },
        ],
      },
      { kind: "tip", tone: "warn", title: "Peeking: o assassino silencioso de A/B", text: "Olhar o resultado todo dia e parar quando “deu certo” infla falsos positivos para ~25% mesmo com p < 0,05. Defina o tamanho amostral ANTES, rode até o fim — ou use métodos sequenciais feitos para espiada." },
      { kind: "tip", tone: "good", title: "Trilha Pleno concluída", text: "Você agora modela, mede, decide com estatística e entrega em Tableau e Power BI como produto. A trilha SÊNIOR espera: arquitetura de dados em escala, governança, causalidade além do A/B e como liderar a função analítica. Troque o nível no topo quando quiser." },
    ],
  };

  return [m01, m02, m03, m04, m05, m06];
}

/* =====================================================================
   TRILHA SÊNIOR
   ===================================================================== */

function buildSenior(ds: Dataset | null): MentorModule[] {
  const date = ds?.dateCols[0] ?? "data";
  const num = ds?.numericCols[0] ?? "receita";
  const cat = ds?.categoricalCols[0] ?? "regiao";

  const m01: MentorModule = {
    id: "arquitetura", step: "01", title: "Arquitetura moderna de dados", tagline: "lakehouse, dbt e orquestração",
    intro:
      "Na Sênior a pergunta não é mais “como calculo”, é “como isso continua funcionando às 3h da manhã, com 40 fontes, 12 times e uma LGPD no caminho”. Vamos montar o mapa da arquitetura moderna: camadas medallion, transformação como código com dbt, orquestração com retries de verdade e a escolha warehouse vs. lakehouse sem religião.",
    sections: [
      {
        kind: "list", title: "As camadas medallion (e o porquê de cada uma)",
        items: [
          { strong: "Bronze — o dado como chegou", text: "Cópia crua, imutável, particionada por data de ingestão. É a apólice de seguro: qualquer erro downstream se resolve reprocessando do bronze." },
          { strong: "Silver — limpo e tipado", text: "Deduplicado, tipos corretos, chaves validadas, nulos tratados. Aqui mora exatamente o ritual da trilha Júnior — industrializado." },
          { strong: "Gold — pronto para consumo", text: "Modelos dimensionais e agregados orientados a domínio (vendas, clientes, logística). É o que o BI consome — e o único lugar onde o negócio vê nomes que entende." },
          { strong: "ELT, não ETL", text: "Extrair e carregar BRUTO, transformar DENTRO do warehouse com SQL. A computação é barata lá dentro e a linhagem vira código versionado." },
        ],
      },
      {
        kind: "code", lang: "sql", title: "dbt: transformação como código versionado",
        caption: "models/silver/stg_vendas.sql + schema.yml",
        code: `-- stg_vendas.sql — a mesma limpeza da trilha Júnior, agora pipeline
WITH bruto AS (
    SELECT * FROM {{ source('bronze', 'vendas_raw') }}
)
SELECT
    id,
    {{ dbt.safe_cast("data", "date") }}       AS data,
    TRIM(INITCAP(regiao))                     AS regiao,
    COALESCE(receita, 0)                      AS receita,
    CASE WHEN receita > 1e7 THEN TRUE ELSE FALSE END AS flag_outlier
FROM bruto
WHERE NOT _duplicated   -- dedup feito no bronze

-- schema.yml — testes de dados SÃO parte do modelo
-- tests:
--   - unique: id
--   - not_null: [data, receita]
--   - relationships:
--       to: ref('dim_regiao')
--       field: id`,
      },
      {
        kind: "list", title: "Orquestração: o que um scheduler de verdade garante",
        items: [
          { strong: "Retries com backoff", text: "API caiu? Tenta 3× com espera crescente. Sem retry, 2h da manhã vira página de incidente." },
          { strong: "Backfill determinístico", text: "Precisa recalcular 90 dias? Reprocessa o intervalo exato, idempotente, sem duplicar um byte." },
          { strong: "SLAs com alerta", text: "“Gold de vendas pronta até 7h” é um contrato. Alerta quando o contrato quebra — não quando alguém percebe no dashboard vazio." },
          { strong: "Airflow/Dagster/Prefect: escolha e domine UMA", text: "As três fazem DAGs com retry e backfill. O diferencial é o time dominar a ferramenta — não a ferramenta em si." },
        ],
      },
      { kind: "tip", tone: "info", title: "Warehouse vs. lakehouse, sem torcida", text: "Volumes de BI e SQL analítico → warehouse (BigQuery/Snowflake/Redshift) pela simplicidade. Dados de ML, streaming e arquivo aberto (Parquet/Iceberg) → lakehouse. Maturidade é ter os DOIS convivendo com contratos claros entre as camadas — e saber dizer “ainda não precisamos disso”." },
      { kind: "tip", tone: "warn", title: "O custo é um feature", text: "Query que varre 2 TB porque faltou partição por data é dinheiro queimado todo mês. Sênior revisa custo como revisa performance: orçamento por domínio, monitoramento de scan e materializações para o que roda 50×/dia." },
    ],
  };

  const m02: MentorModule = {
    id: "governanca", step: "02", title: "Governança & qualidade de dados", tagline: "confiança como sistema, não como sorte",
    intro:
      "Dado sem governança é como finanças sem contador: funciona até a primeira auditoria. Na Sênior você constrói a confiança como SISTEMA — contratos, linhagem, observabilidade e privacidade por desenho. É o trabalho menos glamouroso e mais raro do mercado: quem faz, vira referência.",
    sections: [
      {
        kind: "list", title: "Os 5 pilares da confiança em dados",
        items: [
          { strong: "Contratos de dados", text: "Cada dataset publica schema, dono, SLA de atualização e política de depreciação. Consumidor sabe o que esperar; produtor sabe o que prometeu." },
          { strong: "Linhagem (lineage)", text: "De qual bronze veio este gold? Que job tocou no meio? Linhagem automática via dbt + orquestrador reduz “cadê esse número?” de horas para minutos." },
          { strong: "Observabilidade de dados", text: "Monitore como monitora serviço: freshness (atrasou?), volume (caiu 40%?), schema (coluna sumiu?), distribuição (média dobrou?). Alerta ANTES do usuário perceber." },
          { strong: "Catálogo e dicionário", text: "Definição única de “cliente ativo” em um só lugar. Duas definições da mesma métrica é o começo de toda briga de diretoria." },
          { strong: "Privacidade por desenho", text: "PII classificada na origem, mascarada por padrão, acesso mínimo por papel. LGPD não é fase do projeto — é atributo do schema." },
        ],
      },
      {
        kind: "code", lang: "python", title: "Check de qualidade no pipeline (Great Expectations em espírito)",
        code: `def validar_silver(df, run_id: str):
    checks = [
        ("id único",        df["id"].is_unique),
        ("data não nula",   df["data"].notna().all()),
        ("volume ±30%",     0.7 * ESPERADO <= len(df) <= 1.3 * ESPERADO),
        ("receita ≥ 0",     (df["receita"] >= 0).all()),
        ("regiões no mapa", df["regiao"].isin(REGIOES_VALIDAS).all()),
    ]
    falhas = [nome for nome, ok in checks if not ok]
    if falhas:
        alertar(f"[{run_id}] silver reprovou: {falhas}")
        # decisão de sênior: NÃO publica gold quebrado.
        # dashboard desatualizado avisa; dashboard errado destrói.
        raise QualidadeError(falhas)

# Qualidade tem 3 destinos: PASSA (publica), QUARENTENA
# (time tria) ou BLOQUEIA (pipeline para com alerta).`,
      },
      { kind: "tip", tone: "warn", title: "O anti-padrão do “dado perfeito depois”", text: "Adiar governança “até o projeto acabar” garante que ela nunca chegue. Comece pelo dataset mais consumido: contrato + 5 testes + dono. Governança cresce por atração (as pessoas querem o selo), não por decreto." },
      { kind: "tip", tone: "good", title: "A métrica da maturidade", text: "Quando a pergunta na reunião mudar de “você confia nesse número?” para “o contrato diz 7h, por que chegou 7h12?” — a governança pegou. O objetivo é confiança presumida com exceção auditável." },
    ],
  };

  const m03: MentorModule = {
    id: "experimentacao", step: "03", title: "Causalidade além do A/B", tagline: "quando não dá para randomizar",
    intro:
      "O A/B é o padrão-ouro — mas metade das decisões importantes não cabe nele: mudança de preço nacional, campanha de TV, novo regulamento. A Sênior conhece o arsenal quase-experimental para estimar CAUSA quando o experimento é impossível, e sabe o preço de cada método em suposições.",
    sections: [
      {
        kind: "list", title: "O arsenal quase-experimental",
        items: [
          { strong: "Diferenças-em-diferenças (DiD)", text: "Compare a variação do grupo tratado com a variação de um grupo de controle no mesmo período. Suposição central: tendências paralelas antes do evento — valide olhando o pré." },
          { strong: "Controle sintético", text: "Monte um “estado/cidade gêmea” combinando pesos de unidades não tratadas que reproduzem o histórico do tratado. Brilhou em avaliação de políticas públicas; serve para lançamentos regionais." },
          { strong: "Variável instrumental", text: "Um fator que afeta o tratamento mas não o resultado diretamente (ex.: distância ao hub logístico) isola a variação “limpa” do tratamento. Poderoso — e fácil de fazer errado." },
          { strong: "Regressão descontínua", text: "Quando há um corte (nota ≥ 7 ganha bolsa), compare quem ficou logo acima vs. logo abaixo: praticamente gêmeos separados por sorte. Causalidade local de altíssima credibilidade." },
          { strong: "CUPED: A/B mais afiado", text: "Usar a métrica pré-experimento como covariada reduz a variância do A/B em 30–50% — o mesmo poder com metade das amostras. Todo programa de experimentação maduro usa." },
        ],
      },
      {
        kind: "code", lang: "python", title: "DiD em regressão (statsmodels)",
        code: `import pandas as pd
import statsmodels.formula.api as smf

# painel: unidade × período, com flag de tratamento
# tratado=1 para o grupo afetado; pos=1 após o evento
modelo = smf.ols(
    "receita ~ tratado + pos + tratado:pos + C(unidade) + C(periodo)",
    data=painel,
).fit(cov_type="cluster", cov_kwds={"groups": painel["unidade"]})

# o coeficiente de tratado:pos É o efeito causal estimado
print(modelo.summary())

# checklist de credibilidade:
# 1) pré-tendências paralelas (teste no período anterior)
# 2) erro-padrão clusterizado por unidade
# 3) placebo: rodar o modelo com data FALSA do evento → efeito ~0`,
      },
      { kind: "tip", tone: "warn", title: "A frase que separa sênior de aventureiro", text: "“Correlação não implica causalidade” todo mundo fala. Sênior completa: “e cada método quasi-experimental troca uma suposição verificável pela randomização impossível”. Declare a suposição, teste o que for testável, e dimensione a incerteza na recomendação." },
      { kind: "tip", tone: "info", title: "Onde isso cai no dia a dia", text: "“O novo frete grátis aumentou receita?” (DiD por região). “A campanha da TV funcionou?” (controle sintético). “Subir preço derruba churn?” (instrumental com variação regional). Saber mapear pergunta → método é o que fazem te chamarem." },
    ],
  };

  const m04: MentorModule = {
    id: "plataformas-eco", step: "04", title: "Ecossistema de plataformas", tagline: "Tableau, Power BI e a camada semântica",
    intro:
      "Sênior não discute “Tableau vs. Power BI” como torcida — discute ARQUITETURA DA DECISÃO: quem explora, quem consome, quem governa. Neste módulo você compara as plataformas maduras, entende a revolução da camada semântica (Looker/LookML) e ganha critérios para a pergunta que sempre chega: build or buy?",
    sections: [
      {
        kind: "platform", title: "As plataformas maduras, sem torcida",
        items: [
          {
            name: "Tableau", glyph: "tableau",
            tagline: "Exploração visual e storytelling para decisão",
            pros: ["Análise visual livre mais fluida do mercado", "LOD expressions resolvem granularidade sem SQL", "Adoção orgânica pela área de negócio", "Tableau Prep para curadoria self-service"],
            cons: ["Transformação pesada deve ficar fora (banco/dbt)", "Governança exige disciplina de projetos e permissões", "Custo por criador escala rápido"],
            when: "Times analíticos fortes, cultura de exploração, apresentações executivas.",
            verdict: "A ferramenta que faz o analista parecer 2× mais rápido — desde que o dado chegue modelado.",
          },
          {
            name: "Power BI", glyph: "powerbi",
            tagline: "BI corporativo integrado ao ecossistema Microsoft",
            pros: ["Custo por usuário imbatível com Microsoft 365", "DAX + modelo tabular muito performático", "RLS, workspaces e deployment pipelines maduros", "Adoção natural onde Excel já reina"],
            cons: ["Curva do DAX/contexto de filtro é real", "Exploração ad-hoc menos fluida que Tableau", "Lock-in do ecossistema Azure/Microsoft"],
            when: "Empresas Microsoft, reporting operacional em escala, milhares de consumidores.",
            verdict: "O default corporativo brasileiro por uma razão: entrega governada a custo que a diretoria assina sem piscar.",
          },
          {
            name: "Looker (LookML)", glyph: "looker",
            tagline: "A métrica definida UMA vez, em código",
            pros: ["Camada semântica versionada (LookML = SQL como código)", "Uma definição de receita para toda a empresa", "Explore: self-service com guardrails de modelo", "Git + CI no coração da ferramenta"],
            cons: ["Exige modeladores dedicados ao LookML", "Visualização menos polida que Tableau", "Custo e curva de implantação mais altos"],
            when: "Empresas de produto com engenharia forte e cultura de métrica única.",
            verdict: "Não é um BI — é uma tese: governança da métrica no código, não no slide.",
          },
          {
            name: "Metabase / Sigma", glyph: "metabase",
            tagline: "Os desafiantes: simplicidade e planilha-com-superpoderes",
            pros: ["Metabase: open source, deploy em 10 min, SQL direto", "Sigma: interface de planilha sobre o warehouse", "Onboarding de não-técnicos em horas, não semanas", "Custo inicial baixo"],
            cons: ["Governança e enterprise features atrás dos líderes", "Ecossistema de conectores menor", "Menos profundidade em visual complexo"],
            when: "Startups e times enxutos que precisam de resposta ontem.",
            verdict: "Comece aqui se o problema é velocidade; migre com plano quando a governança apertar.",
          },
        ],
      },
      {
        kind: "list", title: "A camada semântica: a discussão que importa em 2026",
        items: [
          { strong: "O problema", text: "Cada BI recalcula “receita” do seu jeito → números divergem → confiança evapora. A solução madura: UMA camada de métricas entre o warehouse e os consumidores." },
          { strong: "As formas", text: "LookML nativo, dbt Semantic Layer/MetricFlow, ou cubos no próprio warehouse. A tendência: a métrica vive NO dbt e qualquer BI consome." },
          { strong: "Critérios de build vs. buy", text: "Compre quando: tempo-para-valor importa mais que diferenciação, e há massa crítica de usuários. Construa quando: o diferencial do produto É o dado (analytics embedded, margem sobre insight)." },
        ],
      },
      { kind: "tip", tone: "info", title: "O conselho que dou a todo CTO", text: "A escolha de BI é 20% ferramenta e 80% modelo de dados + governança. Trocar de Tableau para Power BI com o mesmo modelo quebrado só muda o logo do erro. Invista no gold layer primeiro; a ferramenta briga depois." },
    ],
  };

  const m05: MentorModule = {
    id: "gestao", step: "05", title: "Liderança da função analítica", tagline: "métrica certa, time certo, decisão certa",
    intro:
      "Na Sênior, parte do seu trabalho acontece fora do editor: priorizar o que o time analisa, traduzir ambição da empresa em árvore de métricas, formar plenos e juniores, e dizer NÃO com dados. Este módulo é sobre transformar capacidade analítica em alavanca de negócio — que é, no fim, a definição do cargo.",
    sections: [
      {
        kind: "list", title: "OSM: o framework que alinha análise ao negócio",
        items: [
          { strong: "O — Objetivo", text: "“Ser o app financeiro principal do cliente.” Frase de negócio, sem métrica ainda." },
          { strong: "S — Estratégias", text: "Os caminhos: aumentar engajamento semanal, reduzir atrito no onboarding, crescer cross-sell." },
          { strong: "M — Medidas", text: "Para cada estratégia: sinal + métrica + health metric. Ex.: engajamento → sessões semanais por usuário, com retenção D30 como health (para não crescer engajamento à custa de churn)." },
          { strong: "HEART para produtos", text: "Happiness, Engagement, Adoption, Retention, Task success — as cinco lentes do Google para nenhum ângulo do produto ficar sem métrica." },
        ],
      },
      {
        kind: "list", title: "O trabalho invisível que define o sênior",
        items: [
          { strong: "Fila de análises é portfólio", text: "Cada pedido entra com: decisão que habilita, esforço, prazo. Dizer não a 40% dos pedidos — com o motivo escrito — é o que protege os 60% que importam." },
          { strong: "Insight ≠ relatório", text: "Relatório diz o que aconteceu; insight diz o que fazer a respeito e quanto vale. Formate toda entrega como: contexto → achado → ação sugerida → próximo passo." },
          { strong: "Formar é multiplicar", text: "Um pleno bem mentorado vale mais que três dashboards. Code review de SQL, rubricas de qualidade de análise e trilhas como esta são alavancas de carreira, não caridade." },
          { strong: "Tradução executiva", text: "Diretoria não quer p-valor; quer “confiança alta/média/baixa de que X causa Y, custando Z”. Traduza sem mentir — essa é a arte." },
        ],
      },
      { kind: "tip", tone: "good", title: "A pergunta de 1 milhão", text: "Se sua equipe desaparecesse por um mês, que decisão da empresa ficaria CEGA? A resposta é o núcleo do seu valor — e deveria consumir a maior parte da sua agenda. Quase nunca consome. Corrija." },
      { kind: "tip", tone: "warn", title: "O anti-padrão do “time de tickets”", text: "Se 90% do tempo do time responde solicitações pontuais, você tem um balcão de atendimento com acesso a SQL — não uma função analítica. Reserve 30% da capacidade para apostas próprias; é dali que saem as descobertas que mudam patamar." },
    ],
  };

  const m06: MentorModule = {
    id: "preditivo", step: "06", title: "Previsão & ML em produção", tagline: "do experimento ao sistema que decide",
    intro:
      "Módulo final da trilha — e o que fecha o ciclo do dado: prever o futuro com honestidade estatística. Aqui a régua muda: não basta o modelo acertar no notebook; ele precisa continuar acertando em produção, com monitoramento, retreinamento e, acima de tudo, sabendo quando um baseline burro ganha do modelo elegante.",
    sections: [
      {
        kind: "list", title: "Previsão de séries temporais, na ordem certa",
        items: [
          { strong: "1. Decomponha antes de modelar", text: "Tendência + sazonalidade + resíduo. A série de ${num} tem padrão semanal? Mensal? A decomposição responde e já rende um gráfico que explica metade da história." },
          { strong: "2. Comece pelo baseline", text: "Média móvel e “último período” são os adversários a bater. Modelo que não vence o baseline com folga NÃO entra em produção — por mais bonito que seja." },
          { strong: "3. Valide no tempo, nunca em shuffle", text: "Time-series split: treina no passado, testa no futuro imediato. K-fold aleatório em série temporal é vazamento de futuro — e o erro mais comum de quem vem de classificação." },
          { strong: "4. Erro em unidade de negócio", text: "MAPE engana com valores perto de zero; use MAE/RMSE na unidade real (R$, unidades, chamados) e traduza: “erramos em média R$ 12 mil por semana”." },
        ],
      },
      {
        kind: "code", lang: "python", title: "Pipeline honesto de previsão (sklearn)",
        code: `import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

# features temporais — o feijão que bate 80% dos modelos exóticos
df["mes"]  = df["${date}"].dt.month
df["dow"]  = df["${date}"].dt.dayofweek
df["lag7"]  = df["${num}"].shift(7)
df["lag28"] = df["${num}"].shift(28)
df["mm7"]   = df["${num}"].rolling(7).mean()

# validação TEMPORAL: corte fixo, sem shuffle
treino = df[df["${date}"] < "2025-09-01"]
teste  = df[df["${date}"] >= "2025-09-01"]

X = ["mes", "dow", "lag7", "lag28", "mm7"]
modelo = GradientBoostingRegressor(max_depth=3).fit(treino[X], treino["${num}"])

pred  = modelo.predict(teste[X])
naive = teste["${num}"].shift(7)   # baseline: repetir semana anterior

print(f"MAE modelo: {mean_absolute_error(teste['${num}'], pred):,.0f}")
print(f"MAE naive : {mean_absolute_error(teste['${num}'], naive):,.0f}")
# Se o naive vencer → volte duas casas e reabra a decomposição.`,
      },
      {
        kind: "list", title: "ML em produção: o que o notebook não te conta",
        items: [
          { strong: "Leakage é a praga nº 1", text: "Feature calculada com informação do futuro (média “até hoje” que inclui hoje, label vazando na tabela) faz o modelo parecer gênio no offline e falhar no mundo real. Audite cada feature contra a linha do tempo." },
          { strong: "Drift: o mundo muda, o modelo não", text: "Monitore a distribuição das features e do erro ao longo do tempo. Alerta de drift aciona retreinamento — não pânico." },
          { strong: "Métrica offline ≠ métrica de negócio", text: "AUC subiu 2 pontos e a receita não mexeu? Talvez a faixa que importa seja o topo do ranking. Alinhe a métrica do modelo com a métrica que alguém perde o sono." },
          { strong: "Comece simples e explique", text: "Regressão logística/GBM com 12 features explicáveis vencem deep learning em 80% dos casos de negócio — e sobrevivem à pergunta “por que o modelo negou esse cliente?”." },
        ],
      },
      { kind: "tip", tone: "good", title: "Trilha Sênior concluída", text: "Você percorreu o caminho inteiro: da célula suja ao sistema que prevê, governa e decide. O que separa quem termina a trilha de quem vira referência é repetição com responsabilidade — escolha um dataset real seu, aplique os três níveis em sequência e documente cada decisão. É assim que se constrói um portfólio que fala sozinho." },
    ],
  };

  return [m01, m02, m03, m04, m05, m06];
}

/* ---------------- dispatcher ---------------- */

export function buildPlaybook(level: Level, ds: Dataset | null): MentorModule[] {
  if (level === "pleno") return buildPleno(ds);
  if (level === "senior") return buildSenior(ds);
  return buildJunior(ds);
}

/* ---------------- saudação ---------------- */

export function mentorGreeting(level: Level, ds: Dataset | null): string {
  const meta = LEVELS.find((l) => l.id === level)!;
  const dsPart = ds
    ? `Já estudei o seu dataset “${ds.name}”: ${ds.finalRows.toLocaleString("pt-BR")} linhas limpas e ${ds.columns.length} colunas — vou usá-las nos exemplos sempre que fizer sentido.`
    : "Estou sem dataset carregado, então uso exemplos didáticos — carregue um arquivo no Console e eu personalizo tudo com as suas colunas.";
  if (level === "junior")
    return `Olá! Eu sou o mentor do Anthony.ia e esta é a trilha JÚNIOR — ${meta.desc} ${dsPart} Por onde quer começar?`;
  if (level === "pleno")
    return `Bem-vindo(a) à trilha PLENO — aqui a análise vira produto: ${meta.desc} ${dsPart} Por onde quer começar?`;
  return `Trilha SÊNIOR aberta — o jogo agora é sistema, escala e decisão: ${meta.desc} ${dsPart} Por onde quer começar?`;
}

/* ---------------- chat ---------------- */

export const CHAT_SUGGESTIONS = [
  "Qual trilha devo fazer?",
  "Tableau ou Power BI?",
  "Como trato valores nulos?",
  "Me explica o star schema",
  "O que é um teste A/B?",
  "Como funciona o DAX?",
];

interface Rule {
  re: RegExp;
  moduleId: string;
  levels: Level[];
  reply: string;
}

const RULES: Rule[] = [
  {
    re: /qual trilha|qual nivel|qual nível|junior|júnior|pleno|senior|sênior|começo por onde|por onde come/i,
    moduleId: "", levels: ["junior", "pleno", "senior"],
    reply:
      "As três trilhas formam uma escada: JÚNIOR é o ciclo completo do dado bruto à primeira análise (perguntas → Python → SQL → gráficos → matemática). PLENO transforma análise em produto: modelagem dimensional, KPIs/cohort, Tableau e Power BI profissionais, estatística para decidir. SÊNIOR é sistema e liderança: arquitetura com dbt/lakehouse, governança, causalidade, ecossistema de plataformas e ML em produção. Regra prática: só pule um nível se você consegue explicar em voz alta o módulo anterior do nível de baixo.",
  },
  {
    re: /tableau/i,
    moduleId: "plataforma-tableau", levels: ["pleno"],
    reply:
      "Tableau é a ferramenta que fala a língua do visual: exploração fluida, LOD expressions para granularidade e parâmetros/ações que transformam relatório em aplicativo. O segredo é o modelo mental: tudo é agregação na granularização da visualização, extração (.hyper) como default e cálculo no modelo — não espalhado pelas pastas. O Módulo 03 da trilha Pleno mostra a sintaxe de LOD e o kit de entrega profissional.",
  },
  {
    re: /power ?bi|powerbi|dax|power query/i,
    moduleId: "plataforma-powerbi", levels: ["pleno"],
    reply:
      "Power BI é um pipeline de três atos: Power Query limpa (tudo que dá para fazer ali NÃO se faz em DAX), o modelo relaciona (star schema, filtro fluindo 1→*) e o DAX calcula (CALCULATE + inteligência de tempo com d_calendario). É o default corporativo brasileiro por custo e integração Microsoft. Módulo 04 da trilha Pleno tem as medidas DAX que caem em todo projeto real.",
  },
  {
    re: /tableau.*power|power.*tableau|qual bi|qual plataforma de visual|looker|metabase|sigma/i,
    moduleId: "plataformas-eco", levels: ["pleno", "senior"],
    reply:
      "Sem torcida: Tableau brilha em exploração visual e storytelling; Power BI domina o corporativo por custo, DAX e governança Microsoft; Looker/LookML é a tese da métrica única como código; Metabase/Sigma são os velocistas para times enxutos. A discussão madura em 2026 é a CAMADA SEMÂNTICA: a métrica definida uma vez (no dbt ou LookML) e consumida por qualquer BI. Na trilha Pleno, o Módulo 03/04 aprofunda Tableau e Power BI; na Sênior, o Módulo 04 compara o ecossistema inteiro.",
  },
  {
    re: /modelagem|star schema|fato|dimens|granularidade|schema/i,
    moduleId: "modelagem", levels: ["pleno"],
    reply:
      "Star schema é o idioma dos dashboards: uma tabela FATO no centro (o que aconteceu, na menor granularidade útil) cercada de DIMENSÕES (quem, onde, quando). Fato guarda CHAVE e medida; dimensão guarda DESCRIÇÃO. Duas regras que salvam projetos: granularidade é a decisão nº 1 (e a mais cara de desfazer) e dimensão tempo é obrigatória. Módulo 01 da Pleno tem o DDL completo.",
  },
  {
    re: /kpi|cohort|métrica|metrica|north star|ltv|cac|reten/i,
    moduleId: "metricas", levels: ["pleno"],
    reply:
      "KPI bom tem definição em uma frase, dono com nome, fonte única e meta visível. O repertório da Pleno: métrica-norte (o único número que resume valor), inputs vs. outputs (atue na causa, não no efeito), taxa > absoluto, cohort para retenção honesta e LTV/CAC para saber se o crescimento paga. O Módulo 02 tem a query de cohort completa.",
  },
  {
    re: /teste a\/?b|ab test|experimento|p-valor|signific|infer|confianca|confiança/i,
    moduleId: "estatistica", levels: ["pleno"],
    reply:
      "Teste A/B responde “isso é real ou ruído?”. O kit: hipótese nula, p-valor (raridade, não probabilidade de acerto), intervalo de confiança (se cruza o zero, pode ser nada) e poder estatístico ANTES de rodar. Dois assassinos: peeking (espiar todo dia infla falsos positivos a ~25%) e confundir significância estatística com prática. Módulo 06 da Pleno tem o teste z completo em Python.",
  },
  {
    re: /nulo|missing|isna|nan|vazio/i,
    moduleId: "limpeza", levels: ["junior"],
    reply:
      "Nulo nunca se apaga no escuro: meça (isna().mean()), entenda o padrão, e só então trate — numérica pela MEDIANA, categórica pela moda ou “não informado”. Acima de ~30% de vazios, imputar vira chute: fale com quem gerou o dado. Módulo 03 da trilha Júnior, passo 2.",
  },
  {
    re: /outlier|anomalia|extremo/i,
    moduleId: "limpeza", levels: ["junior"],
    reply:
      "Sem achismo: cercas de Tukey [Q1 − 1,5·IQR ; Q3 + 1,5·IQR]. E a decisão que separa níveis: outlier REAL (pedido B2B legítimo) fica com flag; ERRO DE DIGITAÇÃO sai. Módulo 03, passo 4.",
  },
  {
    re: /sql|query|select|join|banco/i,
    moduleId: "sql", levels: ["junior"],
    reply:
      "Quatro padrões resolvem quase tudo: agregação com GROUP BY, HAVING para filtrar grupos, LEFT JOIN com conferência de contagem e CTE + janelas (LAG, SUM OVER). Tudo no Módulo 04 da trilha Júnior — e quando quiser ir além, a Pleno tem SQL de produção com EXPLAIN e índices.",
  },
  {
    re: /grafic|gráf|chart|plot|visualiza/i,
    moduleId: "graficos", levels: ["junior"],
    reply:
      "Cada gráfico responde a UMA pergunta: tempo → linha; comparação → barras horizontais; forma → histograma; A/B e outliers → boxplot; relação → dispersão com regressão; partes do todo → rosca com ≤5 fatias. Módulo 05 da Júnior traz o porquê de cada um — e a Pleno mostra como eles vivem dentro de Tableau e Power BI.",
  },
  {
    re: /dbt|airflow|orquestr|lakehouse|medalh|bronze|silver|gold|arquitetura de dados/i,
    moduleId: "arquitetura", levels: ["senior"],
    reply:
      "A arquitetura moderna em 4 ideias: camadas medallion (bronze cru → silver limpo → gold dimensional), ELT (transformar dentro do warehouse), dbt (transformação como código versionado com testes) e orquestração com retry, backfill e SLA. O Módulo 01 da trilha Sênior monta o mapa completo, com o modelo dbt de exemplo.",
  },
  {
    re: /govern|linhagem|lgpd|qualidade de dado|sla|catalog|contrato de dado|privacidade/i,
    moduleId: "governanca", levels: ["senior"],
    reply:
      "Confiança como sistema, não como sorte: contratos de dados (schema + dono + SLA), linhagem automática, observabilidade (freshness, volume, schema, distribuição), catálogo com definição única e PII mascarada por desenho. E a regra de ouro: gold quebrado NÃO publica — dashboard desatualizado avisa, dashboard errado destrói. Módulo 02 da Sênior.",
  },
  {
    re: /causal|did|diferen.cas.em.diferen|sint.tico|instrumental|descont.nua|cuped/i,
    moduleId: "experimentacao", levels: ["senior"],
    reply:
      "Quando randomizar é impossível, o arsenal quasi-experimental entra: DiD (tendências paralelas), controle sintético (gêmeo montado por pesos), variável instrumental, regressão descontínua — e CUPED para deixar o próprio A/B 30–50% mais afiado. Cada método troca uma suposição verificável pela randomização; declare-a e teste o que der. Módulo 03 da Sênior.",
  },
  {
    re: /previs|forecast|machine learning|predi|ml em produ|drift|s.rie temporal/i,
    moduleId: "preditivo", levels: ["senior"],
    reply:
      "Previsão honesta segue a ordem: decomponha (tendência + sazonalidade), bata o baseline (média móvel / naive) antes de qualquer modelo, valide no TEMPO (nunca em shuffle) e traduza o erro para unidade de negócio. Em produção, os vilões são leakage, drift e métrica offline descolada do negócio. Módulo 06 da Sênior, com pipeline completo.",
  },
  {
    re: /python|pandas|extrair|csv|ler|arquivo|api/i,
    moduleId: "extracao", levels: ["junior"],
    reply:
      "Três portas: arquivo (read_csv com sep, decimal e parse_dates certos), banco (read_sql com filtro no SQL) e API (requests com timeout + json_normalize). E o ritual dos 5 minutos: shape, dtypes, head, info, describe. Módulo 02 da trilha Júnior.",
  },
  {
    re: /limp|duplicad|sujo/i,
    moduleId: "limpeza", levels: ["junior"],
    reply:
      "O ritual na ordem dos seniores: duplicatas → nulos → tipos → outliers (Tukey) → texto. Pular a ordem gera retrabalho. Módulo 03 da Júnior tem os 5 passos com código — e a Pleno industrializa esse mesmo ritual dentro de dbt.",
  },
];

export function askMentor(question: string, level: Level): { reply: string; moduleId?: string } {
  for (const r of RULES) {
    if (!r.levels.includes(level)) continue;
    if (r.re.test(question)) {
      return r.moduleId ? { reply: r.reply, moduleId: r.moduleId } : { reply: r.reply };
    }
  }
  return {
    reply:
      "Boa pergunta — e a trilha certa tem um módulo inteiro para ela. Se for fundamento (Python, SQL, gráficos, matemática), estou na Júnior. Se for produto de dados (modelagem, KPIs, Tableau, Power BI, A/B), troque para a Pleno. Se for sistema e escala (dbt, governança, causalidade, previsão), a Sênior te espera. Me pergunta de novo dentro do nível — ou pergunta “qual trilha devo fazer?” que eu te oriento.",
  };
}
