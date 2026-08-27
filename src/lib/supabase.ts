/* Anthony.ia · camada Supabase
   ---------------------------------------------------------------
   Cliente único + helpers de dados. Local-first de verdade: sem as
   variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY os helpers são
   no-ops seguros e o app segue 100% funcional no navegador. Com elas,
   auth, perfis e datasets passam a viver no banco (com RLS). */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const isSupabaseConfigured = /^https:\/\/.+\./.test(url) && key.length > 20;

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
  return error ? { ok: false, ms, error: error.message } : { ok: true, ms };
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
