/* Anthony.ia · camada Supabase
   ---------------------------------------------------------------
   Cliente único + helpers de dados. Local-first de verdade: sem as
   variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY os helpers são
   no-ops seguros e o app segue 100% funcional no navegador. Com elas,
   auth, perfis e datasets passam a viver no banco (com RLS). */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Credenciais do projeto conectado. A anon key é pública por design —
   a segurança real vem das políticas de RLS do schema.sql.
   Variáveis de ambiente (.env.local) têm prioridade sobre o padrão. */
const DEFAULT_URL = "https://tgfhytpfivmntynwrnog.supabase.co";
const DEFAULT_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZmh5dHBmaXZtbnR5bndybm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTk3MjgsImV4cCI6MjEwMzQzNTcyOH0.n2usF8cEJCY7uUQBXw5oIB5TwaQVJibnWLZZecEseJo";

const envUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
const url = envUrl || DEFAULT_URL;
const key = envKey || DEFAULT_KEY;

export const isSupabaseConfigured = /^https:\/\/.+\./.test(url) && key.length > 20;

/* diagnóstico visível: de onde veio a credencial (env ou embutida) */
export const credSource: "env" | "embutida" | "ausente" = !isSupabaseConfigured
  ? "ausente"
  : envUrl && envKey
    ? "env"
    : "embutida";

export const supabaseHost = isSupabaseConfigured ? new URL(url).host : null;

export const sb: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

/* ---------------- diagnóstico em dois estágios ----------------
   Estágio 1: o projeto responde e a chave é válida?  (rede / pausa / chave)
   Estágio 2: as tabelas do schema.sql existem?        (schema pendente)
   Assim o painel diz a causa exata — nunca um erro genérico. */

export type PingState = "connected" | "schema_pending" | "unreachable";

export interface PingResult {
  state: PingState;
  ms: number;
  detail?: string;
  raw?: string;
}

export async function ping(): Promise<PingResult> {
  if (!sb) return { state: "unreachable", ms: 0, detail: "modo local-first — nenhuma credencial neste bundle" };
  const t0 = performance.now();

  /* estágio 1 — API viva + chave aceita */
  try {
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key }, signal: ctl.signal });
    window.clearTimeout(timer);
    if (!res.ok) {
      const ms = Math.round(performance.now() - t0);
      if (res.status === 401 || res.status === 403) {
        return { state: "unreachable", ms, detail: `a chave anon foi recusada (HTTP ${res.status}) — confira se copiou a “anon public”, não a service_role.`, raw: `HTTP ${res.status}` };
      }
      return {
        state: "unreachable", ms,
        detail: res.status === 404 || res.status >= 500
          ? `o projeto respondeu HTTP ${res.status} — projetos gratuitos pausam após inatividade; se estiver pausado, clique em “Restore” no Dashboard.`
          : `o projeto respondeu HTTP ${res.status}.`,
        raw: `HTTP ${res.status}`,
      };
    }
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return {
      state: "unreachable", ms,
      detail: "a requisição não saiu deste ambiente — o preview/iframe pode estar bloqueando rede externa, ou o projeto está pausado. Abra o app em uma aba normal e reteste.",
      raw: e instanceof Error ? e.message : String(e),
    };
  }

  /* estágio 2 — tabelas do schema instaladas? */
  const q = await sb.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
  const ms = Math.round(performance.now() - t0);
  const err = q.error as { message?: string; code?: string } | null;
  if (!err) return { state: "connected", ms };
  const msg = err.message ?? "";
  const schemaMissing =
    err.code === "PGRST205" || err.code === "42P01" || err.code === "42501" ||
    /does not exist|schema cache|permission denied/i.test(msg);
  if (schemaMissing) {
    return {
      state: "schema_pending", ms,
      detail: /permission denied/i.test(msg)
        ? "as tabelas existem, mas sem permissão — rode o schema.sql de novo (ele aplica os grants do PostgREST)."
        : "projeto no ar e chave válida — só faltam as tabelas. Execute o supabase/schema.sql no SQL Editor.",
      raw: msg,
    };
  }
  return { state: "unreachable", ms, detail: msg, raw: msg };
}

export interface TableCounts {
  profiles: number | null;
  datasets: number | null;
}

export async function tableCounts(): Promise<TableCounts> {
  if (!sb) return { profiles: null, datasets: null };
  const [p, d] = await Promise.all([
    sb.from("profiles").select("id", { head: true, count: "exact" }).limit(1),
    sb.from("datasets").select("id", { head: true, count: "exact" }).limit(1),
  ]);
  return {
    profiles: p.error ? null : p.count,
    datasets: d.error ? null : d.count,
  };
}

/* ---------------- perfis ---------------- */

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  company: string | null;
  suggested_level: string;
}

export async function upsertProfile(p: ProfileRow): Promise<boolean> {
  if (!sb) return false;
  const { error } = await sb.from("profiles").upsert(p, { onConflict: "id" });
  return !error;
}

/* ---------------- datasets ---------------- */

export interface DatasetMeta {
  name: string;
  fileName: string | null;
  rowsOriginal: number;
  rowsClean: number;
  columns: number;
  quality: number;
  interventions: { label: string; count: number; kind: string }[];
  insights?: { title: string; detail: string; kind: string }[];
}

/* formato como o Postgres devolve (snake_case) */
export interface DatasetRow {
  id: string;
  name: string;
  file_name: string | null;
  rows_original: number;
  rows_clean: number;
  columns: number;
  quality: number;
  created_at: string;
}

export async function saveDatasetMeta(m: DatasetMeta): Promise<boolean> {
  if (!sb) return false;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return false;
  const { error } = await sb.from("datasets").insert({
    user_id: user.id,
    name: m.name,
    file_name: m.fileName,
    rows_original: m.rowsOriginal,
    rows_clean: m.rowsClean,
    columns: m.columns,
    quality: m.quality,
    interventions: m.interventions,
    insights: m.insights ?? [],
  });
  return !error;
}

export async function listDatasets(limit = 12): Promise<DatasetRow[] | null> {
  if (!sb) return null;
  const { data, error } = await sb
    .from("datasets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return error ? null : (data as DatasetRow[]);
}

/* ================= trilhas de mentoria (academy_progress) ================= */

export interface AcademyProgressRow {
  level: string;
  visited: string[];
  total_modules: number;
  updated_at: string;
}

export async function loadAcademyProgress(): Promise<AcademyProgressRow[]> {
  if (!sb) return [];
  const { data, error } = await sb
    .from("academy_progress")
    .select("level, visited, total_modules, updated_at");
  if (error) {
    console.warn("academy_progress indisponível:", error.message);
    return [];
  }
  return (data ?? []) as AcademyProgressRow[];
}

export async function saveAcademyProgress(
  level: string,
  visited: string[],
  totalModules: number
): Promise<boolean> {
  if (!sb) return false;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return false;
  const { error } = await sb.from("academy_progress").upsert(
    { user_id: user.id, level, visited, total_modules: totalModules },
    { onConflict: "user_id,level" }
  );
  return !error;
}
