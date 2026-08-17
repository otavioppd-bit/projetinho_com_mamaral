import { useMemo, useState } from "react";
import { AnimatedNumber, Reveal, SectionHead, fmtNum } from "./ui";

/* =====================================================================
   ARQUITETURA & ESCALABILIDADE — blueprint de produção do PRISMA.
   Diagrama interativo (hover/clique nos nós), simulador de carga com
   dimensionamento ao vivo, SLOs, fases de evolução e decisões técnicas.
   ===================================================================== */

interface ArchNode {
  id: string;
  name: string;
  tech: string;
  x: number;
  y: number;
  lane: string;
  laneColor: string;
  role: string;
  scale: string;
  fail: string;
}

const NODES: ArchNode[] = [
  {
    id: "client", name: "Cliente", tech: "React + motor local", x: 30, y: 250, lane: "Entrada", laneColor: "#8fa9a1",
    role: "Interface e (hoje) o próprio motor de análise. No blueprint de produção, vira consumidor da API e faz upload direto para o storage via URL assinada.",
    scale: "Escala sozinho: cada usuário usa a própria máquina. Zero custo marginal de front.",
    fail: "Se o bundle quebra, CDN serve a versão anterior em minutos (deploy imutável + rollback).",
  },
  {
    id: "cdn", name: "Edge / CDN", tech: "Cloudflare · WAF", x: 230, y: 120, lane: "Entrada", laneColor: "#8fa9a1",
    role: "Serve o frontend estático em 300+ PoPs, termina TLS, aplica WAF e bloqueia bots antes de qualquer request chegar à origem.",
    scale: "Praticamente infinito — cache de estáticos absorve picos sem tocar no backend.",
    fail: "Multi-PoP com anycast: um PoP cai e o tráfego é reroteado em segundos, sem ação humana.",
  },
  {
    id: "gw", name: "API Gateway", tech: "Auth · rate-limit · OpenAPI", x: 230, y: 380, lane: "Sincrono", laneColor: "#3edcb4",
    role: "Porta única da API: autentica (JWT/OAuth), valida schema, aplica rate-limit por plano e faz versionamento de rotas.",
    scale: "Stateless: sobe réplica nova em segundos e o LB distribui. Limite por tenant impede um cliente de derrubar os outros.",
    fail: "Réplica caída = detectada pelo health-check e removida da rotação em < 10s.",
  },
  {
    id: "api", name: "API Pods", tech: "Node · stateless · HPA", x: 440, y: 380, lane: "Sincrono", laneColor: "#3edcb4",
    role: "Lógica de negócio leve: CRUD de projetos, metadados, billing, emissão de jobs. NÃO processa dados — isso é trabalho do worker.",
    scale: "HPA no Kubernetes: +1 pod a cada ~65% de CPU sustentado. 250 RPS por pod como regra de bolso.",
    fail: "Stateless por contrato: matar um pod não perde nada. Rolling deploy sem downtime.",
  },
  {
    id: "redis", name: "Redis", tech: "Cache · filas · limites", x: 440, y: 120, lane: "Sincrono", laneColor: "#3edcb4",
    role: "Cache-aside dos perfis de coluna (a consulta mais quente), contadores de rate-limit e broker das filas de jobs.",
    scale: "Cluster com shards por tenant. Cache elimina ~80% das leituras repetidas no Postgres.",
    fail: "Replicação AOF + failover automático. Cache é descartável por design: esvaziou, o Postgres repõe.",
  },
  {
    id: "queue", name: "Fila de Jobs", tech: "BullMQ · retry · DLQ", x: 650, y: 380, lane: "Assincrono", laneColor: "#f4b860",
    role: "Amortece picos: análise pesada vira job na fila com retry exponencial e Dead-Letter Queue para inspeção manual.",
    scale: "A fila cresce em vez do sistema cair. Prioridades por plano (Pro furando fila de Free).",
    fail: "Job travado = visibilidade de lock expira e outro worker reassume. Nada é perdido: persistida em Redis com AOF.",
  },
  {
    id: "s3", name: "Object Storage", tech: "S3 · URLs assinadas", x: 650, y: 120, lane: "Assincrono", laneColor: "#f4b860",
    role: "Datasets brutos imutáveis + derivados em Parquet. Upload direto do navegador via URL assinada (não passa pela API).",
    scale: "11 noves de durabilidade. Lifecycle: bruto 90 dias, Parquet para sempre, transição para Glacier em 1 ano.",
    fail: "Versionamento ligado: delete acidental ou corrompido restaura em um clique.",
  },
  {
    id: "worker", name: "Workers de Análise", tech: "Pipeline · idempotente", x: 650, y: 500, lane: "Assincrono", laneColor: "#f4b860",
    role: "O motor do PRISMA em modo servidor: parse → limpeza → perfilamento → gráficos. Cada job é idempotente pelo job-id.",
    scale: "KEDA escala pelo tamanho da fila: 1.000 jobs esperando = mais workers em ~90s, depois devolve.",
    fail: "Crash no meio do job = retry idempotente gera o MESMO resultado. O que falha 3× vai para a DLQ com alerta.",
  },
  {
    id: "pg", name: "PostgreSQL", tech: "RDS Multi-AZ · réplicas", x: 860, y: 380, lane: "Dados", laneColor: "#f2796b",
    role: "Verdade única: tenants, usuários, projetos, resultados indexados. JSONB guarda perfis flexíveis sem virar banco de documentos.",
    scale: "Réplicas de leitura para dashboards; particionamento de resultados por tenant quando passar de ~100 GB.",
    fail: "Standby Multi-AZ com failover < 60s, PITR de 5 em 5 min, backup diário validado por restore automático.",
  },
  {
    id: "obs", name: "Observabilidade", tech: "Prometheus · Loki · traces", x: 860, y: 120, lane: "Dados", laneColor: "#f2796b",
    role: "Métricas (Prometheus), logs (Loki) e traces distribuídos de ponta a ponta. Alertas com SLO burn-rate, não com CPU alta.",
    scale: "Coleta fora do caminho crítico: nunca compete com o produto por recurso.",
    fail: "Se o observável cai, o produto continua — mas ninguém voa cego: alerta de 'silêncio' dispara em 2 min.",
  },
];

