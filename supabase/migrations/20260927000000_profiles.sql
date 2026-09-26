-- Perfis, estatísticas e resultados do Filme do Dia.
-- O e-mail fica só em auth.users (nunca exposto); o perfil público tem apelido, nome e avatar.

create extension if not exists citext;

-- ---------- Perfis ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique
    check (username ~ '^[a-z0-9_]{3,20}$'),
  first_name text not null check (char_length(first_name) between 1 and 40),
  last_name text not null default '' check (char_length(last_name) <= 60),
  -- configuração do avatar DiceBear: { style, options }
  avatar jsonb not null default '{}'::jsonb check (pg_column_size(avatar) < 4096),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "perfis são públicos"
  on public.profiles for select
  using (true);

create policy "cada um cria o próprio perfil"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "cada um edita o próprio perfil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------- Estatísticas sincronizadas entre aparelhos ----------
create table public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- mesmo formato do localStorage: { "qef:stats": {...}, "qef:daily-stats": {...}, ... }
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 65536),
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

create policy "cada um vê as próprias estatísticas"
  on public.user_stats for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "cada um cria as próprias estatísticas"
  on public.user_stats for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cada um atualiza as próprias estatísticas"
  on public.user_stats for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------- Resultados do Filme do Dia (base para rankings) ----------
create table public.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  day integer not null check (day > 0),
  movie_id integer not null,
  score smallint not null check (score between 0 and 6),
  -- 'correct' | 'wrong' | 'skip' em ordem, para os quadradinhos do resultado
  results text[] not null check (array_length(results, 1) between 1 and 6),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_results enable row level security;

create policy "cada um vê os próprios resultados"
  on public.daily_results for select to authenticated
  using ((select auth.uid()) = user_id);

-- um resultado por dia, sem edição depois
create policy "cada um registra o próprio resultado"
  on public.daily_results for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------- updated_at automático ----------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger user_stats_touch before update on public.user_stats
  for each row execute function public.touch_updated_at();

-- ---------- Excluir a própria conta (LGPD) ----------
-- apaga o usuário em auth.users; o "on delete cascade" leva perfil, estatísticas e resultados
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
