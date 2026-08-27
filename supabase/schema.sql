-- ============================================================
-- Anthony.ia · Schema Supabase
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query)
-- ============================================================

-- 1) Perfis de usuário — estende o auth.users nativo
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null default '',
  email           text not null,
  role            text not null default 'analista',   -- analista | cientista | engenheiro | gestor | estudante
  company         text,
  suggested_level text not null default 'junior',     -- trilha de mentoria sugerida
  created_at      timestamptz not null default now()
);

-- 2) Datasets analisados no console (metadados auditáveis)
create table if not exists public.datasets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  file_name     text,
  rows_original int  not null default 0,
  rows_clean    int  not null default 0,
  columns       int  not null default 0,
  quality       int  not null default 0,              -- score 0–100 do motor de limpeza
  interventions jsonb not null default '[]'::jsonb,   -- registro de limpeza (duplicatas, nulos, outliers)
  created_at    timestamptz not null default now()
);

-- 3) Row Level Security — cada usuário só enxerga o que é seu
alter table public.profiles enable row level security;
alter table public.datasets enable row level security;

create policy "profiles · ler o próprio"      on public.profiles for select using (auth.uid() = id);
create policy "profiles · inserir o próprio"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles · atualizar o próprio" on public.profiles for update using (auth.uid() = id);

create policy "datasets · CRUD do próprio"    on public.datasets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Índices
create index if not exists datasets_user_created_idx
  on public.datasets (user_id, created_at desc);

-- 5) (Opcional) função para espelhar o usuário em profiles via trigger
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
