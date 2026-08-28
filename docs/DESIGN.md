# Anthony.ia — Doutrina de Design

> Este documento é a fonte única de verdade visual do produto. Toda nova tela,
> componente ou gráfico deve passar pelo crivo destes princípios antes de ser mergeado.

---

## 1. Princípios fundamentais

**Toda entrega é peça de portfólio.** Nada de layouts-template. Uma tela só está
pronta quando está completa, rica na medida certa e com propósito claro em cada
elemento. Prefira ousadia com intenção a limpeza sem personalidade.

**A interface está viva.** O produto responde a cada ação com feedback perceptível:
fundo em camadas (grid + partículas + glows ambientes), micro-interações de hover,
transições de estado, reveals de scroll e contraste forte de tamanho e peso
tipográfico. Layout plano e estático é considerado defeito, não estilo.

**Abra com o que é mais característico do assunto.** O console abre com um terminal
de ingestão — não com um hero genérico de manchete + subtítulo + botão empilhados
ao centro. Cada área começa pela sua essência.

**Tipografia em duo.** Uma face display com personalidade (Cabinet Grotesk) para
títulos e números heróicos; uma face de leitura confortável (Satoshi) para corpo;
uma mono (Spline Sans Mono) para todo metadado de sistema. Nunca uma família só.

## 2. O que evitamos deliberadamente

Estes padrões são vetados a menos que o contexto os exija explicitamente:

- Trio de hero centrado (manchete + subtítulo + CTA empilhados)
- Fileiras de 3–4 cards de feature com o mesmo tamanho
- Manchetes pintadas com gradiente (especialmente índigo/violeta/rosa)
- Tipografia de família única em todo o site
- Glassmorphism generalizado, cantos acima de 8–10px, blobs de aurora
- Paletas creme/bege com terracota e serifas
- Fundo quase-preto sustentado por um único acento neon-ácido
- Grades densas de jornal com filetes finos demais

## 3. Tipografia

| Papel | Família | Uso |
|---|---|---|
| `--font-display` | **Cabinet Grotesk** 300–800 | Títulos (tracking negativo em 54px+), KPIs, números grandes |
| `--font-body` | **Satoshi** 400–700 | Corpo, descrições, navegação |
| `--font-mono` | **Spline Sans Mono** 400–500 | Dados, badges, eixos de gráfico, código, micro-labels com tracking largo |

Escala: micro 11px · caption 14px · corpo 16–18px · sub 27px · heading 35–40px ·
display 54–59px. Hierarquia por **contraste de peso** (300 heróico vs 700 técnico).

## 4. Temas via tokens

Toda cor flui por tokens CSS (`@theme` no Tailwind v4). O seletor no cabeçalho
alterna `document.documentElement.dataset.theme` entre dois registros:

### Tema `anthony` (padrão)

| Token | Valor | Papel |
|---|---|---|
| `--color-abyss` | `#070e0d` | canvas |
| `--color-panel` / `panel2` / `raise` | `#0c1615` · `#101d1b` · `#142522` | superfícies |
| `--color-line` / `line2` | `#1c2f2b` · `#2b463f` | hairlines |
| `--color-teal` / `tealhi` | `#3edcb4` · `#7cf5d6` | acento primário / highlight |
| `--color-amber` · `coral` · `sky` | `#f4b860` · `#f2796b` · `#66b7f0` | sinalização, alertas, séries |

### Tema `ameba` (midnight control room)

| Token | Valor | Papel |
|---|---|---|
| `--color-abyss` | `#00052e` | canvas midnight ink |
| `--color-teal` | `#0428cb` | signal blue (CTA único) |
| `--color-tealhi` | `#34fcff` | arco ciano — **apenas atmosfera**, nunca texto/botão |
| `--color-line2` | `#4f5166` | hairlines slate |

Regra de ouro: **os componentes nunca usam hex hardcoded** — sempre tokens ou
`color-mix(in srgb, var(--token) X%, transparent)`. Foi isso que permitiu a troca
de tema instantânea em todo o produto.

## 5. Componentes canônicos

| Componente | Receita |
|---|---|
| `.card` / `.card-static` | superfícies com hairline, raio 10px (8px no ameba), hover com borda teal + translateY(-2px) |
| `.btn-teal` | único botão preenchido; mono uppercase com tracking; hover eleva e ganha glow |
| `.btn-ghost` | ação secundária; hover puxa borda teal |
| `.tip` | tooltip mono escuro |
| `.paper` | registro claro: superfície branca com hairlines `#dbdcdf` inserida no shell escuro (registro funcional do tema ameba) |
| ChartCard | cabeçalho com título display + subtítulo + ações (seletores) + badge mono |

## 6. Movimento

| Assinatura | Onde |
|---|---|
| `pulse-dot` | indicadores de estado online |
| `float-y` | partículas ambiente + cards flutuantes (ameba) |
| `dash-march` | fluxos animados no blueprint de arquitetura |
| `scanline` | banners de módulo na Zona de Aprendizado |
| `stripes` | progresso do pipeline |
| reveals de scroll (`Reveal`) | entrada de seções, com stagger de 60–200ms |
| `fade-line` | troca de módulos/cartas do chat |

Todo gráfico responde: hover isola elemento, seletores trocam séries ao vivo,
slider de bins, brush de zoom, mapa com região ativa em glow.

## 7. Checklist para contribuir

- [ ] Usa apenas tokens de cor (rodou nos dois temas sem quebrar?)
- [ ] Tipografia: display para o herói da tela, mono para dados?
- [ ] Há feedback para cada interação (hover, ativo, transição)?
- [ ] A tela abre com o que é característico do assunto?
- [ ] Nenhum dos padrões vetados da seção 2 apareceu?
- [ ] Gráficos novos usam a paleta `C` de `charts.tsx` (tokenizada)?
