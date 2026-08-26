<p align="center">
  <b style="font-size:28px">Anthony<span style="color:#3edcb4">.ia</span></b>
</p>
<p align="center">
  <b>Console de análise de dados que roda 100% no navegador</b><br/>
  <i>ingestão · limpeza auditável · perfilamento · dossiê visual · mentoria em 3 trilhas · blueprint de arquitetura</i>
</p>

---

## O que é

O **Anthony.ia** é um SaaS de data analytics que transforma dados brutos em um dossiê científico — sem servidor, sem upload, sem espera. Você joga um CSV/JSON (ou cola os dados), o motor local **limpa cada célula**, perfila as variáveis e devolve gráficos de nível profissional, insights automáticos e um relatório exportável. Junto, uma **Zona Data Analytics** com um mentor de IA que ensina do nível júnior ao sênior — incluindo Tableau, Power BI, modelagem dimensional, testes A/B, dbt e governança.

> 🔒 **Privacidade por arquitetura:** nenhum dado sai da máquina do usuário. Toda a análise acontece no cliente.

## As quatro áreas do produto

### 📊 Console
- **Ingestão** — drag & drop de CSV/TSV/JSON, colagem direta ou datasets de laboratório (e-commerce, ensaio clínico, telemetria IoT)
- **Pipeline animado** — o processamento é encenado como terminal: ingestão → tipagem → higienização → perfilamento → renderização
- **Higiene auditável** — remoção de duplicatas, imputação por mediana/moda, outliers por Tukey (1,5×IQR), normalização de texto e tipos (`1.234,56`, `R$ 1.230,50`, `N/A`…)
- **Dossiê visual** — histograma com slider de bins, boxplots em SVG nativo, matriz de correlação de Pearson, dispersão com regressão OLS, barras com ordenação, rosca interativa, série histórica com brush de zoom e **mapa coroplético do Brasil** por macrorregião
- **Motor de insights** — conclusões derivadas das estatísticas do próprio dataset + exportação do dossiê em JSON

### 🎓 Zona Data Analytics — 3 trilhas, 18 módulos
| Trilha | Módulos |
|---|---|
| **Júnior** | Perguntas certas · Extração (Python) · Limpeza (Python) · SQL na prática · Gráficos e o porquê · Matemática essencial |
| **Pleno** | Perguntas de negócio · ETL em Python · Modelagem dimensional · SQL analítico · **Tableau** · **Power BI** |
| **Sênior** | Estratégia de dados · Engenharia (dbt · testes · linhagem) · **Tableau** avançado · **Power BI** avançado · Estatística para decisão · Governança & FinOps |

- Todo código e exemplo é **personalizado com as colunas e estatísticas reais** do dataset carregado
- Blocos de código com syntax highlighting próprio, numeração e botão de copiar
- **Chat flutuante do mentor** com reconhecimento de intenções e salto direto ao módulo certo
- Progresso persistido por trilha no navegador

### 🏗️ Arquitetura
- Blueprint interativo de produção (10 componentes, fluxos animados, papel/escala/falha de cada nó)
- **Simulador de carga** com dimensionamento ao vivo: pods, workers, p95, storage e custo
- SLOs, fases de evolução (motor local → API+fila → multi-tenant → lakehouse) e decisões técnicas justificadas

### 🎨 Duas versões visuais
- **Anthony** — petróleo profundo, teal elétrico, grid técnica (padrão)
- **Ameba** — midnight control room: navy `#00052e`, signal blue `#0428cb`, arco ciano, tipografia whisper-weight e cards flutuantes de notificação

A troca é instantânea no cabeçalho e retematiza **todo** o produto (gráficos, mapas, blueprint, código e chat incluídos) via tokens CSS.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 · TypeScript · Vite 6 |
| Estilos | Tailwind CSS v4 (design tokens via `@theme`) |
| Gráficos | Recharts + SVG nativo (boxplots, heatmap, mapa do Brasil) |
| Parsing | PapaParse (motor próprio de limpeza/perfilamento em `src/lib/analyze.ts`) |
| Tipografia | Cabinet Grotesk (display) · Satoshi (corpo) · Spline Sans Mono (dados) |

## Rodando localmente

```bash
npm install
npm run dev        # desenvolvimento (http://localhost:5173)
npm run typecheck  # checagem de tipos
npm run build      # build de produção (dist/)
```

## Estrutura

```
src/
├── App.tsx                 # shell, roteamento de áreas, seletor de versão visual
├── index.css               # design tokens + temas [data-theme="ameba"]
├── components/
│   ├── ui.tsx              # átomos: ícones SVG, reveals, números animados, seletores
│   ├── intake.tsx          # console de ingestão + pipeline animado
│   ├── dashboard.tsx       # dossiê: KPIs, higiene, gráficos, insights
│   ├── charts.tsx          # Recharts tokenizado + SVG nativo
│   ├── GeoMap.tsx          # mapa coroplético do Brasil (SVG próprio)
│   ├── academy.tsx         # trilhas júnior/pleno/sênior + chat do mentor
│   ├── arch.tsx            # blueprint, simulador de carga, SLOs
│   └── code.tsx            # highlighter Python/SQL sem dependências
├── lib/
│   ├── analyze.ts          # motor: parse → limpeza → perfilamento → insights
│   ├── mentor.ts           # conteúdo das 3 trilhas, personalizado por dataset
│   ├── samples.ts          # datasets de laboratório (com sujeira intencional)
│   └── images.ts           # ilustrações e avatar do mentor
docs/
└── DESIGN.md               # doutrina de design, tokens e componentes
```

## Princípios de design

O produto segue uma doutrina própria de interface — documentada em [`docs/DESIGN.md`](docs/DESIGN.md): peças completas e vivas, feedback perceptível em toda ação, contraste tipográfico forte e fuga deliberada de padrões genéricos de SaaS.

## Roadmap (backend projetado)

A área **Arquitetura** contém o blueprint completo: Fase 0 (atual, motor local) → Fase 1 (API stateless + fila BullMQ + Postgres) → Fase 2 (multi-tenant com RLS + billing) → Fase 3 (lakehouse Parquet/Iceberg + ML de anomalias). Cada fase soma capacidade sem reescrever a anterior.

## Licença

MIT — veja [LICENSE](LICENSE).
