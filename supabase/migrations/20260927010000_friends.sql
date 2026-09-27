-- Amizades (pedido → aceite) e ranking do Filme do Dia entre amigos.

create table public.friendships (
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- um único vínculo por par, não importa quem pediu
create unique index friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index friendships_addressee_idx on public.friendships (addressee);

alter table public.friendships enable row level security;

create policy "cada um vê as próprias amizades"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester, addressee));

create policy "cada um envia pedidos em nome próprio"
  on public.friendships for insert to authenticated
  with check ((select auth.uid()) = requester and status = 'pending');

-- só quem recebeu o pedido pode aceitar
create policy "destinatário aceita o pedido"
  on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee)
  with check ((select auth.uid()) = addressee and status = 'accepted');

-- qualquer um dos dois desfaz (recusar, cancelar ou remover amigo)
create policy "cada um desfaz as próprias amizades"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester, addressee));

-- no update, só o status pode mudar (não dá para trocar quem pediu ou quem recebeu)
revoke update on public.friendships from authenticated;
grant update (status) on public.friendships to authenticated;

-- ---------- Ranking ----------
-- Resultados do Filme do Dia de quem chama + amigos aceitos, entre os dias pedidos.
-- Não expõe movie_id: ver o resultado de um amigo não entrega o filme do dia.
-- Quem ainda não jogou no período aparece com day/score nulos.
create function public.friends_ranking(p_from integer, p_to integer)
returns table (
  user_id uuid,
  username citext,
  first_name text,
  avatar jsonb,
  day integer,
  score smallint,
  results text[]
)
language sql stable security definer set search_path = '' as $$
  with me as (
    select auth.uid() as id
  ),
  circle as (
    select me.id from me where me.id is not null
    union
    select case when f.requester = me.id then f.addressee else f.requester end
    from public.friendships f, me
    where f.status = 'accepted' and me.id in (f.requester, f.addressee)
  )
  select p.id, p.username, p.first_name, p.avatar, r.day, r.score, r.results
  from circle c
  join public.profiles p on p.id = c.id
  left join public.daily_results r
    on r.user_id = c.id and r.day between p_from and p_to
  where p_to - p_from <= 366;
$$;

revoke execute on function public.friends_ranking(integer, integer) from public, anon;
grant execute on function public.friends_ranking(integer, integer) to authenticated;
