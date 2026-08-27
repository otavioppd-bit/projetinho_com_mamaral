/* Anthony.ia · IA Lab
   Catálogo de LLMs ranqueado (melhor → pior) + motor de inferência
   simulada com respostas especializadas em IA, em PT-BR. */

export interface LlmModel {
  id: string;
  name: string;
  vendor: string;
  color: string;            /* cor de identificação do vendor */
  released: string;
  score: number;            /* índice composto 0–100 */
  breakdown: { raciocinio: number; codigo: number; velocidade: number; custo: number };
  ttft: number;             /* time-to-first-token (ms) */
  tokSec: number;           /* tokens/segundo */
  costIn: number;           /* US$ / 1M tokens de entrada */
  costOut: number;          /* US$ / 1M tokens de saída */
  contextK: number;         /* janela de contexto em mil tokens */
  reasoning?: boolean;      /* modo raciocínio (pensa antes de responder) */
  open?: boolean;           /* pesos abertos */
  tags: string[];
  blurb: string;
}

/* Ranking fixo: ordenado da MELHOR para a PIOR pelo índice composto. */
export const MODELS: LlmModel[] = [
  {
    id: "opus-4-5", name: "Claude Opus 4.5", vendor: "Anthropic", color: "#ffb454", released: "nov 2025",
    score: 96.4, breakdown: { raciocinio: 98, codigo: 96, velocidade: 74, custo: 58 },
    ttft: 900, tokSec: 62, costIn: 5.0, costOut: 25.0, contextK: 500, reasoning: true,
    tags: ["raciocínio profundo", "agentivo", "código"],
    blurb: "Referência em tarefas longas e multi-etapa: sustenta raciocínio por horas e erra pouco em código complexo.",
  },
  {
    id: "gpt-5-2", name: "GPT-5.2", vendor: "OpenAI", color: "#37e6c3", released: "dez 2025",
    score: 95.7, breakdown: { raciocinio: 97, codigo: 95, velocidade: 80, custo: 62 },
    ttft: 850, tokSec: 78, costIn: 4.0, costOut: 20.0, contextK: 400, reasoning: true,
    tags: ["raciocínio", "ferramentas", "multimodal"],
    blurb: "Generalista de elite: alterna modo rápido e modo pensamento, forte em chamadas de função e visão.",
  },
  {
    id: "gemini-3-pro", name: "Gemini 3 Pro", vendor: "Google", color: "#6ea8ff", released: "nov 2025",
    score: 94.9, breakdown: { raciocinio: 95, codigo: 93, velocidade: 82, custo: 70 },
    ttft: 780, tokSec: 85, costIn: 3.5, costOut: 17.5, contextK: 2000,
    tags: ["contexto 2M", "multimodal nativo"],
    blurb: "Engole livros inteiros: 2M de tokens de contexto e multimodalidade de ponta a ponta.",
  },
  {
    id: "grok-4", name: "Grok 4", vendor: "xAI", color: "#ff6b81", released: "jul 2025",
    score: 91.8, breakdown: { raciocinio: 93, codigo: 90, velocidade: 76, custo: 60 },
    ttft: 950, tokSec: 70, costIn: 3.0, costOut: 15.0, contextK: 256, reasoning: true,
    tags: ["raciocínio", "tom direto"],
    blurb: "Raciocínio agressivo com personalidade: bom em problemas de lógica e respostas sem rodeios.",
  },
  {
    id: "sonnet-4-5", name: "Claude Sonnet 4.5", vendor: "Anthropic", color: "#ffb454", released: "set 2025",
    score: 90.6, breakdown: { raciocinio: 91, codigo: 94, velocidade: 86, custo: 78 },
    ttft: 520, tokSec: 95, costIn: 3.0, costOut: 15.0, contextK: 500,
    tags: ["equilibrado", "código", "rápido"],
    blurb: "O ponto de equilíbrio do mercado: qualidade quase-Opus por uma fração do preço e da latência.",
  },
  {
    id: "deepseek-v4", name: "DeepSeek V4", vendor: "DeepSeek", color: "#b39dff", released: "out 2025",
    score: 89.7, breakdown: { raciocinio: 90, codigo: 92, velocidade: 84, custo: 96 },
    ttft: 480, tokSec: 100, costIn: 0.27, costOut: 1.1, contextK: 128, open: true,
    tags: ["custo imbatível", "código", "pesos abertos"],
    blurb: "Desempenho de elite a centavos: o modelo que forçou o mercado inteiro a reprificar.",
  },
  {
    id: "llama-4-maverick", name: "Llama 4 Maverick", vendor: "Meta", color: "#6ea8ff", released: "abr 2025",
    score: 86.2, breakdown: { raciocinio: 84, codigo: 86, velocidade: 88, custo: 90 },
    ttft: 400, tokSec: 110, costIn: 0.2, costOut: 0.85, contextK: 1000, open: true,
    tags: ["MoE", "pesos abertos", "auto-hospedável"],
    blurb: "Mixture-of-Experts de 400B com 17B ativos: roda no seu hardware, sem vendor lock-in.",
  },
  {
    id: "mistral-large-3", name: "Mistral Large 3", vendor: "Mistral AI", color: "#ffb454", released: "dez 2025",
    score: 84.5, breakdown: { raciocinio: 83, codigo: 85, velocidade: 82, custo: 82 },
    ttft: 460, tokSec: 92, costIn: 2.0, costOut: 6.0, contextK: 256,
    tags: ["europeu", "funções", "JSON forte"],
    blurb: "Saída estruturada confiável e soberania de dados: favorito de empresas europeias reguladas.",
  },
  {
    id: "qwen3-max", name: "Qwen3 Max", vendor: "Alibaba", color: "#b39dff", released: "set 2025",
    score: 83.1, breakdown: { raciocinio: 84, codigo: 84, velocidade: 80, custo: 84 },
    ttft: 500, tokSec: 88, costIn: 1.6, costOut: 6.4, contextK: 256,
    tags: ["multilíngue", "agentes"],
    blurb: "Fortíssimo em idiomas e tool-use; a porta de entrada asiática para agentes de produção.",
  },
  {
    id: "command-a", name: "Command A", vendor: "Cohere", color: "#37e6c3", released: "mar 2025",
    score: 79.8, breakdown: { raciocinio: 76, codigo: 74, velocidade: 78, custo: 80 },
    ttft: 540, tokSec: 80, costIn: 2.5, costOut: 10.0, contextK: 256,
    tags: ["RAG corporativo", "multilíngue"],
    blurb: "Feito para buscar antes de responder: grounding em documentos corporativos com citações.",
  },
  {
    id: "phi-4", name: "Phi-4", vendor: "Microsoft", color: "#6ea8ff", released: "dez 2024",
    score: 76.3, breakdown: { raciocinio: 78, codigo: 76, velocidade: 94, custo: 95 },
    ttft: 220, tokSec: 160, costIn: 0.13, costOut: 0.5, contextK: 16, open: true,
    tags: ["small model", "matemática", "edge"],
    blurb: "14B que briga com modelos 5× maiores em STEM: a prova de que dados bons vencem parâmetros.",
  },
  {
    id: "gemma-3-27b", name: "Gemma 3 27B", vendor: "Google", color: "#6ea8ff", released: "mar 2025",
    score: 72.9, breakdown: { raciocinio: 72, codigo: 73, velocidade: 92, custo: 96 },
    ttft: 260, tokSec: 140, costIn: 0.1, costOut: 0.4, contextK: 128, open: true,
    tags: ["pesos abertos", "uma GPU", "visão"],
    blurb: "Roda numa única GPU consumer com visão incluída: o melhor ponto de partida open para times pequenos.",
  },
].sort((a, b) => b.score - a.score);

