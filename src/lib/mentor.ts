/* Motor do Mentor PRISMA — gera a trilha de mentoria (perguntas, Python,
   SQL, gráficos e matemática) PERSONALIZADA com as colunas e estatísticas
   reais do dataset carregado. Sem dataset, usa um exemplo didático. */

import type { Dataset, ColumnProfile } from "./analyze";

/* ---------------- tipos ---------------- */

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

export type MentorSection =
  | { kind: "code"; lang: "python" | "sql"; title: string; caption?: string; code: string }
  | { kind: "list"; title: string; items: { strong: string; text: string }[] }
  | { kind: "tip"; tone: "warn" | "good" | "info"; title: string; text: string }
  | { kind: "charts"; title: string; picks: ChartPick[] }
  | { kind: "picks"; title: string; items: { col: string; chart: string; why: string }[] }
  | { kind: "formulas"; title: string; items: FormulaItem[] };

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

/* ---------------- construção da trilha ---------------- */

export function buildPlaybook(ds: Dataset | null): MentorModule[] {
  const date = ds?.dateCols[0] ?? "data";
  const cat = ds?.categoricalCols[0] ?? "regiao";
  const num = ds?.numericCols[0] ?? "receita";
  const table = ds
    ? (ds.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "dataset")
    : "vendas";
  const file = ds ? `${table}.csv` : "vendas.csv";

  const np = numProfile(ds, num);
  const catProf = ds?.profiles.find((p) => p.name === cat) ?? null;
  const pair = bestPair(ds);

  /* dados para exemplos personalizados */
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

  const hygieneTip =
    ds && ds.actions.length
      ? ([
          {
            kind: "tip" as const,
            tone: "info" as const,
            title: "No SEU dataset, o motor já fez isso",
            text: `Na trilha do Console eu removi ${ds.actions.find((a) => a.kind === "remove")?.count ?? 0} duplicadas exatas, imputei ${ds.actions
              .filter((a) => a.kind === "impute")
              .reduce((s, a) => s + a.count, 0)} células vazias pela mediana/moda e sinalizei ${
              ds.actions.find((a) => a.kind === "flag")?.count ?? 0
            } outliers pelas cercas de Tukey. Os gráficos que você viu lá já usam a versão limpa — compare com o código deste módulo e veja cada passo.`,
          },
        ] as MentorSection[])
      : [];

  /* ---------- M01 · perguntas ---------- */
  const m01: MentorModule = {
    id: "perguntas",
    step: "01",
    title: "As perguntas certas",
    tagline: "antes do código, o raciocínio",
    intro:
      "Bem-vindo(a) à zona de trabalho. Regra número um dos seniores: análise que não responde pergunta de negócio é exercício de digitação. A gente monta o raciocínio DE TRÁS pra frente — da decisão para o dado. Faça estas perguntas antes de abrir o Jupyter e metade dos seus gráficos futuros deixa de existir (o que é um ótimo sinal).",
    sections: [
      {
        kind: "list",
        title: "As 6 perguntas que separam júnior de sênior",
        items: [
          {
            strong: "Qual decisão vai ser tomada com esse número?",
            text: "Se a resposta for “nenhuma”, a análise não deveria existir. Gráfico bonito que não muda nenhuma decisão é decoração cara — e consome o tempo que faltou para a análise que importa.",
          },
          {
            strong: "Comparado com o quê?",
            text: "Todo número isolado é inútil. Receita de R$ 50 mil é ótima? Depende: mês anterior, meta, mesmo período do ano passado, concorrente. Defina a linha de base ANTES de calcular, senão você escolhe a comparação que favorece a história.",
          },
          {
            strong: "O que a métrica mede — e o que ela esconde?",
            text: "“Ticket médio subiu” pode ser cliente comprando mais… ou os clientes baratos indo embora. Toda média esconde uma distribuição. Pergunte sempre o que está atrás do número agregado.",
          },
          {
            strong: "Qual o período e a granularidade?",
            text: "Dia, semana ou mês muda a história inteira. E cuidado com armadilhas de calendário: comparar 28 dias de fevereiro com 31 de janeiro sem normalizar é erro que passa em muita reunião.",
          },
          {
            strong: "Quem vai consumir essa análise?",
            text: "Diretoria quer manchete e tendência em um gráfico. O time operacional quer a fila de problemas de hoje em uma tabela. A mesma análise gera entregas diferentes — descubra a audiência antes de formatar.",
          },
          {
            strong: "Que dado eu NÃO tenho?",
            text: "A pergunta mais madura do ofício. Às vezes o churn não se explica com vendas — falta o dado de suporte. Mapear a lacuna com honestidade já é uma entrega sênior.",
          },
        ],
      },
      {
        kind: "tip",
        tone: "good",
        title: "Framework D·P·C — Decisão → Pergunta → Cálculo",
        text: "Nessa ordem, sempre. Exemplo: “decidir se expando a linha X” → “X cresce mais que o total da carteira?” → “variação % mensal de X vs. total”. Quando você escreve as três linhas, o gráfico e a query praticamente se desenham sozinhos.",
      },
      {
        kind: "tip",
        tone: "warn",
        title: "Hipótese antes da query",
        text: `Transforme cada pergunta em hipótese testável: “${cat} vende menos por causa do frete” vira um GROUP BY por ${cat} com frete médio por linha. Sem hipótese, você pesca no escuro — e chama coincidência de descoberta. Esse é o erro mais comum (e mais perigoso) do júnior.`,
      },
    ],
  };

  /* ---------- M02 · extração ---------- */
  const m02: MentorModule = {
    id: "extracao",
    step: "02",
    title: "Extração com Python",
    tagline: "trazendo o dado para a bancada",
    intro:
      "Dados chegam de três lugares: arquivo, banco de dados ou API. Em 80% dos seus dias você usa os dois primeiros — então domine-os bem antes de qualquer glamour de machine learning. O segredo da extração não é o comando: é conferir o que chegou antes de calcular qualquer coisa.",
    sections: [
      {
        kind: "code",
        lang: "python",
        title: "Carregando e farejando o arquivo",
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
        kind: "code",
        lang: "python",
        title: "Extraindo direto do banco (onde os dados moram)",
        code: `from sqlalchemy import create_engine

engine = create_engine("postgresql://usuario:senha@host:5432/analytics")

# Boa prática de gente grande: filtre no SQL, não no Python.
# Trazer 2 anos de dados para usar 3 meses é lento, caro e deselegante.
query = """
    SELECT ${date}, ${cat}, ${num}
    FROM ${table}
    WHERE ${date} >= '2024-01-01'
"""
df = pd.read_sql(query, engine)`,
      },
      {
        kind: "code",
        lang: "python",
        title: "Quando o dado vem de API",
        code: `import requests

r = requests.get(
    "https://api.empresa.com/v1/vendas",
    headers={"Authorization": "Bearer SEU_TOKEN"},
    timeout=10,               # SEMPRE timeout: API travada não pode travar você
)
r.raise_for_status()          # erro 4xx/5xx vira exceção, não silêncio

df = pd.json_normalize(r.json()["results"])  # achata JSON aninhado em tabela`,
      },
      {
        kind: "list",
        title: "Check-list dos primeiros 5 minutos",
        items: [
          { strong: "dtypes batem com a realidade?", text: "Coluna numérica lida como object é o bug nº 1 do júnior — e silencia tudo que vem depois." },
          { strong: "Tem nulo? Onde e quanto?", text: "df.isna().sum() antes de qualquer cálculo. Nulo em 2% é rotina; em 40% é conversa com quem gerou o dado." },
          { strong: "A chave é única?", text: "Se cada linha deveria ser um pedido, o id precisa ser único. Duplicata de join infla receita em silêncio." },
          { strong: "Os ranges fazem sentido?", text: "Idade de 300 anos, receita negativa, data no futuro: range absurdo é dado corrompido pedindo socorro." },
        ],
      },
      {
        kind: "tip",
        tone: "info",
        title: "A regra do cheiro",
        text: "Se um número te estranhar, PARE e investigue antes de seguir. Estranhamento é o detector de dado sujo mais barato que existe — e o mais subestimado. Os grandes bugs de análise começam com um “ué…” ignorado.",
      },
    ],
  };

  /* ---------- M03 · limpeza ---------- */
  const m03: MentorModule = {
    id: "limpeza",
    step: "03",
    title: "Limpeza com Python",
    tagline: "onde a análise é ganha ou perdida",
    intro:
      "Dado sujo não avisa que está sujo — ele só mente com muita confiança. Este é o ritual de limpeza na ordem exata em que os seniores executam: duplicatas → nulos → tipos → outliers → texto. Pular a ordem gera retrabalho: não adianta caçar outlier em coluna que ainda é texto.",
    sections: [
      {
        kind: "code",
        lang: "python",
        title: "Passo 1 — Duplicatas: o bug que infla tudo",
        code: `print(df.duplicated().sum())               # linhas 100% repetidas
print(df.duplicated(subset=["id"]).sum())  # repetidas pela chave de negócio

df = df.drop_duplicates()                  # remove as exatas

# Repetição por chave: decida quem fica (aqui, a mais recente)
df = df.sort_values("${date}").drop_duplicates(subset=["id"], keep="last")`,
      },
      {
        kind: "code",
        lang: "python",
        title: "Passo 2 — Nulos: medir, decidir, tratar",
        code: `df.isna().sum()    # onde estão os buracos
df.isna().mean()   # em % — acima de ~30%, imputar vira chute

# Numérica: MEDIANA (não média! a média é sequestrada por outliers)
df["${num}"] = df["${num}"].fillna(df["${num}"].median())

# Categórica: moda — ou uma categoria honesta, "não informado"
df["${cat}"] = df["${cat}"].fillna("não informado")

# Nulo que É informação: venda sem desconto é desconto 0, não vazio
df["desconto"] = df["desconto"].fillna(0)`,
      },
      {
        kind: "code",
        lang: "python",
        title: "Passo 3 — Tipos: onde “1.234,56” vira número de verdade",
        code: `# Erro clássico: coluna monetária lida como texto ("R$ 1.234,56")
df["${num}"] = (
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
        kind: "code",
        lang: "python",
        title: "Passo 4 — Outliers com Tukey (sem achismo)",
        code: `q1, q3 = df["${num}"].quantile([0.25, 0.75])
iqr = q3 - q1
cerca_inf = q1 - 1.5 * iqr
cerca_sup = q3 + 1.5 * iqr
${fenceComment}

fora = df[(df["${num}"] < cerca_inf) | (df["${num}"] > cerca_sup)]
print(f"{len(fora)} linhas fora das cercas ({len(fora)/len(df):.1%})")

# Decisão de sênior: outlier REAL (um pedido B2B legítimo) FICA e ganha
# coluna de flag; ERRO DE DIGITAÇÃO (receita de R$ 99.999.999) sai.
df["e_outlier"] = ~df["${num}"].between(cerca_inf, cerca_sup)`,
      },
      {
        kind: "code",
        lang: "python",
        title: "Passo 5 — Texto padronizado",
        code: `df["${cat}"] = df["${cat}"].str.strip().str.title()
# " sudeste ", "SUDESTE" e "Sudeste" viram a MESMA categoria
# sem isso, seu GROUP BY cria três fatias do mesmo lugar`,
      },
      {
        kind: "list",
        title: "Os 4 pecados da limpeza",
        items: [
          { strong: "Apagar nulo sem perguntar por quê", text: "Nulo raramente é aleatório: cliente sem telefone pode ser exatamente o perfil que você estuda. Antes do fillna, pergunte à origem do dado." },
          { strong: "Imputar numérica com a média", text: "Um outlier de R$ 1 mi puxa a média junto; a mediana não sente nada. Numérica com cauda: sempre mediana." },
          { strong: "Deletar outlier no automático", text: "Outlier é sinal. O sensor que “estraga” o gráfico costuma ser a descoberta — investigue antes de apagar a história." },
          { strong: "Limpar sem deixar rastro", text: "Guarde o df_bruto e anote cada transformação. Quando o número “não bater” na reunião, você refaz o caminho em minutos — ou não refaz nunca." },
        ],
      },
      ...hygieneTip,
    ],
  };

  /* ---------- M04 · SQL ---------- */
  const m04: MentorModule = {
    id: "sql",
    step: "04",
    title: "SQL na prática",
    tagline: "a língua materna dos dados",
    intro:
      "O Python visita o dado; o SQL mora com ele. Estes quatro padrões resolvem ~90% das análises que vão te pedir — agregação, filtro de grupos, join e funções de janela. Domine-os nesta ordem e você responde à maioria das perguntas de negócio sem sair do banco.",
    sections: [
      {
        kind: "code",
        lang: "sql",
        title: "Padrão 1 — Agregação: o feijão-com-arroz bem feito",
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
-- Dica: MIN/MAX "de brinde" denunciam outlier na hora.`,
      },
      {
        kind: "code",
        lang: "sql",
        title: "Padrão 2 — HAVING: o filtro dos grupos",
        code: `-- Só grupos com amostra suficiente para confiar
SELECT
    ${cat}              AS grupo,
    ROUND(AVG(${num}), 2) AS media
FROM ${table}
GROUP BY ${cat}
HAVING COUNT(*) >= 30   -- WHERE filtra linhas ANTES; HAVING filtra grupos DEPOIS
ORDER BY media DESC;
-- Média de 3 linhas não é insight, é anedota.`,
      },
      {
        kind: "code",
        lang: "sql",
        title: "Padrão 3 — LEFT JOIN: cruzando histórias",
        code: `SELECT
    c.regiao,
    COUNT(DISTINCT p.id)  AS pedidos,
    SUM(p.receita)        AS receita
FROM pedidos p
LEFT JOIN clientes c
       ON c.id = p.cliente_id   -- LEFT mantém pedido sem cliente (vira NULL)
GROUP BY c.regiao
ORDER BY receita DESC;

-- Conferência obrigatória: o COUNT(*) DEPOIS do join precisa bater
-- com o de ANTES. Cresceu? O join multiplicou linhas — há chave
-- duplicada do outro lado. Esse é o bug de SQL mais caro que existe.`,
      },
      {
        kind: "code",
        lang: "sql",
        title: "Padrão 4 — CTE + janela: o nível que impressiona na entrevista",
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
ORDER BY mes;
-- OVER() sem PARTITION = janela sobre tudo.
-- LAG olha pra trás; LEAD olha pra frente. Sem eles,
-- você escreve auto-join feio — com eles, parece sênior.`,
      },
      {
        kind: "list",
        title: "Regras de sobrevivência em SQL",
        items: [
          { strong: "SELECT * em produção é crime", text: "Liste as colunas: menos rede, menos memória, menos surpresa quando alguém criar coluna nova com o nome que você usava." },
          { strong: "Filtre cedo", text: "WHERE antes de JOIN, JOIN antes de GROUP BY. O otimizador agradece e seu job roda em minutos — não em horas." },
          { strong: "NULL não é zero, não é vazio", text: "NULL é “não sei”. AVG ignora NULL, COUNT(*) conta a linha, COUNT(col) não. Essa tríade já derrubou muito dashboard." },
          { strong: "100.0, não 100", text: "Em muitos bancos, inteiro ÷ inteiro trunca: 1/2 = 0. Multiplique por 100.0 para forçar decimal e salve uma porcentagem." },
        ],
      },
    ],
  };

  /* ---------- M05 · gráficos ---------- */
  const picks: ChartPick[] = [
    {
      name: "Linha",
      glyph: "line",
      when: "Você tem uma data e quer contar como algo mudou.",
      why: "O olho rastreia inclinação melhor que qualquer outra forma: subida, queda e sazonalidade aparecem em meio segundo. Mil barras de dias viram ruído; uma linha conta a história inteira.",
      mistake: "Usar linha quando o eixo x não é tempo. Linha pressupõe continuidade entre os pontos — em categorias, vira mentira visual.",
    },
    {
      name: "Barras horizontais",
      glyph: "bars",
      when: "Comparar tamanhos entre grupos: regiões, produtos, canais.",
      why: "Comparar comprimento é a percepção humana mais precisa que existe (estudo clássico de Cleveland & McGill) — mais que ângulo, área ou cor. Na horizontal, rótulo longo cabe sem girar 45°.",
      mistake: "Ordem alfabética. Sempre ordene por valor: a ordem já é metade da análise.",
    },
    {
      name: "Histograma",
      glyph: "hist",
      when: "Entender como uma métrica se espalha: onde concentra, se tem cauda, se é bimodal.",
      why: "A média esconde a forma. Duas colunas com média R$ 300 podem ser “todo mundo em R$ 300” ou “metade em R$ 50, metade em R$ 550”. O histograma mostra qual é o caso — e onde os clientes realmente estão.",
      mistake: "Bins no chute. Comece por √n (raiz do nº de linhas) e ajuste até a forma “falar”.",
    },
    {
      name: "Boxplot",
      glyph: "box",
      when: "Comparar distribuições entre grupos e apontar extremos com critério.",
      why: "Resumo de 5 números numa caixa: mediana, quartis, bigodes de Tukey (1,5×IQR) e pontos fora da cerca. Mostra em 10 pixels o que o histograma mostra em 300 — perfeito para testes A/B.",
      mistake: "Apresentar para quem nunca viu um. Boxplot pede 20 segundos de legenda; sem isso vira “desenho estranho”.",
    },
    {
      name: "Dispersão + regressão",
      glyph: "scatter",
      when: "Testar se duas métricas dançam juntas — e quão juntas.",
      why: "Mostra direção, força e os pontos que fogem da reta, tudo junto. Com a reta OLS até a diretoria entende: “quanto mais X, mais Y”. E os pontos longe da reta guardam as melhores histórias do dataset.",
      mistake: "Confundir correlação com causalidade. Sorvete e afogamento correlacionam (verão) — um não causa o outro.",
    },
    {
      name: "Rosca",
      glyph: "donut",
      when: "Partes de um todo, com 5 categorias ou menos.",
      why: "Funciona quando a pergunta é “de cada R$ 100, quanto vem de cada canal?”. A roca libera o centro para o número que importa: o total.",
      mistake: "Mais de 5 fatias, fatia “outros” gigante — ou, pecado capital, torta 3D. Aí ninguém compara mais nada.",
    },
  ];

  const dsPicks: MentorSection[] = ds
    ? [
        {
          kind: "picks",
          title: "O que o SEU dataset pede",
          items: [
            ...(ds.dateCols.length
              ? [{
                  col: date,
                  chart: "Linha temporal",
                  why: `${f(ds.finalRows)} linhas com data: a evolução de ${num} por período é a manchete natural — e já está pronta no Console.`,
                }]
              : []),
            ...(np && Math.abs(skew) > 1
              ? [{
                  col: num,
                  chart: "Histograma",
                  why: `assimetria g₁ = ${f(skew, 2)}: média (${f(mean)}) e mediana (${f(median)}) discordam bastante — o histograma mostra exatamente o porquê.`,
                }]
              : np
                ? [{
                    col: num,
                    chart: "Histograma + boxplot",
                    why: `distribuição com g₁ = ${f(skew, 2)}; confira a forma antes de confiar na média de ${f(mean)}.`,
                  }]
                : []),
            ...(ds.categoricalCols.length
              ? [{
                  col: cat,
                  chart: "Barras horizontais",
                  why: `${catProf?.unique ?? "várias"} categorias únicas: o ranking em barras responde “onde concentrar esforço” em um segundo.`,
                }]
              : []),
            ...(pair
              ? [{
                  col: `${pair.x} × ${pair.y}`,
                  chart: "Dispersão com OLS",
                  why: `r = ${f(pair.r, 2)} — a correlação mais forte do conjunto (${strength(pair.r)}). Merece reta de regressão e investigação de causa.`,
                }]
              : []),
          ],
        },
      ]
    : [];

  const m05: MentorModule = {
    id: "graficos",
    step: "05",
    title: "Os gráficos certos — e o porquê",
    tagline: "cada gráfico responde a UMA pergunta",
    intro:
      "Agora a parte que todo mundo vê — e onde o júnior mais erra. Gráfico é argumento visual: cada tipo responde a UMA pergunta, e usar o gráfico errado é responder uma pergunta que ninguém fez. Decore o “quando usar” e o “por que funciona” de cada um; o resto é estética.",
    sections: [
      { kind: "charts", title: "O arsenal mínimo, com justificativa científica", picks },
      ...dsPicks,
      {
        kind: "tip",
        tone: "info",
        title: "A ordem de apresentação dos grandes",
        text: "Manchete (linha do tempo) → ranking (barras) → profundidade (histograma/boxplot) → evidência (dispersão). Quem apresenta na ordem da curiosidade segura a sala do primeiro ao último slide.",
      },
    ],
  };

  /* ---------- M06 · matemática ---------- */
  const pearsonEx = pair
    ? `No SEU dataset, o par mais forte é ${pair.x} × ${pair.y} com r = ${f(pair.r, 2)} — uma relação ${strength(pair.r)}. O Console já plota a reta OLS dele; agora você sabe o que o r significa.`
    : "Exemplo clássico: horas de estudo × nota costuma dar r ≈ 0,6 (moderada positiva). Já sorvete × afogamento dá r alto no verão — e nenhum causa o outro.";

  const formulas: FormulaItem[] = [
    {
      id: "mean",
      name: "Média aritmética (μ)",
      explain: "Soma tudo e divide pela quantidade. É o “centro de gravidade” dos dados — exatamente por isso qualquer gigante puxa ela para o lado.",
      example: hasStats
        ? `No seu dado, ${num}: μ = ${f(mean)} vs. mediana = ${f(median)}. ${
            Math.abs(mean - median) > 0.08 * Math.max(Math.abs(mean), 1)
              ? "A distância entre as duas denuncia cauda/outliers — a média está sendo puxada."
              : "As duas estão próximas: distribuição comportada."
          }`
        : "Salários de 5 pessoas: 3k, 3k, 4k, 4k e 50k → média de R$ 12,8 mil. Quatro em cada cinco ganham menos que a “média”.",
      rule: "Confie quando a distribuição é simétrica (|g₁| < 0,5). Com cauda ou outlier, ela mente — e mente bonito.",
    },
    {
      id: "median",
      name: "Mediana (x̃)",
      explain: "O valor do meio quando tudo está ordenado: metade das linhas fica abaixo, metade acima. Nenhum gigante consegue puxá-la.",
      example: hasStats
        ? `Mediana de ${num} no seu dataset: ${f(median)}. É o número que você cita quando alguém pergunta “mas o que é TÍPICO aqui?”.`
        : "Nos mesmos salários (3k, 3k, 4k, 4k, 50k), a mediana é R$ 4 mil — o retrato honesto do grupo.",
      rule: "Use sempre que houver cauda (|g₁| > 1) ou outliers. Regra de bolso: renda, preços e tempos → mediana.",
    },
    {
      id: "std",
      name: "Desvio padrão (σ)",
      explain: "A distância típica de cada ponto até a média. σ pequeno = dado concentrado e previsível; σ grande = dado espalhado e volátil.",
      example: hasStats
        ? `${num}: σ = ${f(std)}. Pela regra 68-95-99,7, ~68% das linhas caem entre ${f(mean - std)} e ${f(mean + std)}.`
        : "Notas com média 7 e σ = 0,5: turma homogênea. Média 7 com σ = 2,5: metade da turma em risco — a média escondia tudo.",
      rule: "σ só faz sentido junto da média e na mesma unidade da coluna. Sozinho, é um número sem contexto.",
    },
    {
      id: "iqr",
      name: "Quartis e IQR (caixas de Tukey)",
      explain: "Q1 e Q3 delimitam os 50% do meio; IQR = Q3 − Q1 mede a caixa. As cercas de Tukey ficam a 1,5×IQR dela — quem passa é outlier técnico.",
      example: hasStats
        ? `${num}: Q1 = ${f(q1)}, Q3 = ${f(q3)} → IQR = ${f(iqr)}. Cerca superior ≈ ${f(fenceSup)}; ${outN} linha(s) do seu dado passaram dela.`
        : "Preços: Q1 = 90, Q3 = 150 → IQR = 60 → cercas em 0 e 240. Um item de R$ 900 aparece como ponto vermelho no boxplot: investigar, não apagar.",
      rule: "Método robusto: prefira ao z-score quando a distribuição é assimétrica — é o mesmo que o motor do PRISMA usa.",
    },
    {
      id: "pct",
      name: "Variação percentual (Δ%)",
      explain: "Quanto cresceu sobre a base antiga. E a pegadinha clássica: diferença em pontos percentuais (p.p.) NÃO é variação percentual.",
      example: "Margem de 10% para 12%: são 2 p.p. de ganho — mas em variação relativa é +20%. Apresente os dois, sempre com o absoluto do lado.",
      rule: "Base pequena infla %: “+500%” sobre 2 vendas são 10 vendas. Nunca publique um Δ% sem o número bruto.",
    },
    {
      id: "pearson",
      name: "Correlação de Pearson (r)",
      explain: "Mede a dança LINEAR de duas variáveis, de −1 a +1. O numerador é a covariância (andam juntas?); o denominador normaliza pela dispersão de cada uma.",
      example: pearsonEx,
      rule: "Leitura de bolso: |r| < 0,4 fraca · 0,4–0,7 moderada · > 0,7 forte. E lembre: r ≈ 0 só descarta relação LINEAR — a curva pode estar lá.",
    },
  ];

  const m06: MentorModule = {
    id: "matematica",
    step: "06",
    title: "A matemática por trás",
    tagline: "as 6 ferramentas de toda análise séria",
    intro:
      "Reta final. Você não precisa demonstrar teorema — precisa saber o que cada número SIGNIFICA e quando ele mente. Estas seis ferramentas aparecem em toda análise séria; com os exemplos calculados no seu próprio dado, elas deixam de ser fórmulas e viram instinto.",
    sections: [
      { kind: "formulas", title: "Fórmulas com leitura de mundo", items: formulas },
      {
        kind: "tip",
        tone: "warn",
        title: "A frase que salva análise",
        text: "Sempre que alguém disser “a média subiu”, você pergunta: “e a mediana?”. Se as duas andam juntas, a história é real; se divergem, alguém (ou algum outlier) está contando vantagem. Essa pergunta, sozinha, já te coloca acima da média dos analistas.",
      },
      {
        kind: "tip",
        tone: "good",
        title: "Trilha concluída — e agora?",
        text: "Volte ao Console com um dataset seu e repita o ritual: perguntas → extração → limpeza → query → gráfico → matemática. Na terceira vez, a ordem vira automática. É assim que júnior vira sênior: não decorando comandos, internalizando o método.",
      },
    ],
  };

  return [m01, m02, m03, m04, m05, m06];
}

