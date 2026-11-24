-- Helayne: painel /feca (login, conteudo editavel, midia ordenavel, contador de visitas)
-- Rodar uma vez no SQL Editor do projeto Supabase.

-- ---------- admin ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admin le o proprio registro" on public.admins;
create policy "admin le o proprio registro" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- ---------- textos, metricas e links (chave -> json) ----------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;

drop policy if exists "leitura publica das configuracoes" on public.site_settings;
create policy "leitura publica das configuracoes" on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists "admin escreve configuracoes" on public.site_settings;
create policy "admin escreve configuracoes" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- midia (fotos e videos) com ordem ----------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('photo', 'video')),
  section text not null default 'gallery',
  path text not null,
  poster_path text,
  reel_url text,
  title text,
  alt text,
  position integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists media_section_position_idx on public.media (section, position);
alter table public.media enable row level security;

drop policy if exists "leitura publica da midia publicada" on public.media;
create policy "leitura publica da midia publicada" on public.media
  for select to anon, authenticated using (published = true);

drop policy if exists "admin gerencia midia" on public.media;
create policy "admin gerencia midia" on public.media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- visitas e cliques ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  type text not null check (type in ('view', 'click', 'video_play')),
  target text check (char_length(target) <= 200),
  path text check (char_length(path) <= 200),
  referrer text check (char_length(referrer) <= 300),
  source text check (char_length(source) <= 40),
  device text check (device in ('mobile', 'tablet', 'desktop'))
);
create index if not exists events_created_at_idx on public.events (created_at desc);
alter table public.events enable row level security;

drop policy if exists "qualquer visitante registra evento" on public.events;
create policy "qualquer visitante registra evento" on public.events
  for insert to anon, authenticated with check (true);

drop policy if exists "admin le eventos" on public.events;
create policy "admin le eventos" on public.events
  for select to authenticated using (public.is_admin());

-- resumo para o painel (so admin)
create or replace function public.analytics_summary(days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - make_interval(days => greatest(days, 1));
  day_start timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'views', (select count(*) from events where type = 'view' and created_at >= since),
    'visitors', (select count(distinct visitor_id) from events where type = 'view' and created_at >= since),
    'visitors_today', (select count(distinct visitor_id) from events where type = 'view' and created_at >= day_start),
    'clicks', (select count(*) from events where type in ('click', 'video_play') and created_at >= since),
    'by_day', coalesce((
      select jsonb_agg(r order by r.day)
      from (
        select (created_at at time zone 'America/Sao_Paulo')::date as day,
               count(*) filter (where type = 'view') as views,
               count(distinct visitor_id) filter (where type = 'view') as visitors
        from events where created_at >= since group by 1
      ) r), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(r order by r.visitors desc)
      from (
        select coalesce(source, 'direto') as source, count(distinct visitor_id) as visitors
        from events where type = 'view' and created_at >= since group by 1
      ) r), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(r order by r.visitors desc)
      from (
        select coalesce(device, 'desktop') as device, count(distinct visitor_id) as visitors
        from events where type = 'view' and created_at >= since group by 1
      ) r), '[]'::jsonb),
    'top_targets', coalesce((
      select jsonb_agg(r order by r.total desc)
      from (
        select type, target, count(*) as total
        from events where type in ('click', 'video_play') and created_at >= since
        group by type, target order by count(*) desc limit 10
      ) r), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.analytics_summary(integer) from public;
grant execute on function public.analytics_summary(integer) to authenticated;

-- ---------- armazenamento de fotos e videos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin lista midia" on storage.objects;
create policy "admin lista midia" on storage.objects
  for select to authenticated using (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin envia midia" on storage.objects;
create policy "admin envia midia" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin troca midia" on storage.objects;
create policy "admin troca midia" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin apaga midia" on storage.objects;
create policy "admin apaga midia" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());
