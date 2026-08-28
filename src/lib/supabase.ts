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

/* ---------------- diagnóstico ---------------- */

export interface PingResult {
  ok: boolean;
  ms: number;
  error?: string;
}

export async function ping(): Promise<PingResult> {
  if (!sb) return { ok: false, ms: 0, error: "modo local-first" };
  const t0 = performance.now();
  const { error } = await sb.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
  const ms = Math.round(performance.now() - t0);
  if (!error) return { ok: true, ms };
  /* URL + chave funcionam, mas as tabelas ainda não existem:
     o usuário precisa rodar o supabase/schema.sql no SQL Editor */
  const msg = error.message ?? "";
  const schemaMissing = /does not exist|schema cache|PGRST205|PGRST202|permission denied|42P01|42501/i.test(msg);
  if (schemaMissing) {
    return { ok: true, ms, error: "tabelas ausentes — execute o supabase/schema.sql no SQL Editor" };
  }
  return { ok: false, ms, error: msg };
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