export const modelById = (id: string): LlmModel =>
  MODELS.find((m) => m.id === id) ?? MODELS[0];

export type Tier = "S" | "A" | "B" | "C";
export const tierOf = (m: LlmModel): Tier =>
  m.score >= 93 ? "S" : m.score >= 87 ? "A" : m.score >= 80 ? "B" : "C";

export const TIER_LABEL: Record<Tier, string> = {
  S: "classe frontier",
  A: "elite",
  B: "competitivo",
  C: "entrada",
};

/* ---------------- estimativas ---------------- */

export const estimateTokens = (text: string) => Math.max(1, Math.round(text.length / 4));

export const estimateCost = (m: LlmModel, inTok: number, outTok: number) =>
  (inTok * m.costIn + outTok * m.costOut) / 1_000_000;

/* ---------------- motor de conhecimento ---------------- */

interface Knowledge {
  re: RegExp;
  lead: string;
  points: string[];
  practice: string;
  caveat: string;
}

const KB: Knowledge[] = [
  {
    re: /transformer|attention|aten[çc][ãa]o|arquitetura/i,
    lead: "O Transformer é a arquitetura que iniciou tudo: em vez de ler o texto em sequência (como as RNNs), ele olha para TODAS as palavras ao mesmo tempo através de um mecanismo chamado self-attention.",
    points: [
      "Self-attention: cada token gera três vetores — Query (o que procuro), Key (o que ofereço) e Value (o que entrego). A atenção é um produto escalar entre Queries e Keys, normalizado por softmax, que decide quanto cada palavra 'olha' para as outras.",
      "Isso resolve o gargalo das RNNs: a informação entre duas palavras distantes viaja em 1 passo, não em N — e tudo pode ser processado em paralelo na GPU.",
      "Multi-head attention: o modelo roda várias atenções em paralelo, cada 'cabeça' capturando um tipo de relação (sintaxe, correferência, tópico).",
      "Como attention não tem noção de ordem, adicionam-se positional encodings — noções de posição que permitem ao modelo distinguir 'cão morde homem' de 'homem morde cão'.",
      "A complexidade é O(n²) no tamanho do contexto: é por isso que janelas longas são caras e existem arquiteturas esparsas (Sliding Window, MoE de atenção).",
    ],
    practice: "Na prática: quando um LLM responde sobre 'o banco' em uma frase financeira, foi a attention que ligou esse token a 'instituição' e não a 'assento'. Tudo o que chamamos de 'entendimento' começa nesse mecanismo.",
    caveat: "Limitação honesta: attention captura correlação contextual, não compreensão causal — o modelo não 'sabe', ele estima probabilidades muito bem calibradas.",
  },
  {
    re: /o que (é|e) (um |uma )?(llm|modelo de linguagem)|como funciona (um |o )?(llm|gpt)|large language/i,
    lead: "Um LLM é, na essência, um autocompletar estatístico de escala colossal: treinado para prever o PRÓXIMO token de qualquer texto, bilhões de vezes, até internalizar gramática, fatos e padrões de raciocínio.",
    points: [
      "Pré-treino: o modelo lê trilhões de tokens da internet e ajusta ~100B–1T de parâmetros para reduzir o erro de previsão. Ninguém programa conhecimento — ele emerge da compressão do corpus.",
      "Tokenização: o texto vira pedaços (tokens ≈ ¾ de uma palavra em português). 'Inteligência artificial' são 3–4 tokens que o modelo prevê um a um.",
      "Pós-treino (RLHF/DPO): humanos ranqueiam respostas e o modelo aprende a ser útil e seguro — é isso que transforma o autocompletar em um assistente.",
      "Emergência: acima de certa escala surgem habilidades nunca treinadas diretamente — seguir instruções, traduzir pares de idiomas raros, raciocínio em cadeia.",
    ],
    practice: "Na prática: cada resposta que você lê é uma sequência de apostas — a cada token, o modelo distribui probabilidade sobre ~100 mil candidatos e amostra o próximo. A 'conversa' é esse processo repetido centenas de vezes.",
    caveat: "Por isso LLMs podem alucinar com confiança: o objetivo é plausibilidade, não verificação. Para fatos críticos, combine com busca (RAG) ou fontes.",
  },
  {
    re: /rag|retrieval|recupera[çc][ãa]o|grounding|documento/i,
    lead: "RAG (Retrieval-Augmented Generation) é o padrão que resolve a maior fraqueza dos LLMs — conhecimento desatualizado e alucinação — buscando informação real ANTES de gerar a resposta.",
    points: [
      "Pipeline clássico: documentos → chunking (pedaços de 300–800 tokens) → embeddings → índice vetorial. Na consulta, a pergunta vira vetor, recuperam-se os k chunks mais similares e eles entram no prompt como contexto.",
      "O modelo então responde 'ancorado' nos chunks — idealmente citando-os. A resposta deixa de ser memória e passa a ser compreensão de material fornecido.",
      "Camadas que elevam a qualidade: chunking semântico, hybrid search (vetor + BM25), reranking com um modelo cross-encoder e avaliação de respostas (RAGAS).",
      "RAG vs fine-tuning: RAG injeta CONHECIMENTO (fatos, docs, preços); fine-tuning injeta COMPORTAMENTO (tom, formato, jargão). Na dúvida, RAG — é reversível e barato.",
    ],
    practice: "Na prática: um chat de suporte que responde com base na sua base de artigos é RAG. A métrica que importa é retrieval recall — se o chunk certo não for recuperado, nem o melhor LLM salva a resposta.",
    caveat: "RAG não elimina alucinação, só reduz drasticamente: o modelo ainda pode ignorar o contexto recuperado. Monitore groundedness em produção.",
  },
  {
    re: /embedding|vetor|similaridade|cosine|cosseno/i,
    lead: "Embeddings são a tradução de significado para geometria: textos viram vetores de centenas de dimensões onde SEMÂNTICA vira DISTÂNCIA — frases parecidas ficam próximas no espaço.",
    points: [
      "Um embedder (ex.: text-embedding-3) transforma 'cachorro feliz' e 'cão alegre' em vetores quase idênticos, enquanto 'planilha fiscal' fica distante — sem nenhuma regra manual.",
      "A medida padrão é a similaridade de cosseno (−1 a 1): o ângulo entre vetores. Acima de ~0,85, praticamente paráfrase; ~0,6–0,8, mesmo tema.",
      "Usos: busca semântica, deduplicação, clustering de tickets, recomendação, e como camada de retrieval do RAG.",
      "Armadilhas: embeddings capturam semelhança, não verdade nem negação ('não gostei' ≈ 'gostei' em alguns espaços). E dominam melhor alguns idiomas que outros.",
    ],
    practice: "Na prática: para achar 'reclamações sobre entrega atrasada' entre 50 mil tickets, embedde tudo uma vez, guarde num índice vetorial e busque por similaridade — sem keywords, sem regex, achando até 'o frete demorou uma eternidade'.",
    caveat: "Escolha o embedder pelo seu idioma e domínio (MTEB é o benchmark de referência) e sempre valide com um sample humano antes de confiar em produção.",
  },
  {
    re: /fine.?tun|finetun|lora|qlora|treinar|ajuste fino/i,
    lead: "Fine-tuning é continuar o treinamento de um modelo pronto nos SEUS dados — mas em 90% dos casos você não precisa do full fine-tuning: LoRA ajusta o comportamento com ~1% dos parâmetros.",
    points: [
      "Full fine-tuning: atualiza todos os parâmetros. Caro (GPU-dias), arriscado (catastrophic forgetting) e reservado a mudanças profundas de domínio.",
      "LoRA/QLoRA: congela o modelo e injeta pequenas matrizes treináveis nas camadas de atenção. Um ajuste que custaria US$ 50 mil sai por centenas — e roda numa única GPU consumer.",
      "Datasets: qualidade >> quantidade. 500–5 mil exemplos bem escritos no formato (instrução, resposta ideal) valem mais que 100 mil ruidosos.",
      "Quando NÃO fazer: se o problema é falta de conhecimento atual, use RAG; se é só formato de saída, prompt engineering resolve — fine-tune para comportamento: tom, jargão, padrões de raciocínio do seu domínio.",
    ],
    practice: "Na prática: um escritório de advocacia que quer respostas no formato dos seus pareceres fine-tuna com LoRA sobre 2 mil pareceres históricos. O modelo aprende o estilo, enquanto RAG fornece a legislação atualizada.",
    caveat: "Avalie antes e depois com um benchmark próprio (50–100 casos reais): fine-tuning sem régua de medição é superstição cara.",
  },
  {
    re: /prompt|engenharia de prompt|instru[çc][ãa]o|few.?shot|chain of thought/i,
    lead: "Prompt engineering é programar em linguagem natural: a qualidade da resposta depende menos do modelo e mais de como você especifica papel, contexto, formato e exemplos.",
    points: [
      "Estrutura que funciona: PAPEL (quem o modelo é) + CONTEXTO (o que ele sabe) + TAREFA (verbo preciso) + FORMATO (saída esperada) + EXEMPLOS (few-shot, quando a tarefa é ambígua).",
      "Chain-of-Thought: pedir 'pense passo a passo' eleva a acurácia em problemas de lógica porque força o modelo a gerar os passos intermediários que alimentam a conclusão.",
      "Few-shot: 2–4 exemplos de (entrada → saída) calibram o modelo melhor que parágrafos de descrição. Exemplos > explicações.",
      "Parâmetros: temperatura ~0 para tarefas determinísticas (extração, classificação), ~0,7 para escrita criativa. top_p é um controle alternativo de diversidade.",
      "Saída estruturada: peça JSON e dê o schema — modelos modernos seguem schemas com >95% de aderência quando instruídos com exemplos.",
    ],
    practice: "Na prática: 'Você é um analista sênior. Dado este CSV (contexto), identifique as 3 maiores anomalias (tarefa) em JSON {achado, severidade, evidência} (formato)' produz resultados de produção; 'olha meus dados aí' produz poesia inútil.",
    caveat: "Prompts são frágeis a atualizações de modelo: versionamento e evals automáticos não são luxo, são infraestrutura.",
  },
  {
    re: /alucin|hallucin|inventar|confiabilidade|veracidade|mentir/i,
    lead: "Alucinação não é um bug acidental — é consequência direta do objetivo de treino: o modelo otimiza PLAUSIBILIDADE, não veracidade. Quando não sabe, ele preenche com o que soa certo.",
    points: [
      "Causas: compressão imperfeita do corpus, treino sem sinal de verdade (ninguém verifica fatos durante o pré-treino), e decodificação que pode desviar cedo e 'se comprometer' com uma narrativa falsa.",
      "As mais perigosas são as confiantes: citações inventadas, URLs que não existem, números redondos que parecem precisos.",
      "Mitigações em camadas: RAG (ancoragem em documentos), citações verificáveis, temperatura baixa, instrução explícita para dizer 'não sei', e verificação externa (modelos juiz, regras de negócio).",
      "Métrica de maturidade: não existe LLM com alucinação zero — existe arquitetura de sistema que torna a alucinação detectável antes de chegar ao usuário.",
    ],
    practice: "Na prática: em produção, toda resposta factual passa por um pipeline: gera com contexto → extrai afirmações → valida contra a fonte → só publica o que ancora. É assim que os produtos sérios operam.",
    caveat: "Desconfie de demos sem eval: a taxa de alucinação varia de 2% a 20%+ conforme domínio e tarefa (SimpleQA e afins medem isso).",
  },
  {
    re: /agente|agent|autonom|tool|ferramenta|function call|mcp/i,
    lead: "Agentes são LLMs com mãos: em vez de uma resposta, executam um LOOP — pensar → agir (chamar ferramenta) → observar resultado → repensar — até concluir o objetivo.",
    points: [
      "O mecanismo central é tool use / function calling: o modelo emite chamadas estruturadas (buscar, calcular, escrever arquivo, consultar banco) e o runtime as executa, devolvendo o resultado ao contexto.",
      "Padrão ReAct: alternar 'Raciocínio:' (o que vou fazer e por quê) e 'Ação:' (a chamada). A observação do resultado corrige a rota — é um GPS que recalcula.",
      "MCP (Model Context Protocol) virou o padrão de mercado para conectar ferramentas: um adaptador por sistema, qualquer modelo compatível.",
      "Os desafios reais não são o modelo — são memória de longo prazo, custo do loop (cada passo é uma inferência), e segurança: um agente com permissões amplas precisa de sandbox e confirmação humana para ações destrutivas.",
    ],
    practice: "Na prática: 'analise o churn e me mande o relatório' como agente = consultar o banco → rodar agregações → gerar gráficos → escrever o resumo → enviar. Cada seta é uma tool call validada.",
    caveat: "Regra de produção: agentes autônomos para ações reversíveis, aprovação humana para irreversíveis (pagar, deletar, publicar).",
  },
  {
    re: /moe|mixture of experts|especialista/i,
    lead: "Mixture-of-Experts (MoE) é o truque de escala eficiente: o modelo tem centenas de bilhões de parâmetros, mas ativa só uma fração deles por token — capacidade de gigante, custo de anão.",
    points: [
      "Arquitetura: as camadas feed-forward são replicadas em N 'experts'; um router aprende a mandar cada token para os 2 experts mais adequados. Llama 4 Maverick: 400B totais, ~17B ativos.",
      "O ganho é econômico: você paga inference proporcional aos parâmetros ATIVOS, mas o conhecimento reside na capacidade total.",
      "Trade-offs: o modelo inteiro precisa caber em memória (GPU RAM é o gargalo, não compute), e treinar MoEs é instável (router collapse, load balancing).",
      "É a aposta dominante pós-2024: DeepSeek-V3, Mixtral e Gemini usam variações de MoE.",
    ],
    practice: "Na prática: MoE é por que modelos 'open' alcançaram os fechados — você hospeda 400B de conhecimento e serve com custo de 17B. A pergunta certa ao comparar modelos passou a ser 'quantos parâmetros ATIVOS?'.",
    caveat: "MoE não é mágica de qualidade: dois modelos com os mesmos parâmetros ativos têm desempenho similar; a diferença está nos dados e no pós-treino.",
  },
  {
    re: /rlhf|dpo|alinhamento|reward|recompensa/i,
    lead: "RLHF é como um autocompletar vira um assistente: humanos ensinam o modelo a PREFERIR respostas úteis e seguras, e o DPO é a versão moderna que pula a etapa mais cara do processo.",
    points: [
      "RLHF clássico (3 fases): (1) fine-tune supervisionado com demonstrações; (2) treino de um modelo de recompensa sobre preferências humanas (A vs B); (3) otimização do LLM com PPO para maximizar essa recompensa.",
      "DPO (Direct Preference Optimization) mostrou que dá para pular o modelo de recompensa: otimiza direto nas preferências, com perda simples — mais estável, mais barato, e virou o padrão da indústria.",
      "O que o alinhamento compra: seguir instruções, recusar pedidos nocivos, admitir incerteza, manter tom — comportamento, não conhecimento.",
      "Problema aberto: reward hacking — o modelo aprende a agradar o juiz (respostas longas, elogios) em vez de ser genuinamente bom. Evals independentes são o antídoto.",
    ],
    practice: "Na prática: quando um modelo recusa educadamente ou pergunta antes de agir, é pós-treino de preferências em ação. Times que fine-tunam em casa hoje usam DPO com pares de (resposta boa, resposta ruim) curados.",
    caveat: "Alinhamento é uma camada, não uma garantia: modelos alinhados ainda podem ser manipulados por prompts elaborados — defesa em profundidade sempre.",
  },
  {
    re: /temperatura|temperature|top.?p|sampler|aleatoriedade|determin/i,
    lead: "Temperatura é o dial entre determinismo e criatividade: controla quão 'pontuda' fica a distribuição de probabilidade do próximo token antes da amostragem.",
    points: [
      "T = 0: sempre o token mais provável — saídas quase determinísticas, ideais para extração, classificação e código.",
      "T alta (>1): a distribuição achata, tokens improváveis ganham chance — texto mais diverso e criativo, mas menos coerente.",
      "top_p (nucleus): amostra só dos tokens que acumulam p% da probabilidade (ex.: 0,9). Controla a cauda da distribuição em vez da forma dela.",
      "Regra prática: não mexa nos dois ao mesmo tempo. Fixe top_p = 1 e ajuste só a temperatura — 0 para fatos, 0,3–0,5 para análise, 0,7–1,0 para brainstorm.",
    ],
    practice: "Na prática: o mesmo prompt de 'resuma este contrato' com T=0 é reproduzível em produção (testes passam); com T=1 cada execução inventa um resumo diferente. A temperatura certa é uma decisão de engenharia, não de estilo.",
    caveat: "Mesmo T=0 pode variar entre hardwares/GPUs por diferenças numéricas — não prometa bit-perfect, prometa semanticamente estável.",
  },
  {
    re: /contexto|janela|context window|token limit|limite/i,
    lead: "Janela de contexto é a memória de trabalho do modelo: tudo o que ele 'vê' de uma vez — sistema + histórico + documentos + resposta — medido em tokens, e tudo fora dela simplesmente não existe para ele.",
    points: [
      "Escala atual: de 16K (modelos small) a 2M (Gemini 3 Pro). 2M tokens ≈ 1,5 milhão de palavras — uma biblioteca de bolso por request.",
      "Contexto longo não é grátis: custo cresce linearmente, a latência do primeiro token cresce com o tamanho, e a atenção no meio do contexto decai ('lost in the middle') — o modelo lembra melhor do início e do fim.",
      "Needle-in-a-haystack é o teste clássico: esconder um fato no meio de 100K tokens e ver se o modelo recupera. É onde as janelas gigantes separam marketing de realidade.",
      "Estratégias: resumir o histórico, comprimir com RAG (trazer só o relevante), ou arquiteturas com memória externa para conversas infinitas.",
    ],
    practice: "Na prática: não despeje 500 páginas no prompt 'porque cabe'. Recupere os 10 chunks relevantes (RAG), coloque-os perto da instrução, e a resposta será melhor E 50× mais barata.",
    caveat: "Confundir contexto com memória permanente é o erro mais comum: a cada request, o modelo recomeça do zero — persistência é responsabilidade da sua aplicação.",
  },
  {
    re: /qual (é|e) (o )?melhor|ranking|compare os modelos|compara[çc][ãa]o entre|melhor modelo/i,
    lead: "A resposta honesta: não existe 'o melhor modelo' — existe o melhor modelo para a sua tarefa dentro do seu orçamento. Mas o ranking do painel ao lado mostra o estado da arte hoje.",
    points: [
      "Topo do ranking (classe S): Opus 4.5, GPT-5.2 e Gemini 3 Pro trocam a liderança conforme o benchmark — raciocínio longo, coding e multimodalidade têm campeões diferentes.",
      "A classe A (Sonnet 4.5, DeepSeek V4) entrega 90–95% da qualidade por 10–30% do preço — é onde a maioria dos produtos de produção vive.",
      "Modelos open (Llama, DeepSeek, Gemma) mudaram a equação: auto-hospedar agora compete com API em muitas cargas, e elimina o risco de vendor lock-in.",
      "Critérios que importam na ordem: qualidade na SUA tarefa (meça com seus casos), latência percebida, custo por tarefa concluída, janela de contexto, e confiabilidade do fornecedor.",
    ],
    practice: "Na prática: escolha dois finalistas, rode 30–50 casos reais seus em cada um, meça acurácia + custo + p95 de latência, e deixe os números decidirem. Uma tarde de eval vence um mês de debate.",
    caveat: "O ranking muda a cada trimestre: fixe sua decisão em evals próprios, não em leaderboard — o modelo de hoje pode ser commodity amanhã.",
  },
  {
    re: /^(oi|olá|ola|eai|e aí|bom dia|boa tarde|boa noite|hey|hello)\b/i,
    lead: "Olá! Eu sou o chat especializado em IA do Anthony.ia. Pergunte qualquer coisa do universo de modelos de linguagem — e troque o modelo no ranking ao lado para ver como cada classe responde.",
    points: [
      "Arquitetura: 'o que é um transformer?', 'como funciona um LLM?'",
      "Engenharia: 'o que é RAG?', 'quando usar fine-tuning?', 'como funcionam embeddings?'",
      "Produção: 'por que LLMs alucinam?', 'o que são agentes?', 'como funciona a temperatura?'",
    ],
    practice: "Dica: modelos de topo (classe S) dão respostas completas com nuances; os de entrada respondem o essencial. Compare a mesma pergunta em dois modelos — é a melhor aula que existe.",
    caveat: "",
  },
];

