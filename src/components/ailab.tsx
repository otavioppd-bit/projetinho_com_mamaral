import { useEffect, useMemo, useRef, useState } from "react";
import {
  MODELS, modelById, tierOf, TIER_LABEL, estimateTokens, estimateCost,
  buildAnswer, SUGGESTIONS, type LlmModel,
} from "../lib/llms";
import {
  IconBolt, IconChat, IconCheck, IconChip, IconCoins, IconContext, IconCopy,
  IconCrown, IconGauge, IconOpen, IconRefresh, IconSend, IconTrash,
} from "./icons";

/* ---------------- constantes visuais ---------------- */

const TIER_COLOR: Record<string, string> = { S: "var(--color-cyan)", A: "var(--color-sky)", B: "var(--color-amber)", C: "var(--color-coral)" };
const TIER_BG: Record<string, string> = {
  S: "rgba(55,230,195,0.1)", A: "rgba(110,168,255,0.1)",
  B: "rgba(255,180,84,0.1)", C: "rgba(255,107,129,0.1)",
};

interface Msg {
  id: number;
  role: "user" | "ai";
  text: string;
  modelId?: string;
  status?: "thinking" | "streaming" | "done";
  latencyMs?: number;
  outTok?: number;
  cost?: number;
  thinkingMs?: number;
}

/* ---------------- ranking (melhor → pior) ---------------- */