interface Flow { path: string; color: string; dur: number; begin: number; label: string }
const FLOWS: Flow[] = [
  { path: "M170,272 C205,272 205,152 230,152", color: "#66b7f0", dur: 3.2, begin: 0, label: "frontend estático" },
  { path: "M170,308 C205,308 205,412 230,412", color: "#3edcb4", dur: 2.6, begin: 0.4, label: "REST /api" },
  { path: "M380,412 L440,412", color: "#3edcb4", dur: 1.6, begin: 0.9, label: "rotas autenticadas" },
  { path: "M515,380 C515,300 515,230 515,186", color: "#66b7f0", dur: 2.2, begin: 1.3, label: "cache-aside" },
  { path: "M590,412 L650,412", color: "#f4b860", dur: 1.8, begin: 0.6, label: "enqueue de job" },
  { path: "M725,444 L725,498", color: "#f4b860", dur: 1.6, begin: 1.1, label: "consumo" },
  { path: "M800,520 C838,520 838,436 860,416", color: "#3edcb4", dur: 2.4, begin: 1.6, label: "resultados" },
  { path: "M650,528 C592,528 592,152 650,152", color: "#f2796b", dur: 3.6, begin: 0.2, label: "bruto in · parquet out" },
  { path: "M380,152 C560,152 660,152 858,152", color: "#66b7f0", dur: 4.2, begin: 2, label: "origem do CDN" },
];

const LANES = [
  { name: "Entrada", color: "#8fa9a1", desc: "usuário, CDN e proteção de borda" },
  { name: "Sincrono", color: "#3edcb4", desc: "respostas em milissegundos" },
  { name: "Assincrono", color: "#f4b860", desc: "jobs pesados fora do caminho crítico" },
  { name: "Dados", color: "#f2796b", desc: "verdade única e telemetria" },
];