/* ---------------- saudação do mentor ---------------- */

export function mentorGreeting(ds: Dataset | null): string {
  if (ds) {
    return `Olá! Eu sou o mentor do PRISMA — e já estudei o seu dataset “${ds.name}”: ${ds.finalRows.toLocaleString(
      "pt-BR"
    )} linhas limpas e ${ds.columns.length} colunas (${ds.numericCols.length} numéricas, ${ds.categoricalCols.length} categóricas, ${ds.dateCols.length} temporais). Monte a trilha usando as SUAS colunas: cada código e cada exemplo abaixo roda no seu dado. Por onde quer começar?`;
  }
  return "Olá! Eu sou o mentor do PRISMA. Vou te guiar do dado bruto até a decisão — perguntas certas, extração e limpeza em Python, queries SQL, os gráficos que funcionam (e o porquê) e a matemática por trás de tudo. Estou em modo exemplo: carregue um dataset no Console e eu monto a trilha com as suas colunas. Por onde quer começar?";
}

/* ---------------- chat: intenções ---------------- */

export const CHAT_SUGGESTIONS = [
  "Como trato valores nulos?",
  "Qual gráfico uso para comparar categorias?",
  "Me explica a correlação de Pearson",
  "Como extraio dados do banco com Python?",
  "Que perguntas fazer antes de analisar?",
  "Como achar outliers sem achismo?",
];