function ModelCard({ m, rank, active, onSelect, compact }: {
  m: LlmModel; rank: number; active: boolean; onSelect: () => void; compact?: boolean;
}) {
  const tier = tierOf(m);
  const color = TIER_COLOR[tier];

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className={`shrink-0 w-[228px] text-left rounded-xl border px-3.5 py-3 transition-all ${
          active ? "border-[var(--color-cyan)]/60 bg-[rgba(55,230,195,0.07)]" : "border-[var(--color-line)] bg-[var(--color-panel)] hover:border-[var(--color-line2)]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-[15px] text-[var(--color-dim)] w-7">#{rank}</span>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: m.color }} />
          <span className="text-[13px] font-semibold truncate flex-1">{m.name}</span>
          <span className="font-mono text-[10px] font-bold" style={{ color }}>{m.score.toFixed(1)}</span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-[var(--color-line)] overflow-hidden">
          <div className="h-full rounded-full score-in" style={{ width: `${m.score}%`, background: color }} />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all group relative overflow-hidden ${
        active
          ? "border-[var(--color-cyan)]/55 bg-[rgba(55,230,195,0.06)] shadow-[0_0_38px_-14px_rgba(55,230,195,0.45)]"
          : "border-[var(--color-line)] bg-[var(--color-panel)] hover:border-[var(--color-line2)] hover:-translate-y-px"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`font-display font-bold text-[20px] leading-none w-9 shrink-0 ${rank === 1 ? "text-[var(--color-amber)]" : "text-[var(--color-dim)]"}`}>
          {rank === 1 ? <IconCrown className="w-5 h-5 mb-0.5" /> : `#${rank}`}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: m.color }} />
            <span className="text-[14px] font-bold tracking-tight truncate">{m.name}</span>
            {m.open && <IconOpen className="w-3.5 h-3.5 text-[var(--color-dim)] shrink-0" />}
          </div>
          <p className="font-mono text-[10px] text-[var(--color-dim)] mt-0.5">
            {m.vendor} · {m.released}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-[15px] font-bold tabular-nums" style={{ color }}>{m.score.toFixed(1)}</p>
          <span
            className="inline-block font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] rounded px-1.5 py-0.5 mt-0.5"
            style={{ color, background: TIER_BG[tier] }}
          >
            classe {tier}
          </span>
        </div>
      </div>

      <div className="mt-2.5 ml-12 h-1 rounded-full bg-[var(--color-line)] overflow-hidden">
        <div className="h-full rounded-full score-in transition-all" style={{ width: `${m.score}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }} />
      </div>

      {!active && (
        <div className="mt-2 ml-12 flex items-center gap-3 font-mono text-[9.5px] text-[var(--color-dim)]">
          <span className="flex items-center gap-1"><IconBolt className="w-3 h-3" />{m.ttft}ms</span>
          <span className="flex items-center gap-1"><IconContext className="w-3 h-3" />{m.contextK >= 1000 ? `${m.contextK / 1000}M` : `${m.contextK}K`}</span>
          <span className="flex items-center gap-1"><IconCoins className="w-3 h-3" />${m.costOut}/1M</span>
        </div>
      )}

      {active && (
        <div className="mt-3.5 ml-12 fade-line">
          <div className="grid grid-cols-4 gap-2">
            {([
              ["raciocínio", m.breakdown.raciocinio],
              ["código", m.breakdown.codigo],
              ["velocidade", m.breakdown.velocidade],
              ["custo-benef.", m.breakdown.custo],
            ] as [string, number][]).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between font-mono text-[8.5px] uppercase tracking-wider text-[var(--color-dim)]">
                  <span>{k}</span><span className="text-[var(--color-mut)]">{v}</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--color-line)] mt-1 overflow-hidden">
                  <div className="h-full rounded-full score-in" style={{ width: `${v}%`, background: color, opacity: 0.85 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-[var(--color-mut)] leading-relaxed mt-3">{m.blurb}</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {m.tags.map((t) => (
              <span key={t} className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-mut)] border border-[var(--color-line2)] rounded px-1.5 py-0.5">{t}</span>
            ))}
            {m.reasoning && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-amber)] border border-[var(--color-amber)]/35 bg-[rgba(255,180,84,0.08)] rounded px-1.5 py-0.5">
                modo raciocínio
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
}

/* ---------------- mensagem ---------------- */

function AiMessage({ msg, onRegenerate, busy }: { msg: Msg; onRegenerate: () => void; busy: boolean }) {
  const [copied, setCopied] = useState(false);
  const m = msg.modelId ? modelById(msg.modelId) : MODELS[0];
  const tier = tierOf(m);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* silencioso */ }
  };

  return (
    <div className="fade-line flex gap-3.5">
      <div
        className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5"
        style={{ borderColor: `${m.color}55`, background: `${m.color}14`, color: m.color }}
      >
        <IconChip className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] font-bold" style={{ color: m.color }}>{m.name}</span>
          <span className="font-mono text-[8.5px] uppercase tracking-widest rounded px-1.5 py-0.5" style={{ color: TIER_COLOR[tier], background: TIER_BG[tier] }}>
            classe {tier}
          </span>
          {msg.status === "thinking" && (
            <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-[var(--color-amber)]">
              <span className="think-dot w-1 h-1 rounded-full bg-[var(--color-amber)] inline-block" />
              <span className="think-dot w-1 h-1 rounded-full bg-[var(--color-amber)] inline-block" style={{ animationDelay: "0.15s" }} />
              <span className="think-dot w-1 h-1 rounded-full bg-[var(--color-amber)] inline-block" style={{ animationDelay: "0.3s" }} />
              raciocinando…
            </span>
          )}
          {msg.status === "streaming" && (
            <span className="font-mono text-[9.5px] text-[var(--color-cyan)]">gerando…</span>
          )}
          {msg.status === "done" && msg.latencyMs !== undefined && (
            <span className="font-mono text-[9.5px] text-[var(--color-dim)]">
              {msg.thinkingMs ? `pensou ${(msg.thinkingMs / 1000).toFixed(1)}s · ` : ""}
              respondeu em {(msg.latencyMs / 1000).toFixed(1)}s · {msg.outTok} tok · US$ {msg.cost!.toFixed(4)}
            </span>
          )}
        </div>

        <div className="mt-2 text-[13.5px] leading-[1.75] text-[var(--color-ink)]/92 whitespace-pre-line">
          {msg.text}
          {msg.status !== "done" && msg.status !== "thinking" && (
            <span className="blink inline-block w-[7px] h-[15px] bg-[var(--color-cyan)] ml-0.5 align-[-2px]" />
          )}
        </div>

        {msg.status === "done" && (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-[var(--color-dim)] hover:text-[var(--color-cyan)] border border-[var(--color-line)] hover:border-[var(--color-cyan)]/40 rounded px-2 py-1 transition-colors"
            >
              {copied ? <IconCheck className="w-3 h-3 text-[var(--color-cyan)]" /> : <IconCopy className="w-3 h-3" />}
              {copied ? "copiado" : "copiar"}
            </button>
            <button
              onClick={onRegenerate}
              disabled={busy}
              className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-[var(--color-dim)] hover:text-[var(--color-amber)] border border-[var(--color-line)] hover:border-[var(--color-amber)]/40 rounded px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconRefresh className="w-3 h-3" /> regenerar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- painel principal ---------------- */

export function AILab() {
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [persona, setPersona] = useState<"analista" | "professor">("analista");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState({ tokens: 0, cost: 0, replies: 0, latencySum: 0 });

  const idRef = useRef(1);
  const timersRef = useRef<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const model = modelById(modelId);
  const tier = tierOf(model);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  const runInference = (question: string, m: LlmModel) => {
    const answer = buildAnswer(question, m, persona);
    const outTok = estimateTokens(answer);
    const inTok = estimateTokens(question) + (persona === "analista" ? 42 : 36);
    const cost = estimateCost(m, inTok, outTok);
    const thinkingMs = m.reasoning ? m.ttft + 1500 : m.ttft;
    const streamMs = Math.max(900, (outTok / m.tokSec) * 1000);
    const msgId = idRef.current++;
    const startedAt = performance.now();

    setMsgs((prev) => [
      ...prev,
      { id: msgId, role: "ai", text: "", modelId: m.id, status: m.reasoning ? "thinking" : "streaming", thinkingMs },
    ]);

    later(() => {
      setMsgs((prev) => prev.map((x) => (x.id === msgId ? { ...x, status: "streaming" as const } : x)));
      const perTick = Math.max(2, Math.round(answer.length / (streamMs / 28)));
      const iv = window.setInterval(() => {
        setMsgs((prev) =>
          prev.map((x) => {
            if (x.id !== msgId) return x;
            const next = x.text + answer.slice(x.text.length, x.text.length + perTick);
            return { ...x, text: next };
          })
        );
      }, 28);
      timersRef.current.push(iv as unknown as number);

      later(() => {
        clearInterval(iv);
        const latencyMs = performance.now() - startedAt;
        setMsgs((prev) =>
          prev.map((x) =>
            x.id === msgId ? { ...x, text: answer, status: "done" as const, latencyMs, outTok, cost } : x
          )
        );
        setSession((s) => ({
          tokens: s.tokens + inTok + outTok,
          cost: s.cost + cost,
          replies: s.replies + 1,
          latencySum: s.latencySum + latencyMs,
        }));
        setBusy(false);
      }, streamMs);
    }, thinkingMs);
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((prev) => [...prev, { id: idRef.current++, role: "user", text }]);
    setBusy(true);
    runInference(text, model);
    inputRef.current?.focus();
  };

  const regenerate = () => {
    if (busy) return;
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    const lastAiIdx = msgs.map((m) => m.role).lastIndexOf("ai");
    if (!lastUser || lastAiIdx === -1) return;
    setMsgs(msgs.slice(0, lastAiIdx));
    setBusy(true);
    runInference(lastUser.text, model);
  };

  const avgLatency = session.replies ? session.latencySum / session.replies / 1000 : 0;

  const stats = useMemo(
    () => [
      { Icon: IconChat, label: "respostas", value: String(session.replies) },
      { Icon: IconContext, label: "tokens", value: session.tokens.toLocaleString("pt-BR") },
      { Icon: IconCoins, label: "custo est.", value: `US$ ${session.cost.toFixed(4)}` },
      { Icon: IconGauge, label: "latência média", value: session.replies ? `${avgLatency.toFixed(1)}s` : "—" },
    ],
    [session, avgLatency]
  );

  return (
    <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-6 pb-16">
      {/* abertura característica: console de seleção */}
      <div className="pt-8 md:pt-10 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-cyan)] flex items-center gap-2">
            <IconChip className="w-3.5 h-3.5" /> ia lab · especialidade: modelos de linguagem
          </p>
          <h1 className="font-display font-bold text-[30px] md:text-[44px] leading-[1.04] tracking-[-0.02em] mt-3">
            Pergunte sobre IA.<br />
            <span className="text-[var(--color-mut)] font-light">Escolha quem responde.</span>
          </h1>
          <p className="text-[13.5px] md:text-[14.5px] text-[var(--color-mut)] leading-relaxed mt-3.5">
            Doze modelos ranqueados <b className="text-[var(--color-ink)] font-semibold">da melhor para a pior</b> — e o mesmo
            cérebro por trás de todos: um motor especializado em transformers, RAG, fine-tuning, agentes e produção de LLMs.
            Troque o modelo no meio da conversa e sinta a diferença de classe.
          </p>
        </div>
        <div className="flex gap-px bg-[var(--color-line)] rounded-xl overflow-hidden border border-[var(--color-line)]">
          {stats.map((s) => (
            <div key={s.label} className="bg-[var(--color-panel)] px-4 py-3 min-w-[96px]">
              <p className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[var(--color-dim)]">
                <s.Icon className="w-3 h-3" /> {s.label}
              </p>
              <p className="font-display font-bold text-[17px] tabular-nums mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[372px_1fr] gap-5 mt-7 items-start">
        {/* -------- ranking -------- */}
        <aside className="lg:sticky lg:top-5">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-mut)] flex items-center gap-2">
              <IconGauge className="w-3.5 h-3.5 text-[var(--color-cyan)]" /> ranking · melhor → pior
            </p>
            <span className="font-mono text-[9px] text-[var(--color-dim)]">índice composto simulado</span>
          </div>

          {/* trilho horizontal no mobile */}
          <div className="flex lg:hidden gap-2.5 overflow-x-auto pb-3 -mx-4 px-4">
            {MODELS.map((m, i) => (
              <ModelCard key={m.id} m={m} rank={i + 1} compact active={m.id === modelId} onSelect={() => setModelId(m.id)} />
            ))}
          </div>

          {/* coluna no desktop */}
          <div className="hidden lg:flex flex-col gap-2.5 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 pb-2">
            {MODELS.map((m, i) => (
              <ModelCard key={m.id} m={m} rank={i + 1} active={m.id === modelId} onSelect={() => setModelId(m.id)} />
            ))}
            <p className="font-mono text-[9px] text-[var(--color-dim)] leading-relaxed px-1 pt-1">
              * Benchmarks compostos simulados (raciocínio, código, velocidade, custo) para demonstração — meça com seus próprios casos antes de decidir.
            </p>
          </div>
        </aside>

        {/* -------- chat -------- */}
        <section className="card-static overflow-hidden flex flex-col h-[calc(100vh-9.5rem)] min-h-[540px] relative">
          <div className="scanline" />

          {/* barra do modelo ativo */}
          <div className="flex items-center gap-3 flex-wrap px-4 md:px-5 py-3 border-b border-[var(--color-line)] bg-[var(--color-void)]/55">
            <span className="w-2.5 h-2.5 rounded-full pulse-dot inline-block" style={{ background: model.color }} />
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold leading-tight truncate">
                {model.name}
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest ml-2 rounded px-1.5 py-0.5 align-[1px]" style={{ color: TIER_COLOR[tier], background: TIER_BG[tier] }}>
                  #{MODELS.indexOf(model) + 1} · classe {tier}
                </span>
              </p>
              <p className="font-mono text-[9.5px] text-[var(--color-dim)] mt-0.5">
                {model.tokSec} tok/s · ${model.costOut}/1M out · {model.contextK >= 1000 ? `${model.contextK / 1000}M` : `${model.contextK}K`} contexto
                {model.reasoning && <span className="text-[var(--color-amber)]"> · pensa antes de responder</span>}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-lg border border-[var(--color-line)] overflow-hidden">
                {(["analista", "professor"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPersona(p)}
                    className={`px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                      persona === p ? "bg-[rgba(55,230,195,0.13)] text-[var(--color-cyanhi)]" : "text-[var(--color-dim)] hover:text-[var(--color-mut)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMsgs([])}
                disabled={busy || !msgs.length}
                className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-dim)] hover:text-[var(--color-coral)] border border-[var(--color-line)] hover:border-[var(--color-coral)]/40 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <IconTrash className="w-3 h-3" /> limpar
              </button>
            </div>
          </div>

          {/* mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-7">
            {msgs.length === 0 && (
              <div className="h-full flex flex-col justify-center fade-line">
                <p className="font-mono text-[11px] text-[var(--color-dim)] flex items-center gap-2">
                  <span className="text-[var(--color-cyan)]">prompt_</span> sessão pronta · modelo {model.name} carregado
                  <span className="blink text-[var(--color-cyan)]">▍</span>
                </p>
                <h2 className="font-display font-bold text-[26px] md:text-[34px] tracking-[-0.02em] leading-tight mt-4 max-w-xl">
                  O que você quer entender <span className="text-[var(--color-cyan)]">sobre IA</span> hoje?
                </h2>
                <p className="text-[13px] text-[var(--color-mut)] mt-2.5 max-w-lg leading-relaxed">
                  Arquitetura, RAG, embeddings, fine-tuning, agentes, alucinações — tudo explicado no nível da classe do modelo que você escolher.
                </p>
                <div className="flex flex-wrap gap-2 mt-6 max-w-2xl">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="font-mono text-[11px] text-[var(--color-mut)] hover:text-[var(--color-cyanhi)] border border-[var(--color-line2)] hover:border-[var(--color-cyan)]/50 hover:bg-[rgba(55,230,195,0.06)] rounded-lg px-3 py-2 transition-all hover:-translate-y-px"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="fade-line flex justify-end">
                  <div className="max-w-[82%] rounded-xl rounded-tr-sm border border-[var(--color-line2)] bg-[var(--color-panel2)] px-4 py-2.5">
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <AiMessage key={msg.id} msg={msg} busy={busy} onRegenerate={regenerate} />
              )
            )}
          </div>

          {/* entrada */}
          <div className="border-t border-[var(--color-line)] bg-[var(--color-void)]/55 px-4 md:px-5 py-3.5">
            <div className={`flex items-end gap-2.5 rounded-xl border bg-[var(--color-panel)] px-3.5 py-2.5 transition-colors ${busy ? "border-[var(--color-line)]" : "border-[var(--color-line2)] focus-within:border-[var(--color-cyan)]/55"}`}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Pergunte ao ${model.name}…`}
                className="flex-1 bg-transparent resize-none text-[13.5px] leading-relaxed placeholder:text-[var(--color-dim)] focus:outline-none max-h-[120px]"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || busy}
                className="w-9 h-9 rounded-lg bg-[var(--color-cyan)] text-[#04211a] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-cyanhi)] hover:shadow-[0_8px_24px_-8px_rgba(55,230,195,0.6)] transition-all shrink-0"
                aria-label="Enviar"
              >
                {busy ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 ring-spin" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                ) : (
                  <IconSend className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="font-mono text-[9px] text-[var(--color-dim)]">
                Enter envia · Shift+Enter quebra linha · inferência <span className="text-[var(--color-amber)]">simulada localmente</span>
              </p>
              <p className="font-mono text-[9px] text-[var(--color-dim)] hidden sm:block">
                persona: <span className="text-[var(--color-mut)]">{persona === "analista" ? "analista de dados sênior" : "professor didático"}</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