const FALLBACK: Knowledge = {
  re: /./,
  lead: "Boa pergunta — ela fica fora dos tópicos que domino em profundidade, mas posso te levar aos fundamentos certos.",
  points: [
    "Se for sobre arquitetura: pergunte 'como funciona um transformer?' ou 'o que é MoE?'",
    "Se for sobre engenharia: 'o que é RAG?', 'fine-tuning vs RAG', 'como funcionam embeddings?'",
    "Se for sobre uso: 'por que LLMs alucinam?', 'como funcionam agentes?', 'qual a temperatura certa?'",
  ],
  practice: "E experimente: envie a mesma pergunta para o modelo #1 e para o último do ranking. A diferença de profundidade é a melhor aula prática sobre classes de LLM.",
  caveat: "",
};

export function detectKnowledge(q: string): Knowledge {
  for (const k of KB) if (k.re.test(q)) return k;
  return FALLBACK;
}

/* Monta a resposta no formato da classe do modelo. */
export function buildAnswer(q: string, m: LlmModel, persona: "analista" | "professor"): string {
  const k = detectKnowledge(q);
  const tier = tierOf(m);
  const parts: string[] = [];

  const lead =
    persona === "professor" && k !== FALLBACK
      ? `Vou construir isso do zero, camada por camada.\n\n${k.lead}`
      : k.lead;
  parts.push(lead);

  if (tier === "S") {
    parts.push("", ...k.points.map((p) => `▸ ${p}`));
    if (k.practice) parts.push("", k.practice);
    if (k.caveat) parts.push("", k.caveat);
  } else if (tier === "A") {
    parts.push("", ...k.points.map((p) => `▸ ${p}`));
    if (k.practice) parts.push("", k.practice);
  } else if (tier === "B") {
    parts.push("", ...k.points.slice(0, 3).map((p) => `▸ ${p}`));
  } else {
    parts.push("", "Resposta resumida (modelo de entrada): " + (k.points[0] ?? "").split(":")[0] + ". Para a explicação completa, experimente um modelo de classe S ou A no ranking.");
  }

  /* modelos de raciocínio expõem um traço do processo */
  if (m.reasoning && tier === "S") {
    parts.unshift(`[cadeia de raciocínio] Decompondo em 3 frentes — definição, mecanismo e aplicação prática — antes de responder.\n`);
  }

  return parts.filter((p) => p !== undefined).join("\n").trim();
}

export const SUGGESTIONS = [
  "Como funciona um transformer?",
  "O que é RAG e quando usar?",
  "Explique embeddings para um júnior",
  "Fine-tuning ou RAG?",
  "Por que LLMs alucinam?",
  "Qual o melhor modelo hoje?",
];
