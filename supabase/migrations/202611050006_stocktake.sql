begin;

create type public.stocktake_status as enum ('open', 'closed');
create type public.stocktake_origin as enum ('snapshot', 'extra');
create type public.stocktake_result as enum ('unchecked', 'found', 'missing');

create table public.stocktake_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  room_name_snapshot text not null,
  status public.stocktake_status not null default 'open',
  opened_by uuid not null references public.profiles(id),
  opened_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  check (num_nonnulls(closed_by, closed_at) = case when status = 'closed' then 2 else 0 end)
);

create unique index stocktake_one_open_room on public.stocktake_sessions (room_id) where status = 'open';
create index stocktake_sessions_recent on public.stocktake_sessions (status, opened_at desc, id);

create table public.stocktake_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.stocktake_sessions(id),
  asset_id uuid not null references public.assets(id),
  origin public.stocktake_origin not null,
  asset_code_snapshot text not null,
  asset_name_snapshot text not null,
  recorded_room_id uuid not null references public.rooms(id),
  recorded_room_name text not null,
  recorded_condition public.asset_condition not null,
  result public.stocktake_result not null default 'unchecked',
  observed_condition public.asset_condition,
  checked_by uuid references public.profiles(id),
  checked_at timestamptz,
  notes text check (char_length(notes) <= 500),
  unique (session_id, asset_id),
  check ((observed_condition is not null) = (result = 'found')),
  check (num_nonnulls(checked_by, checked_at) = case when result = 'unchecked' then 0 else 2 end),
  check (origin = 'snapshot' or result = 'found')
);

alter table public.stocktake_sessions enable row level security;
alter table public.stocktake_items enable row level security;
revoke all on public.stocktake_sessions, public.stocktake_items from public, anon, authenticated, service_role;
grant select on public.stocktake_sessions, public.stocktake_items to authenticated, service_role;
create policy stocktake_admin_sessions on public.stocktake_sessions for select to authenticated
using ((select public.inventory_is_admin()));
create policy stocktake_admin_items on public.stocktake_items for select to authenticated
using ((select public.inventory_is_admin()));

