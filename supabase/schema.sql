-- ============================================================================
--  Anthony.ia · Schema completo do banco — pronto para integrar o sistema
-- ----------------------------------------------------------------------------
--  Como rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run
--  Idempotente: pode executar de novo sem duplicar tabelas, políticas ou gatilhos.
--
--  O que este script cria:
--    1. profiles           → espelha auth.users (nome, função, empresa, trilha)
--    2. datasets           → cada análise feita no Console (com auditoria da limpeza)
--    3. academy_progress   → progresso das trilhas júnior / pleno / sênior
--    4. mentor_messages    → histórico do chat do mentor
--    5. RLS em tudo        → cada usuário só enxerga o que é seu
--    6. Gatilhos           → perfil automático no signup + updated_at automático
--    7. Índices            → consultas rápidas + GIN nos JSONB
--    8. Storage            → bucket privado para os arquivos brutos
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0) Extensões
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;    -- gen_random_uuid()
create extension if not exists pg_trgm;     -- busca por similaridade de texto


-- ----------------------------------------------------------------------------
-- 1) Domínios de validação (espelham os enums do frontend)
-- ----------------------------------------------------------------------------
do $$ begin
  create domain public.app_role as text
    check (value in ('estagio', 'analista', 'bi', 'engenharia', 'cientista', 'gestao'));
exception when duplicate_object then null; end $$;

do $$ begin
  create domain public.app_level as text
    check (value in ('junior', 'pleno', 'senior'));
exception when duplicate_object then null; end $$;


-- ----------------------------------------------------------------------------
-- 2) profiles — quem é o usuário (estende o auth.users nativo)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null default '',
  email           text not null,
  role            public.app_role not null default 'analista',
  company         text,
  suggested_level public.app_level not null default 'junior',
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.profiles is 'Perfil do usuário: função na empresa e trilha de mentoria sugerida.';


-- ----------------------------------------------------------------------------
-- 3) datasets — cada análise executada no Console (auditoria completa)
-- ----------------------------------------------------------------------------
create table if not exists public.datasets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  file_name       text,
  rows_original   integer not null default 0 check (rows_original >= 0),
  rows_clean      integer not null default 0 check (rows_clean >= 0),
  columns         integer not null default 0 check (columns >= 0),
  quality         integer not null default 0 check (quality between 0 and 100),
  interventions   jsonb not null default '[]'::jsonb,   -- duplicatas, nulos, outliers…
  insights        jsonb not null default '[]'::jsonb,   -- leituras automáticas do motor
  created_at      timestamptz not null default now()
);

comment on table public.datasets is 'Análises do Console: metadados + registro de limpeza em JSONB.';


-- ----------------------------------------------------------------------------
-- 4) academy_progress — trilhas de mentoria por nível
-- ----------------------------------------------------------------------------
create table if not exists public.academy_progress (
  user_id       uuid not null references auth.users (id) on delete cascade,
  level         public.app_level not null,
  visited       text[] not null default '{}',          -- ids dos módulos visitados
  total_modules integer not null default 6,
  updated_at    timestamptz not null default now(),
  primary key (user_id, level)
);


-- ----------------------------------------------------------------------------
-- 5) mentor_messages — histórico do chat com o mentor
-- ----------------------------------------------------------------------------
create table if not exists public.mentor_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  level      public.app_level not null default 'junior',
  role       text not null check (role in ('user', 'mentor')),
  content    text not null,
  module_id  text,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 6) Row Level Security — a regra de ouro: cada usuário só vê o que é seu
-- ----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.profiles         force  row level security;
alter table public.datasets         enable row level security;
alter table public.datasets         force  row level security;
alter table public.academy_progress enable row level security;
alter table public.academy_progress force  row level security;
alter table public.mentor_messages  enable row level security;
alter table public.mentor_messages  force  row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- datasets (uma política cobre leitura + escrita do próprio)
drop policy if exists "datasets_all_own" on public.datasets;
create policy "datasets_all_own" on public.datasets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- academy_progress
drop policy if exists "progress_all_own" on public.academy_progress;
create policy "progress_all_own" on public.academy_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mentor_messages
drop policy if exists "messages_all_own" on public.mentor_messages;
create policy "messages_all_own" on public.mentor_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 7) Permissões do PostgREST (sem isso o app não enxerga as tabelas)
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.profiles, public.datasets, public.academy_progress, public.mentor_messages
  to authenticated;
grant usage on sequence public.mentor_messages_id_seq to authenticated;

-- camada anônima nunca toca nas tabelas de usuário
revoke all on public.profiles, public.datasets, public.academy_progress, public.mentor_messages
  from anon;


-- ----------------------------------------------------------------------------
-- 8) Índices (consultas rápidas + GIN nos JSONB)
-- ----------------------------------------------------------------------------
create index if not exists datasets_user_created_idx
  on public.datasets (user_id, created_at desc);

create index if not exists datasets_interventions_gin
  on public.datasets using gin (interventions jsonb_path_ops);

create index if not exists datasets_insights_gin
  on public.datasets using gin (insights jsonb_path_ops);

create index if not exists messages_user_level_idx
  on public.mentor_messages (user_id, level, created_at desc);

create index if not exists profiles_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);


-- ----------------------------------------------------------------------------
-- 9) Gatilho 1 — cria o perfil automaticamente no signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, company, suggested_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'analista'),
    new.raw_user_meta_data ->> 'company',
    coalesce(new.raw_user_meta_data ->> 'suggested_level', 'junior')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 10) Gatilho 2 — updated_at automático no progresso das trilhas
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_progress_touch on public.academy_progress;
create trigger academy_progress_touch
  before update on public.academy_progress
  for each row execute function public.touch_updated_at();


-- ----------------------------------------------------------------------------
-- 11) RPC — atualiza last_seen_at (chamada pelo app a cada login)
-- ----------------------------------------------------------------------------
create or replace function public.bump_last_seen()
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

grant execute on function public.bump_last_seen() to authenticated;


-- ----------------------------------------------------------------------------
-- 12) Storage — bucket privado para os arquivos brutos (upload opcional)
--     Convenção de caminho: {user_id}/{arquivo} — as políticas garantem o isolamento
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('datasets_raw', 'datasets_raw', false)
on conflict (id) do nothing;

drop policy if exists "raw_insert_own" on storage.objects;
create policy "raw_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'datasets_raw'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "raw_select_own" on storage.objects;
create policy "raw_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'datasets_raw'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "raw_delete_own" on storage.objects;
create policy "raw_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'datasets_raw'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ----------------------------------------------------------------------------
-- 13) Verificação final — o que acabou de ser criado
-- ----------------------------------------------------------------------------
select 'profiles'          as tabela, count(*) as linhas from public.profiles
union all
select 'datasets',                count(*) from public.datasets
union all
select 'academy_progress',        count(*) from public.academy_progress
union all
select 'mentor_messages',         count(*) from public.mentor_messages;


-- ----------------------------------------------------------------------------
-- Extras: consultas úteis para um dashboard futuro
-- ----------------------------------------------------------------------------
-- Minhas análises recentes com score de qualidade:
--   select d.name, d.quality, d.rows_clean, d.rows_original, d.created_at
--   from public.datasets d
--   where d.user_id = auth.uid()
--   order by d.created_at desc
--   limit 20;
--
-- Quem mais limpa dados na empresa (ranking de uso):
--   select p.full_name, count(d.id) as analises, avg(d.quality)::int as qualidade_media
--   from public.profiles p
--   left join public.datasets d on d.user_id = p.id
--   group by p.id, p.full_name
--   order by analises desc;
