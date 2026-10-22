-- Somente a Edge Function (service_role) acessa os dados. PIN nunca é público.
create schema if not exists cala_private;
revoke all on schema cala_private from public, anon, authenticated;
grant usage on schema cala_private to service_role;
create extension if not exists pgcrypto with schema extensions;

create table cala_private.players (
  name_key text primary key,
  display_name text not null check (char_length(display_name) between 1 and 24),
  pin_hash text not null,
  best_score integer not null check (best_score between 0 and 1800),
  best_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index players_ranking on cala_private.players (best_score desc, best_at, name_key);
create table cala_private.rate_buckets (
  bucket_key text not null,
  bucket_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  primary key (bucket_key, bucket_at)
);
create index rate_buckets_expiry on cala_private.rate_buckets (bucket_at);
alter table cala_private.players enable row level security;
alter table cala_private.rate_buckets enable row level security;
revoke all on all tables in schema cala_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema cala_private to service_role;

create function cala_private.allow_rate(p_key text, p_limit integer, p_seconds integer, p_hit boolean default true)
returns boolean language plpgsql volatile security invoker set search_path = '' as $$
declare b timestamptz; n integer;
begin
  b := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_seconds) * p_seconds);
  delete from cala_private.rate_buckets where bucket_at < now() - interval '1 day';
  if not p_hit then
    select attempts into n from cala_private.rate_buckets where bucket_key = p_key and bucket_at = b;
    return coalesce(n, 0) < p_limit;
  end if;
  insert into cala_private.rate_buckets(bucket_key, bucket_at, attempts) values (p_key, b, 1)
  on conflict (bucket_key, bucket_at) do update set attempts = least(cala_private.rate_buckets.attempts + 1, p_limit + 1)
  returning attempts into n;
  return n <= p_limit;
end;
$$;

create function public.cala_rank_list()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.position), '[]'::jsonb)
  from (
    select row_number() over(order by best_score desc, best_at, name_key) as position,
      display_name as name, name_key, best_score as score
    from cala_private.players order by best_score desc, best_at, name_key limit 50
  ) r;
$$;

create function public.cala_rank_inspect(p_name text, p_ip text)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare k text;
begin
  if p_name is null or char_length(p_name) not between 1 and 24 or p_ip is null or p_ip !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error', 'invalid_input');
  end if;
  if not cala_private.allow_rate('inspect:' || p_ip, 60, 60) then return jsonb_build_object('error','rate_limited'); end if;
  k := lower(normalize(p_name, NFKC));
  return jsonb_build_object('exists', exists(select 1 from cala_private.players where name_key = k));
end;
$$;

create function public.cala_rank_submit(p_name text, p_pin text, p_score integer, p_create boolean, p_ip text)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare k text; player cala_private.players%rowtype; existed boolean; improved boolean; pos bigint;
begin
  if p_name is null or char_length(p_name) not between 1 and 24 or p_pin is null or p_pin !~ '^[0-9]{4}$'
    or p_score is null or p_score not between 0 and 1800 or p_create is null or p_ip is null or p_ip !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error','invalid_input');
  end if;
  if not cala_private.allow_rate('submit:' || p_ip, 50, 600) then return jsonb_build_object('error','rate_limited'); end if;
  k := lower(normalize(p_name, NFKC));
  -- Serializa cadastro e atualização do mesmo nome, inclusive em requisições simultâneas.
  perform pg_advisory_xact_lock(hashtextextended(k, 3719));
  select * into player from cala_private.players where name_key = k for update;
  existed := found;
  if existed then
    if p_create then return jsonb_build_object('error','name_taken'); end if;
    if not cala_private.allow_rate('pin:' || k, 6, 600, false) then return jsonb_build_object('error','rate_limited'); end if;
    if extensions.crypt(p_pin, player.pin_hash) <> player.pin_hash then
      perform cala_private.allow_rate('pin:' || k, 6, 600);
      return jsonb_build_object('error','wrong_pin');
    end if;
    delete from cala_private.rate_buckets where bucket_key = 'pin:' || k;
    improved := p_score > player.best_score;
    if improved then
      update cala_private.players set best_score = p_score, best_at = clock_timestamp() where name_key = k
      returning * into player;
    end if;
  else
    if not p_create then return jsonb_build_object('error','new_name'); end if;
    if not cala_private.allow_rate('create:' || p_ip, 10, 600) then return jsonb_build_object('error','rate_limited'); end if;
    insert into cala_private.players(name_key, display_name, pin_hash, best_score)
      values(k, p_name, extensions.crypt(p_pin, extensions.gen_salt('bf',10)), p_score) returning * into player;
    improved := true;
  end if;
  select count(*) + 1 into pos from cala_private.players
    where best_score > player.best_score or (best_score = player.best_score and (best_at, name_key) < (player.best_at, player.name_key));
  return jsonb_build_object('created',not existed,'improved',improved,'name',player.display_name,'name_key',k,
    'best',player.best_score,'position',pos,'rows',public.cala_rank_list());
end;
$$;

revoke all on all functions in schema cala_private from public, anon, authenticated;
grant execute on all functions in schema cala_private to service_role;
revoke all on function public.cala_rank_list() from public, anon, authenticated;
revoke all on function public.cala_rank_inspect(text,text) from public, anon, authenticated;
revoke all on function public.cala_rank_submit(text,text,integer,boolean,text) from public, anon, authenticated;
grant execute on function public.cala_rank_list() to service_role;
grant execute on function public.cala_rank_inspect(text,text) to service_role;
grant execute on function public.cala_rank_submit(text,text,integer,boolean,text) to service_role;
