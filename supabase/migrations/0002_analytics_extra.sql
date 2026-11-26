-- Amplia analytics_summary com: periodo anterior, cliques de contato, cliques por Reel e ultimas visitas.
-- Mantem todos os campos da versao anterior; o painel ignora os novos se esta migracao nao foi aplicada.
create or replace function public.analytics_summary(days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d integer := greatest(days, 1);
  since timestamptz := now() - make_interval(days => d);
  prev_since timestamptz := now() - make_interval(days => d * 2);
  day_start timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  yesterday_start timestamptz := day_start - interval '1 day';
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'views', (select count(*) from events where type = 'view' and created_at >= since),
    'visitors', (select count(distinct visitor_id) from events where type = 'view' and created_at >= since),
    'visitors_today', (select count(distinct visitor_id) from events where type = 'view' and created_at >= day_start),
    'visitors_yesterday', (select count(distinct visitor_id) from events where type = 'view' and created_at >= yesterday_start and created_at < day_start),
    'clicks', (select count(*) from events where type in ('click', 'video_play') and created_at >= since),
    'prev', jsonb_build_object(
      'views', (select count(*) from events where type = 'view' and created_at >= prev_since and created_at < since),
      'visitors', (select count(distinct visitor_id) from events where type = 'view' and created_at >= prev_since and created_at < since),
      'clicks', (select count(*) from events where type in ('click', 'video_play') and created_at >= prev_since and created_at < since)
    ),
    'contact', jsonb_build_object(
      'email', (select count(*) from events where type = 'click' and target = 'email' and created_at >= since),
      'instagram', (select count(*) from events where type = 'click' and target = 'instagram' and created_at >= since),
      'tiktok', (select count(*) from events where type = 'click' and target = 'tiktok' and created_at >= since)
    ),
    'reels', coalesce((
      select jsonb_agg(r order by r.plays desc)
      from (
        select target, count(*) as plays, count(distinct visitor_id) as visitors
        from events where type = 'video_play' and created_at >= since
        group by target order by count(*) desc limit 10
      ) r), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(r order by r.created_at desc)
      from (
        select created_at, coalesce(source, 'direto') as source, coalesce(device, 'desktop') as device
        from events where type = 'view' order by created_at desc limit 15
      ) r), '[]'::jsonb),
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