create function public.stocktake_open(target_room uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  session_id uuid;
  room_name text;
begin
  if not public.inventory_is_admin() then raise exception 'stocktake_forbidden'; end if;

  -- Serialize opening and room master edits. A repeated submission resumes the open session.
  select r.name into room_name from public.rooms r where r.id = target_room and r.is_active for share;
  if not found then raise exception 'stocktake_room_inactive'; end if;

  loop
    insert into public.stocktake_sessions (room_id, room_name_snapshot, opened_by, opened_at)
    values (target_room, room_name, auth.uid(), clock_timestamp())
    on conflict (room_id) where status = 'open' do nothing returning id into session_id;
    exit when session_id is not null;

    select s.id into session_id from public.stocktake_sessions s
    where s.room_id = target_room and s.status = 'open' for update;
    if found then return session_id; end if;
  end loop;

  insert into public.stocktake_items (
    session_id, asset_id, origin, asset_code_snapshot, asset_name_snapshot,
    recorded_room_id, recorded_room_name, recorded_condition
  )
  select session_id, a.id, 'snapshot', a.code, a.name, a.room_id, room_name, a.condition
  from public.assets a where a.room_id = target_room and a.status = 'active';
  return session_id;
end;
$$;

create function public.stocktake_confirm(
  target_session uuid, target_asset uuid, physical_condition public.asset_condition,
  observation_notes text, expected_checked_at timestamptz
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  session_status public.stocktake_status;
  item public.stocktake_items;
  checked_time timestamptz;
  clean_notes text := nullif(trim(observation_notes), '');
begin
  if not public.inventory_is_admin() then raise exception 'stocktake_forbidden'; end if;
  if physical_condition is null or char_length(clean_notes) > 500 then raise exception 'stocktake_result_invalid'; end if;

  select s.status into session_status from public.stocktake_sessions s where s.id = target_session for update;
  if not found then raise exception 'stocktake_session_missing'; end if;
  if session_status <> 'open' then raise exception 'stocktake_session_closed'; end if;

  select * into item from public.stocktake_items i where i.session_id = target_session and i.asset_id = target_asset;
  checked_time := clock_timestamp();
  if found then
    if item.result = 'found' and item.observed_condition = physical_condition and item.notes is not distinct from clean_notes then
      return;
    end if;
    if item.checked_at is distinct from expected_checked_at then raise exception 'stocktake_item_changed'; end if;
    update public.stocktake_items set result = 'found', observed_condition = physical_condition,
      notes = clean_notes, checked_by = auth.uid(), checked_at = checked_time where id = item.id;
  else
    if expected_checked_at is not null then raise exception 'stocktake_item_changed'; end if;
    insert into public.stocktake_items (
      session_id, asset_id, origin, asset_code_snapshot, asset_name_snapshot, recorded_room_id,
      recorded_room_name, recorded_condition, result, observed_condition, checked_by, checked_at, notes
    )
    select target_session, a.id, 'extra', a.code, a.name, a.room_id, r.name, a.condition,
      'found', physical_condition, auth.uid(), checked_time, clean_notes
    from public.assets a join public.rooms r on r.id = a.room_id
    where a.id = target_asset and a.status = 'active' for share of a, r;
    if not found then raise exception 'stocktake_asset_missing'; end if;
  end if;
end;
$$;

create function public.stocktake_close(target_session uuid, confirmed_unchecked uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  session_status public.stocktake_status;
  unchecked uuid[];
  closed_time timestamptz;
begin
  if not public.inventory_is_admin() then raise exception 'stocktake_forbidden'; end if;

  select s.status into session_status from public.stocktake_sessions s where s.id = target_session for update;
  if not found then raise exception 'stocktake_session_missing'; end if;
  if session_status = 'closed' then return; end if;

  select array(select i.asset_id from public.stocktake_items i
    where i.session_id = target_session and i.result = 'unchecked' order by i.asset_id) into unchecked;
  if unchecked is distinct from array(select id from unnest(confirmed_unchecked) as ids(id) order by id)
    or confirmed_unchecked is null then
    raise exception 'stocktake_review_changed';
  end if;

  closed_time := clock_timestamp();
  update public.stocktake_items set result = 'missing', checked_by = auth.uid(), checked_at = closed_time
  where session_id = target_session and result = 'unchecked';
  update public.stocktake_sessions set status = 'closed', closed_by = auth.uid(), closed_at = closed_time
  where id = target_session;
end;
$$;

-- Read session metadata and all results from the same statement, including during export.
create function public.stocktake_detail(target_session uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select to_jsonb(s) || jsonb_build_object('items', coalesce((
    select jsonb_agg(i order by i.asset_code_snapshot, i.asset_id)
    from public.stocktake_items i where i.session_id = s.id
  ), '[]'::jsonb)) from public.stocktake_sessions s where s.id = target_session;
$$;

create function public.stocktake_find_extra(target_session uuid, term text, target_asset uuid)
returns table (asset_id uuid, asset_code_snapshot text, asset_name_snapshot text,
  recorded_room_id uuid, recorded_room_name text, recorded_condition public.asset_condition)
language sql stable security invoker set search_path = '' as $$
  select a.id, a.code, a.name, a.room_id, r.name, a.condition
  from public.stocktake_sessions s cross join public.assets a join public.rooms r on r.id = a.room_id
  where s.id = target_session and s.status = 'open' and a.status = 'active'
    and not exists (select 1 from public.stocktake_items i where i.session_id = s.id and i.asset_id = a.id)
    and (a.id = target_asset or (target_asset is null and length(term) between 1 and 120
      and (strpos(lower(a.code), lower(term)) > 0 or strpos(lower(a.name), lower(term)) > 0)))
  order by lower(a.code) = lower(term) desc, a.code, a.id limit 20;
$$;

revoke all on function public.stocktake_open(uuid), public.stocktake_confirm(uuid, uuid, public.asset_condition, text, timestamptz),
  public.stocktake_close(uuid, uuid[]), public.stocktake_detail(uuid), public.stocktake_find_extra(uuid, text, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.stocktake_open(uuid), public.stocktake_confirm(uuid, uuid, public.asset_condition, text, timestamptz),
  public.stocktake_close(uuid, uuid[]), public.stocktake_detail(uuid), public.stocktake_find_extra(uuid, text, uuid)
to authenticated;

commit;