function ArchDiagram({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const active = hovered ?? selected;
  const activeNode = NODES.find((n) => n.id === active);

  return (
    <div className="card-static p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <h3 className="font-display font-semibold text-lg tracking-tight">Blueprint de produção</h3>
          <p className="text-xs text-mut">passe o mouse ou clique num componente — cada um tem papel, escala e modo de falha</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {LANES.map((l) => (
            <span key={l.name} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-widest text-dim" title={l.desc}>
              <i className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} /> {l.name}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 1040 590" className="w-full min-w-[760px]">
          {/* linhas de telemetria (tracejadas, discretas) */}
          <path d="M930,184 L930,378" stroke="#5e7770" strokeWidth="1" strokeDasharray="3 6" opacity="0.5" fill="none" />
          <path d="M860,152 C720,60 560,220 516,376" stroke="#5e7770" strokeWidth="1" strokeDasharray="3 6" opacity="0.4" fill="none" />
          <text x="940" y="286" className="fill-[#5e7770]" fontSize="9" fontFamily="var(--font-mono)">telemetria</text>

          {/* fluxos */}
          {FLOWS.map((fl, i) => (
            <g key={i}>
              <path d={fl.path} fill="none" stroke={fl.color} strokeWidth="1.4" opacity="0.4" className="dash-march" strokeDasharray="4 10" />
              <circle r="3.2" fill={fl.color}>
                <animateMotion dur={`${fl.dur}s`} begin={`${fl.begin}s`} repeatCount="indefinite" path={fl.path} />
              </circle>
            </g>
          ))}

          {/* nós */}
          {NODES.map((n) => {
            const isActive = active === n.id;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(n.id)}
                className="cursor-pointer"
                style={{ transition: "opacity .25s ease", opacity: active && !isActive ? 0.55 : 1 }}
              >
                <rect
                  width="150" height="64" rx="9"
                  fill={isActive ? "#142522" : "#0c1615"}
                  stroke={isActive ? n.laneColor : "#1c2f2b"}
                  strokeWidth={isActive ? 1.6 : 1}
                  style={{ transition: "stroke .25s ease, fill .25s ease" }}
                />
                <rect x="0" y="14" width="3" height="36" rx="1.5" fill={n.laneColor} opacity={isActive ? 1 : 0.65} />
                <text x="16" y="26" fontSize="12.5" fontWeight="700" fill="#e9f4f0" fontFamily="var(--font-display)">{n.name}</text>
                <text x="16" y="43" fontSize="9" fill="#8fa9a1" fontFamily="var(--font-mono)">{n.tech}</text>
                <text x="16" y="56" fontSize="8" fill="#5e7770" fontFamily="var(--font-mono)" letterSpacing="1.5" style={{ textTransform: "uppercase" }}>
                  {n.lane}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* painel do nó ativo */}
      {activeNode && (
        <div key={activeNode.id} className="mt-4 rounded-lg border border-line bg-abyss/50 p-4 fade-line grid md:grid-cols-3 gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: activeNode.laneColor }}>papel</p>
            <p className="text-[12.5px] text-mut leading-relaxed">{activeNode.role}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-teal mb-1.5">como escala</p>
            <p className="text-[12.5px] text-mut leading-relaxed">{activeNode.scale}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-coral mb-1.5">quando algo quebra</p>
            <p className="text-[12.5px] text-mut leading-relaxed">{activeNode.fail}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- simulador de carga ---------------- */

function Slider({
  label, value, min, max, step, unit, onChange,
}: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">{label}</span>
        <span className="font-mono text-sm font-bold text-tealhi tabular-nums">
          {fmtNum(value)} <span className="text-[9px] text-dim font-normal">{unit}</span>
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal cursor-pointer"
      />
    </label>
  );
}

function Gauge({ label, pct, note }: { label: string; pct: number; note: string }) {
  const p = Math.min(1, pct);
  const color = p > 0.85 ? "#f2796b" : p > 0.65 ? "#f4b860" : "#3edcb4";
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim">{label}</span>
        <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color }}>{Math.round(p * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-abyss border border-line overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${p * 100}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }} />
      </div>
      <p className="font-mono text-[9px] text-dim mt-1">{note}</p>
    </div>
  );
}

function LoadSimulator() {
  const [users, setUsers] = useState(20000);
  const [sizeMb, setSizeMb] = useState(12);
  const [asyncPct, setAsyncPct] = useState(90);

  const sim = useMemo(() => {
    const thinkTime = 8; // s entre ações do usuário
    const rps = users / thinkTime;
    const jobSec = 0.9 + 0.18 * sizeMb; // tempo de análise por dataset
    const asyncRps = rps * (asyncPct / 100);
    const workers = Math.max(2, Math.ceil((asyncRps * jobSec) / 0.7));
    const apiPods = Math.max(2, Math.ceil(rps / 250));
    const apiUtil = rps / (apiPods * 250);
    const workerUtil = (asyncRps * jobSec) / workers; // demanda (s/s) ÷ workers
    const p95Api = 85 + (rps / apiPods) * 0.35;
    const p95Job = jobSec * 1000 * 1.25;
    const dbConns = apiPods * 20 + workers * 10;
    const uploadsDay = users * 0.6;
    const storageGb = (uploadsDay * 30 * sizeMb) / 1024;
    const cost = apiPods * 38 + workers * 46 + 240 + 85 + storageGb * 0.023 + (rps * 86400 * 30 * 0.0004) * 0.08;
    return { rps, jobSec, workers, apiPods, apiUtil, workerUtil, p95Api, p95Job, dbConns, storageGb, cost };
  }, [users, sizeMb, asyncPct]);

  const metrics: { label: string; value: number; hint: string; prefix?: string; suffix?: string }[] = [
    { label: "requests / segundo", value: Math.round(sim.rps), hint: "usuários ÷ 8s de think-time" },
    { label: "pods de API (HPA)", value: sim.apiPods, hint: "teto de 250 RPS por pod" },
    { label: "workers de análise (KEDA)", value: sim.workers, hint: `~${sim.jobSec.toFixed(1)}s por job · alvo 70% de uso` },
    { label: "p95 da API", value: Math.round(sim.p95Api), suffix: "ms", hint: "SLO: < 300 ms" },
    { label: "p95 do job assíncrono", value: Math.round(sim.p95Job / 100) / 10, suffix: "s", hint: "fila + retry incluídos" },
    { label: "conexões no Postgres", value: sim.dbConns, hint: "pool 20/pod + 10/worker" },
    { label: "storage em 30 dias", value: Math.round(sim.storageGb), suffix: "GB", hint: "bruto · Parquet aparte" },
    { label: "custo mensal estimado", value: Math.round(sim.cost), prefix: "US$ ", hint: "heurística de mercado" },
  ];

  return (
    <div className="card-static p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-lg tracking-tight">Simulador de carga</h3>
          <p className="text-xs text-mut mt-0.5 max-w-xl">
            Arraste os controles e veja o dimensionamento reagir — a mesma matemática que um capacity planning de verdade, com heurísticas de mercado.
          </p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-amber border border-amber/30 bg-amber/[0.08] rounded px-2 py-1">
          modelo ilustrativo · valide com carga real
        </span>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6 mt-6">
        <div className="space-y-6">
          <Slider label="usuários simultâneos" value={users} min={500} max={200000} step={500} unit="on-line" onChange={setUsers} />
          <Slider label="dataset médio" value={sizeMb} min={1} max={200} step={1} unit="MB" onChange={setSizeMb} />
          <Slider label="análises assíncronas" value={asyncPct} min={50} max={100} step={5} unit="%" onChange={setAsyncPct} />
          <div className="rounded-lg border border-line bg-abyss/50 p-3.5 space-y-4">
            <Gauge label="uso dos pods de API" pct={sim.apiUtil} note="HPA dispara a 65% sustentado" />
            <Gauge label="uso dos workers" pct={sim.workerUtil} note="KEDA escala pelo tamanho da fila" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-px bg-line rounded-[10px] overflow-hidden border border-line self-start">
          {metrics.map((m) => (
            <div key={m.label} className="bg-panel px-4 py-4 hover:bg-panel2 transition-colors">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-dim">{m.label}</p>
              <p className="font-display font-bold text-[26px] leading-tight mt-1 tabular-nums">
                <AnimatedNumber value={m.value} prefix={m.prefix ?? ""} suffix={m.suffix ?? ""} />
              </p>
              <p className="font-mono text-[9px] text-dim mt-1">{m.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- página ---------------- */

const DECISIONS = [
  {
    id: "D-01", title: "Fila assíncrona para tudo que passa de 1s",
    text: "Analisar 200 MB leva dezenas de segundos — fazer isso dentro do request HTTP é pedir timeout. O job vai para a fila, o usuário recebe 202 Accepted na hora e acompanha o progresso via WebSocket.",
  },
  {
    id: "D-02", title: "API stateless + HPA, workers com KEDA",
    text: "Dois eixos de escala independentes: a API escala por CPU (tráfego), os workers escalam pelo tamanho da fila (processamento). Pico de upload não derruba a navegação — e vice-versa.",
  },
  {
    id: "D-03", title: "Postgres, não banco de documentos",
    text: "Billing, tenants e permissões SÃO relacionais — e transações existem. A flexibilidade que precisava (perfis de coluna, schemas variantes) mora em JSONB. Um banco só, operado com maestria.",
  },
  {
    id: "D-04", title: "Idempotência por job-id",
    text: "Todo job carrega um id único e o resultado é gravado com UPSERT por esse id. Retry após crash, deploy ou fila duplicada produz exatamente o mesmo artefato — nunca o dobro.",
  },
  {
    id: "D-05", title: "Cache-aside com invalidação por dataset",
    text: "Perfis de coluna mudam só quando o dataset muda: cache no Redis com chave dataset_id:versao. Upload novo = versão nova, cache antigo expira sozinho. Sem lógica de invalidação maluca.",
  },
  {
    id: "D-06", title: "Bruto imutável, derivados em Parquet",
    text: "O arquivo do usuário fica intocado no S3 (auditoria e reprocessamento). Todo resultado vira Parquet particionado — colunar, comprimido, pronto para o data lakehouse da Fase 3.",
  },
];

const PHASES = [
  {
    fase: "Fase 0", nome: "Motor no navegador", status: "em produção", live: true,
    items: ["Análise 100% client-side — dado nunca sai da máquina", "Custo de infra ≈ 0 (CDN estático)", "Privacidade como feature, não como compliance"],
  },
  {
    fase: "Fase 1", nome: "API + fila + Postgres", status: "projetado", live: false,
    items: ["Jobs assíncronos com BullMQ e DLQ", "Upload direto via URL assinada", "HPA/KEDA e réplicas de leitura"],
  },
  {
    fase: "Fase 2", nome: "Multi-tenant & billing", status: "projetado", live: false,
    items: ["Isolamento por tenant com RLS", "Planos com rate-limit e prioridade de fila", "Métricas de uso por cliente (showback)"],
  },
  {
    fase: "Fase 3", nome: "Lakehouse & ML", status: "projetado", live: false,
    items: ["Parquet particionado no S3 + Iceberg", "Feature store dos perfis históricos", "Modelos de anomalia treinados no próprio dado"],
  },
];

const SLOS = [
  { big: "99,95%", small: "disponibilidade", note: "orçamento de erro: 21,9 min/mês" },
  { big: "< 300ms", small: "p95 da API", note: "medido no gateway, não no pod" },
  { big: "5 min", small: "RPO · perda máxima", note: "WAL archiving contínuo" },
  { big: "30 min", small: "RTO · volta máxima", note: "runbook testado todo trimestre" },
];

export function ArchitecturePage() {
  const [selected, setSelected] = useState("queue");

  return (
    <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8 pb-24">
      {/* faixa de honestidade */}
      <Reveal className="pt-8">
        <div className="card-static overflow-hidden">
          <div className="px-5 md:px-6 pt-5 pb-4 flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-dim mb-2">arquitetura & escalabilidade</p>
              <h1 className="font-display font-bold text-2xl md:text-[30px] leading-tight tracking-tight">
                Robusto por desenho —<br className="hidden md:block" /> e honesto sobre o estágio.
              </h1>
              <p className="text-sm text-mut mt-2.5 max-w-2xl leading-relaxed">
                Hoje o PRISMA roda <span className="text-tealhi">100% no seu navegador</span>: nenhum dado sai da máquina,
                a infraestrutura custa zero e a disponibilidade é a do CDN. Para virar produto multi-usuário, ele foi
                projetado sobre o blueprint abaixo — cada peça escolhida para escalar na horizontal{" "}
                <em>sem reescrever o que já existe</em>.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="font-mono text-[9px] uppercase tracking-widest text-teal border border-teal/35 bg-teal/[0.1] rounded px-2.5 py-1.5">fase 0 · em produção</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-mut border border-line rounded px-2.5 py-1.5">sem lock-in · padrões abertos</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-px bg-line border-t border-line">
            {[
              { k: "hoje", v: "Motor local", d: "privacidade total, latência zero de rede, custo marginal nulo por usuário" },
              { k: "amanhã", v: "Backend projetado", d: "API stateless, fila, workers idempotentes — tudo abaixo dimensionável" },
              { k: "sempre", v: "Portável", d: "REST/OpenAPI, Postgres, S3, Prometheus: nenhum fornecedor prende a stack" },
            ].map((c) => (
              <div key={c.k} className="bg-panel px-5 py-4 hover:bg-panel2 transition-colors">
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-dim">{c.k}</p>
                <p className="font-display font-semibold text-[15px] mt-1">{c.v}</p>
                <p className="text-xs text-mut mt-1 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* 01 · diagrama */}
      <section className="mt-14">
        <SectionHead index="01" kicker="o sistema por dentro" title="Blueprint de produção" desc="Dez componentes, quatro raias: entrada, caminho síncrono, caminho assíncrono e dados. Os pontos em movimento são os fluxos reais de um request de análise." />
        <Reveal><ArchDiagram selected={selected} onSelect={setSelected} /></Reveal>
      </section>

      {/* 02 · simulador */}
      <section className="mt-14">
        <SectionHead index="02" kicker="capacity planning ao vivo" title="Simulador de carga" desc="A pergunta certa não é “aguenta?” — é “aguenta quanto, com quantos pods, a que custo?”. Brinque com os números." />
        <Reveal><LoadSimulator /></Reveal>
      </section>

      {/* 03 · SLOs */}
      <section className="mt-14">
        <SectionHead index="03" kicker="promessas mensuráveis" title="SLOs do serviço" desc="Nível de serviço se assina com número, não com adjetivo. Estes são os alvos que a Fase 1 nasce obrigada a cumprir." />
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {SLOS.map((s, i) => (
              <div key={s.small} className="card p-5 text-center group">
                <p className="font-display font-bold text-[30px] md:text-[34px] tracking-tight text-tealhi group-hover:text-white transition-colors">{s.big}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink mt-1">{s.small}</p>
                <p className="font-mono text-[9.5px] text-dim mt-2 border-t border-line pt-2">{s.note}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 04 · fases */}
      <section className="mt-14">
        <SectionHead index="04" kicker="evolução sem reescrita" title="Fases de escalabilidade" desc="Cada fase adiciona capacidade sem quebrar a anterior — o motor local da Fase 0 continua funcionando offline para sempre." />
        <Reveal>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            {PHASES.map((p, i) => (
              <div key={p.fase} className={`card p-5 relative overflow-hidden ${p.live ? "border-teal/40" : ""}`}>
                {p.live && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teal pulse-dot" />}
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-dim">{p.fase}</p>
                <h4 className="font-display font-semibold text-[16px] tracking-tight mt-1">{p.nome}</h4>
                <span className={`inline-block font-mono text-[8.5px] uppercase tracking-widest rounded px-1.5 py-0.5 mt-2 border ${p.live ? "text-teal border-teal/40 bg-teal/[0.08]" : "text-dim border-line"}`}>{p.status}</span>
                <ul className="mt-3.5 space-y-2">
                  {p.items.map((it) => (
                    <li key={it} className="flex gap-2 text-xs text-mut leading-relaxed">
                      <span className="text-teal font-mono mt-px shrink-0">▸</span>{it}
                    </li>
                  ))}
                </ul>
                {!p.live && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-line2 to-transparent" />}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 05 · decisões */}
      <section className="mt-14">
        <SectionHead index="05" kicker="cada escolha tem um porquê" title="Decisões técnicas" desc="Arquitetura séria não é lista de tecnologias — é a soma de decisões defensáveis. As seis que sustentam o blueprint:" />
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {DECISIONS.map((d, i) => (
            <Reveal key={d.id} delay={i * 60}>
              <div className="card p-5 h-full group">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[10px] font-bold text-abyss bg-teal rounded px-2 py-0.5 group-hover:bg-tealhi transition-colors">{d.id}</span>
                  <h4 className="font-semibold text-[14.5px] tracking-tight leading-snug">{d.title}</h4>
                </div>
                <p className="text-[12.5px] text-mut leading-relaxed">{d.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className="mt-14">
        <p className="font-mono text-[10.5px] text-dim border border-dashed border-line rounded-lg px-4 py-3 leading-relaxed">
          Nota de engenharia: os números do simulador usam heurísticas públicas de mercado (250 RPS/pod stateless,
          70% de utilização-alvo, ~0,18s/MB de parse). Capacity planning de verdade se faz com o seu workload —
          o blueprint está pronto para o teste.
        </p>
      </Reveal>
    </div>
  );
}