interface Rule {
  re: RegExp;
  moduleId: string;
  reply: string;
}

const RULES: Rule[] = [
  {
    re: /nulo|missing|vazio|isna|nan|ausente|faltand/i,
    moduleId: "limpeza",
    reply:
      "Nulo nunca se apaga no escuro. Primeiro meça (df.isna().mean()), depois entenda o padrão — nulo concentrado num perfil é informação, não sujeira. Numérica: impute pela MEDIANA; categórica: moda ou “não informado”. Acima de ~30% de vazios, imputar vira chute: fale com quem gerou o dado. O Passo 2 do Módulo 03 tem o código completo.",
  },
  {
    re: /outlier|extremo|anomalia|esquisit|estranh/i,
    moduleId: "limpeza",
    reply:
      "Sem achismo: use as cercas de Tukey. Calcule Q1 e Q3, IQR = Q3 − Q1, e marque o que cair fora de [Q1 − 1,5·IQR ; Q3 + 1,5·IQR]. Mas atenção à decisão: outlier REAL (um pedido B2B legítimo) fica e ganha flag; ERRO DE DIGITAÇÃO sai. O Passo 4 do Módulo 03 mostra no código — e no boxplot do Console você vê cada ponto.",
  },
  {
    re: /sql|query|banco|select|join|where|postgres|mysql/i,
    moduleId: "sql",
    reply:
      "Quatro padrões resolvem quase tudo: (1) agregação com GROUP BY, (2) HAVING para filtrar grupos por amostra, (3) LEFT JOIN com conferência de contagem antes/depois, e (4) CTE + funções de janela (LAG, SUM OVER) para acumulado e variação mês a mês. Todos estão prontos no Módulo 04, escritos para as suas colunas.",
  },
  {
    re: /grafic|chart|plot|visual|dash|histogram|pizza|donut|barra/i,
    moduleId: "graficos",
    reply:
      "Cada gráfico responde a UMA pergunta: tempo → linha; comparação entre grupos → barras horizontais (comprimento é a percepção mais precisa que temos); forma da distribuição → histograma; outliers e A/B → boxplot; relação entre duas métricas → dispersão com regressão; partes de um todo → roca com ≤ 5 fatias. O Módulo 05 traz o “porquê funciona” e o erro clássico de cada um.",
  },
  {
    re: /media|média|desvio|correla|pearson|formul|matem|matemá|calcul|estatist|quartil|mediana/i,
    moduleId: "matematica",
    reply:
      "As seis ferramentas de toda análise: média (e quando ela mente), mediana (a robusta), desvio padrão (a dispersão típica), quartis/IQR (as cercas de Tukey), variação % (com a pegadinha dos pontos percentuais) e Pearson (a dança linear, de −1 a +1). No Módulo 06 cada fórmula vem com exemplo — calculado no seu próprio dataset, se você carregou um.",
  },
  {
    re: /pergunta|negocio|negócio|gestor|comec|começ|primeir|hipotes|hipótes|iniciar|por onde/i,
    moduleId: "perguntas",
    reply:
      "Excelente instinto — começar pelas perguntas é o que separa análise de digitação. As essenciais: qual DECISÃO sai disso? Comparado com o quê? O que a métrica esconde? Qual período e granularidade? Quem consome? E que dado eu NÃO tenho? Depois aplique o framework D·P·C: Decisão → Pergunta → Cálculo. Tudo detalhado no Módulo 01.",
  },
  {
    re: /python|pandas|extrair|carreg|csv|ler|importar|arquivo|api/i,
    moduleId: "extracao",
    reply:
      "Três portas de entrada: arquivo (pd.read_csv com sep, decimal e parse_dates certos — dado brasileiro usa ; e vírgula), banco (pd.read_sql com o filtro já no SQL, nunca no Python) e API (requests com timeout e json_normalize). E o ritual dos 5 minutos: shape, dtypes, head, info, describe — sem conferir tipos, nada de calcular. Módulo 02 completo com código.",
  },
  {
    re: /limp|sujo|duplicad|tratar|qualidade|confi/i,
    moduleId: "limpeza",
    reply:
      "A ordem dos seniores: 1) duplicatas (drop_duplicates + conferência pela chave), 2) nulos (medir → decidir → mediana/moda), 3) tipos (to_numeric com errors='coerce', datas com dayfirst), 4) outliers pelas cercas de Tukey, 5) texto padronizado (strip + title). Pular a ordem gera retrabalho. Módulo 03 tem o ritual completo, passo a passo.",
  },
];

export function askMentor(question: string): { reply: string; moduleId?: string } {
  for (const r of RULES) {
    if (r.re.test(question)) return { reply: r.reply, moduleId: r.moduleId };
  }
  return {
    reply:
      "Boa pergunta — e eu tenho um módulo inteiro para ela. A trilha cobre: 01 as perguntas certas antes do código, 02 extração com Python, 03 limpeza passo a passo, 04 os padrões SQL essenciais, 05 os gráficos certos (com o porquê) e 06 a matemática por trás. Toca em um módulo na trilha — ou me pergunta algo como “como trato nulos?” ou “qual gráfico uso para comparar?”.",
  };
}
