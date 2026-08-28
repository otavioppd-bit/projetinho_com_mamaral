import { useCallback, useEffect, useState } from "react";
import {
  credSource, isSupabaseConfigured, listDatasets, ping, supabaseHost, tableCounts,
  type DatasetRow, type PingResult, type TableCounts,
} from "../lib/supabase";
import { authMode } from "../lib/auth";
import { IconRefresh, IconX } from "./icons";

/* ================= painel "banco de dados" ================= */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-dim)] mb-2.5">{children}</p>
  );
}

function CodeSnippet({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-void)] overflow-hidden">
      <pre className="font-mono text-[10.5px] leading-[1.7] px-3.5 py-3 overflow-x-auto text-[var(--color-mut)]">
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre">
            <span className="select-none text-[var(--color-dim)] mr-3">{String(i + 1).padStart(2, "0")}</span>
            {l.startsWith("#") || l.startsWith("--") ? (
              <span className="text-[var(--color-dim)]">{l}</span>
            ) : (
              <span className="text-[var(--color-tealhi)]/90">{l}</span>
            )}
          </div>
        ))}
      </pre>
    </div>
  );
}

function QualityBadge({ q }: { q: number }) {
  const color = q >= 90 ? "var(--color-teal)" : q >= 75 ? "var(--color-amber)" : "var(--color-coral)";
  return (
    <span className="font-mono text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      {q}
    </span>
  );
}

export function DataPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [checking, setChecking] = useState(false);
  const [pingRes, setPingRes] = useState<PingResult | null>(null);
  const [counts, setCounts] = useState<TableCounts | null>(null);
  const [datasets, setDatasets] = useState<DatasetRow[] | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setChecking(true);
    const p = await ping();
    setPingRes(p);
    if (p.state === "connected") {
      const [c, d] = await Promise.all([tableCounts(), listDatasets()]);
      setCounts(c);
      setDatasets(d);
    } else {
      setCounts(null);
      setDatasets(null);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const connected = isSupabaseConfigured;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[rgba(3,6,12,0.72)] backdrop-in" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-[min(430px,100vw)] border-l border-[var(--color-line2)] bg-[var(--color-panel)] drawer-in overflow-y-auto">
        {/* cabeçalho */}
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-[var(--color-line)] bg-[var(--color-panel)]/95 backdrop-blur flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full inline-block ${connected ? "bg-[var(--color-teal)] pulse-dot" : "bg-[var(--color-amber)]"}`} />
          <div className="flex-1">
            <p className="font-display font-bold text-[16px] tracking-tight leading-none">Banco de dados</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-dim)] mt-1">
              {connected
                ? `supabase · ${supabaseHost} · credencial ${credSource === "env" ? "do .env" : "embutida no bundle"}`
                : "modo local-first · sem credencial neste bundle"}
            </p>
          </div>
          {connected && (
            <button
              onClick={() => void refresh()}
              className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-mut)] hover:text-[var(--color-tealhi)] border border-[var(--color-line2)] hover:border-[var(--color-teal)]/40 rounded px-2 py-1.5 flex items-center gap-1.5 transition-colors"
            >
              <IconRefresh className={`w-3 h-3 ${checking ? "ring-spin" : ""}`} /> re-testar
            </button>
          )}
          <button onClick={onClose} className="text-[var(--color-dim)] hover:text-[var(--color-ink)] transition-colors p-1" aria-label="Fechar">
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {connected ? (
            <>
              {/* status da conexão */}
              <section>
                <SectionTitle>conexão</SectionTitle>
                <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel2)] p-4">
                  {checking && !pingRes ? (
                    <p className="font-mono text-[11px] text-[var(--color-mut)] flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 ring-spin" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M12 3a9 9 0 1 0 9 9" />
                      </svg>
                      consultando o projeto…
                    </p>
                  ) : pingRes?.ok && !pingRes.error ? (
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-[26px] text-[var(--color-tealhi)] tabular-nums">{pingRes.ms}ms</span>
                      <div>
                        <p className="text-[12.5px] font-semibold text-[var(--color-teal)]">conectado · auth + RLS ativos</p>
                        <p className="font-mono text-[9.5px] text-[var(--color-dim)] mt-0.5">round-trip real contra o Postgres gerenciado</p>
                      </div>
                    </div>
                  ) : pingRes?.ok && pingRes.error ? (
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-[26px] text-[var(--color-amber)] tabular-nums">{pingRes.ms}ms</span>
                      <div>
                        <p className="text-[12.5px] font-semibold text-[var(--color-amber)]">projeto conectado · schema pendente</p>
                        <p className="font-mono text-[9.5px] text-[var(--color-mut)] mt-0.5 leading-relaxed">{pingRes.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[12.5px] font-semibold text-[var(--color-coral)]">falha na conexão</p>
                      <p className="font-mono text-[10px] text-[var(--color-mut)] mt-1 leading-relaxed">
                        {pingRes?.error ?? "sem resposta"} — confira as chaves no .env.local e se o schema.sql foi executado.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2.5 mt-4">
                    {([
                      ["profiles", counts?.profiles],
                      ["datasets", counts?.datasets],
                    ] as [string, number | null | undefined][]).map(([t, n]) => (
                      <div key={t} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-void)] px-3 py-2.5">
                        <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[var(--color-dim)]">{t}</p>
                        <p className="font-display font-bold text-[19px] tabular-nums mt-0.5">
                          {n === null || n === undefined ? "—" : n}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* datasets persistidos */}
              <section>
                <SectionTitle>análises salvas no banco</SectionTitle>
                {datasets === null ? (
                  <p className="font-mono text-[10.5px] text-[var(--color-mut)]">carregando…</p>
                ) : datasets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-line2)] px-4 py-5 text-center">
                    <p className="text-[12.5px] text-[var(--color-mut)]">Nenhuma análise salva ainda.</p>
                    <p className="font-mono text-[10px] text-[var(--color-dim)] mt-1">
                      Rode um dataset no Console — o resultado é gravado aqui automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {datasets.map((d) => (
                      <div key={d.id} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel2)] px-3.5 py-3 flex items-center gap-3 hover:border-[var(--color-line2)] transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-semibold truncate">{d.name}</p>
                          <p className="font-mono text-[9.5px] text-[var(--color-dim)] mt-0.5">
                            {new Date(d.created_at).toLocaleDateString("pt-BR")} · {d.rows_clean.toLocaleString("pt-BR")}/{d.rows_original.toLocaleString("pt-BR")} linhas · {d.columns} colunas
                          </p>
                        </div>
                        <QualityBadge q={d.quality} />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <SectionTitle>como foi montado</SectionTitle>
                <p className="text-[12px] text-[var(--color-mut)] leading-relaxed">
                  Auth nativo do Supabase (e-mail/senha + refresh token), tabelas{" "}
                  <span className="font-mono text-[11px] text-[var(--color-tealhi)]">profiles</span> e{" "}
                  <span className="font-mono text-[11px] text-[var(--color-tealhi)]">datasets</span> com
                  Row Level Security — cada usuário só lê o que é seu. Schema completo em{" "}
                  <span className="font-mono text-[11px] text-[var(--color-ink)]">supabase/schema.sql</span>.
                </p>
              </section>
            </>
          ) : (
            <>
              {/* guia de conexão */}
              <section>
                <SectionTitle>status</SectionTitle>
                <div className="rounded-xl border border-[var(--color-amber)]/30 bg-[rgba(255,180,84,0.06)] p-4">
                  <p className="text-[13px] font-semibold text-[var(--color-amber)]">Rodando local-first</p>
                  <p className="text-[12px] text-[var(--color-mut)] mt-1 leading-relaxed">
                    Sessão e contas vivem neste navegador e tudo funciona offline. Para plugar um
                    banco real, conecte um projeto Supabase em 3 passos — o código já está pronto
                    nos dois modos.
                  </p>
                </div>
              </section>

              <section>
                <SectionTitle>passo 1 · crie o projeto</SectionTitle>
                <p className="text-[12px] text-[var(--color-mut)] leading-relaxed mb-2.5">
                  Em <span className="font-mono text-[11px] text-[var(--color-ink)]">supabase.com</span> → New project.
                  Depois, no SQL Editor, rode o arquivo{" "}
                  <span className="font-mono text-[11px] text-[var(--color-tealhi)]">supabase/schema.sql</span>{" "}
                  deste repositório — ele cria as tabelas, as políticas de RLS e o trigger de perfil.
                </p>
              </section>

              <section>
                <SectionTitle>passo 2 · adicione as chaves</SectionTitle>
                <CodeSnippet
                  lines={[
                    "# .env.local (na raiz do projeto)",
                    "VITE_SUPABASE_URL=https://seu-projeto.supabase.co",
                    "VITE_SUPABASE_ANON_KEY=sua-anon-key",
                  ]}
                />
                <p className="font-mono text-[9.5px] text-[var(--color-dim)] mt-2 leading-relaxed">
                  Dashboard → Project Settings → API. A anon key é pública por design — a segurança
                  vem das políticas de RLS.
                </p>
              </section>

              <section>
                <SectionTitle>passo 3 · reinicie o dev server</SectionTitle>
                <CodeSnippet lines={["npm run dev"]} />
                <p className="text-[12px] text-[var(--color-mut)] mt-2.5 leading-relaxed">
                  O app detecta as variáveis, este painel vira <b className="text-[var(--color-tealhi)]">supabase conectado</b>,
                  o login passa a usar o Auth real e cada análise do Console é gravada na tabela{" "}
                  <span className="font-mono text-[11px] text-[var(--color-tealhi)]">datasets</span>.
                </p>
              </section>

              <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel2)] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-dim)] mb-2">modo atual</p>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-amber)] inline-block" />
                  <p className="text-[12.5px] text-[var(--color-mut)]">
                    transporte: <b className="text-[var(--color-ink)]">{authMode}</b> · contas deste navegador · zero configuração
                  </p>
                </div>
                <p className="font-mono text-[9.5px] text-[var(--color-dim)] mt-2.5 leading-relaxed border-t border-[var(--color-line)] pt-2.5">
                  diagnóstico: nenhuma credencial Supabase foi encontrada neste bundle. Se o projeto já
                  foi conectado, você está vendo um build desatualizado — rode{" "}
                  <span className="text-[var(--color-tealhi)]">npm run build</span> e recarregue com{" "}
                  <span className="text-[var(--color-tealhi)]">Ctrl/Cmd + Shift + R</span>.
                </p>
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
