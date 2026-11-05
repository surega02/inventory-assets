begin;

create type public.handover_status as enum ('pending', 'accepted', 'rejected', 'cancelled');

create table public.handovers (
  id uuid primary key,
  asset_id uuid not null references public.assets(id),
  from_holder_id uuid references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  status public.handover_status not null default 'pending',
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  rejection_reason text,
  check (from_holder_id is distinct from recipient_id),
  check ((status = 'pending' and resolved_at is null and resolved_by is null)
    or (status <> 'pending' and resolved_at is not null and resolved_by is not null)),
  check ((status = 'rejected' and rejection_reason is not null and char_length(rejection_reason) between 1 and 500)
    or (status <> 'rejected' and rejection_reason is null))
);

create unique index handovers_one_pending on public.handovers (asset_id) where status = 'pending';
create index handovers_recipient_status on public.handovers (recipient_id, status, requested_at desc);
create index handovers_requested_at on public.handovers (requested_at desc, id);

alter table public.handovers enable row level security;
revoke all on public.handovers from public, anon, authenticated;
grant select on public.handovers to service_role;

alter table public.asset_events add column handover_id uuid unique references public.handovers(id);
alter table public.asset_events add check (handover_id is null or event_type = 'handover_accepted');

create function public.inventory_is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.assets_account_state() where role = 'staff' and not needs_password);
$$;

create or replace view public.inventory_admin_index with (security_invoker = true) as
select a.id, a.code, a.name, a.category_id, c.name as category_name,
  a.room_id, r.name as room_name, p.display_name as holder_name,
  a.condition, a.status, a.serial_number, a.brand_model, a.photo_path,
  a.notes, a.purchase_date, a.acquisition_cost_idr::text as acquisition_cost_idr,
  a.holder_id, a.updated_at
from public.assets a
join public.categories c on c.id = a.category_id
join public.rooms r on r.id = a.room_id
left join public.profiles p on p.id = a.holder_id;

create view public.inventory_handovers with (security_barrier = true) as
select h.id, h.asset_id, a.code as asset_code, a.name as asset_name,
  recipient.display_name as recipient_name, h.status, h.requested_at, h.resolved_at, h.rejection_reason
from public.handovers h
join public.assets a on a.id = h.asset_id
join public.profiles recipient on recipient.id = h.recipient_id
where (select public.inventory_is_admin())
   or ((select public.inventory_is_staff()) and h.recipient_id = (select auth.uid()));

create view public.inventory_staff_assets with (security_barrier = true) as
select a.id, a.code, a.name, c.name as category_name, r.name as room_name,
  a.condition, a.serial_number, a.brand_model, (a.photo_path is not null) as has_photo
from public.assets a
join public.categories c on c.id = a.category_id
join public.rooms r on r.id = a.room_id
where (select public.inventory_is_staff()) and a.holder_id = (select auth.uid()) and a.status = 'active';

create view public.inventory_staff_recipients with (security_barrier = true) as
select id, display_name || ' (' || username || ')' as name
from public.profiles
where (select public.inventory_is_admin()) and role = 'staff' and is_active;

revoke all on public.inventory_handovers, public.inventory_staff_assets, public.inventory_staff_recipients from public, anon, authenticated;
grant select on public.inventory_handovers, public.inventory_staff_assets, public.inventory_staff_recipients to authenticated;

create policy inventory_admin_warehouse on public.app_settings for select to authenticated
using ((select public.inventory_is_admin()));

create function public.inventory_staff_photo(asset_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select photo_path from public.assets
  where id = asset_id and status = 'active' and holder_id = (select auth.uid())
    and (select public.inventory_is_staff());
$$;

create function public.inventory_staff_can_read_photo(photo_key text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select public.inventory_is_staff()) and exists (
    select 1 from public.assets where photo_path = photo_key and status = 'active' and holder_id = (select auth.uid())
  );
$$;

create policy inventory_staff_asset_photos on storage.objects for select to authenticated
using (bucket_id = 'asset-photos' and public.inventory_staff_can_read_photo(name));

create function public.inventory_asset_snapshot(target public.assets)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object('room_id', target.room_id, 'room_name', r.name,
    'holder_id', target.holder_id, 'holder_name', p.display_name,
    'condition', target.condition, 'status', target.status)
  from public.rooms r left join public.profiles p on p.id = target.holder_id
  where r.id = target.room_id;
$$;

create function public.inventory_request_handover(
  request_id uuid, target_asset uuid, recipient uuid, expected_updated_at timestamptz
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  asset public.assets;
  actor uuid := auth.uid();
begin
  if not public.inventory_is_admin() then
    raise exception using errcode = '42501', message = 'inventory_forbidden';
  end if;
  select * into asset from public.assets where id = target_asset for update;
  if not found then raise exception 'asset_missing'; end if;
  if exists (select 1 from public.handovers h where h.id = request_id and h.asset_id = asset.id
    and h.recipient_id = recipient and h.requested_by = actor) then return; end if;
  if asset.status <> 'active' then raise exception 'asset_inactive'; end if;
  if asset.updated_at is distinct from expected_updated_at then raise exception 'asset_changed'; end if;
  if exists (select 1 from public.handovers h where h.asset_id = asset.id and h.status = 'pending') then
    raise exception 'asset_pending_handover';
  end if;
  if recipient is null or recipient = asset.holder_id then raise exception 'handover_recipient_invalid'; end if;
  perform 1 from public.profiles where id = recipient and role = 'staff' and is_active for share;
  if not found then raise exception 'handover_recipient_invalid'; end if;

  insert into public.handovers (id, asset_id, from_holder_id, recipient_id, requested_by)
  values (request_id, asset.id, asset.holder_id, recipient, actor);
end;
$$;

create function public.inventory_resolve_handover(
  request_id uuid, decision public.handover_status, reason text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  asset public.assets;
  request public.handovers;
  target_asset uuid;
  actor uuid := auth.uid();
  before_change jsonb;
  resolved_time timestamptz;
begin
  if decision is null or decision = 'pending' then raise exception 'handover_decision_invalid'; end if;
  if (decision = 'cancelled' and not public.inventory_is_admin())
    or (decision <> 'cancelled' and not public.inventory_is_staff()) then
    raise exception using errcode = '42501', message = 'inventory_forbidden';
  end if;
  select h.asset_id into target_asset from public.handovers h
    where h.id = request_id and (decision = 'cancelled' or h.recipient_id = actor);
  if not found then raise exception 'handover_missing'; end if;
  select * into asset from public.assets where id = target_asset for update;
  select * into request from public.handovers where id = request_id for update;
  if not found then raise exception 'handover_missing'; end if;
  if request.status = decision then return; end if;
  if request.status <> 'pending' then raise exception 'handover_resolved'; end if;

  if decision <> 'cancelled' then
    perform 1 from public.profiles where id = actor and role = 'staff' and is_active for share;
    if not found or not public.inventory_is_staff() then
      raise exception using errcode = '42501', message = 'inventory_forbidden';
    end if;
  end if;
  if decision = 'rejected' then
    reason := regexp_replace(reason, '^[[:space:]]+|[[:space:]]+$', '', 'g');
    if reason is null or char_length(reason) not between 1 and 500 then raise exception 'handover_reason_invalid'; end if;
  else
    reason := null;
  end if;

  resolved_time := clock_timestamp();
  if decision = 'accepted' then
    if asset.status <> 'active' or asset.holder_id is distinct from request.from_holder_id then
      raise exception 'asset_changed';
    end if;
    before_change := public.inventory_asset_snapshot(asset);
    update public.assets set holder_id = request.recipient_id, updated_at = resolved_time
      where id = asset.id returning * into asset;
    insert into public.asset_events (asset_id, event_type, actor_id, occurred_at, handover_id, before_state, after_state)
    values (asset.id, 'handover_accepted', actor, resolved_time, request.id, before_change, public.inventory_asset_snapshot(asset));
  end if;

  update public.handovers set status = decision, resolved_at = resolved_time, resolved_by = actor, rejection_reason = reason
    where id = request.id;
end;
$$;

-- A null destination records a physical return to the configured warehouse.
create function public.inventory_move_asset(target_asset uuid, destination uuid, expected_updated_at timestamptz, expected_warehouse uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  asset public.assets;
  returning_to_warehouse boolean := destination is null;
  event_kind public.asset_event_type;
  before_change jsonb;
  changed_at timestamptz;
begin
  if not public.inventory_is_admin() then
    raise exception using errcode = '42501', message = 'inventory_forbidden';
  end if;
  select * into asset from public.assets where id = target_asset for update;
  if not found then raise exception 'asset_missing'; end if;
  if asset.status <> 'active' then raise exception 'asset_inactive'; end if;
  if asset.updated_at is distinct from expected_updated_at then raise exception 'asset_changed'; end if;
  if exists (select 1 from public.handovers h where h.asset_id = asset.id and h.status = 'pending') then
    raise exception 'asset_pending_handover';
  end if;

  if returning_to_warehouse then
    if asset.holder_id is null then raise exception 'asset_not_held'; end if;
    select warehouse_room_id into destination from public.app_settings where id = 1 for share;
    if destination is null then raise exception 'warehouse_settings_missing'; end if;
    if destination is distinct from expected_warehouse then raise exception 'warehouse_changed'; end if;
    event_kind := 'returned';
  else
    if asset.room_id = destination then raise exception 'asset_same_room'; end if;
    event_kind := 'room_moved';
  end if;
  perform 1 from public.rooms where id = destination and is_active for share;
  if not found then raise exception 'asset_room_inactive'; end if;

  before_change := public.inventory_asset_snapshot(asset);
  changed_at := clock_timestamp();
  update public.assets set room_id = destination,
    holder_id = case when returning_to_warehouse then null else holder_id end, updated_at = changed_at
    where id = asset.id returning * into asset;
  insert into public.asset_events (asset_id, event_type, actor_id, occurred_at, before_state, after_state)
  values (asset.id, event_kind, auth.uid(), changed_at, before_change, public.inventory_asset_snapshot(asset));
end;
$$;

revoke all on function public.inventory_asset_snapshot(public.assets) from public, anon, authenticated;
revoke all on function public.inventory_is_staff(), public.inventory_staff_photo(uuid),
  public.inventory_staff_can_read_photo(text), public.inventory_request_handover(uuid, uuid, uuid, timestamptz),
  public.inventory_resolve_handover(uuid, public.handover_status, text),
  public.inventory_move_asset(uuid, uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.inventory_is_staff(), public.inventory_staff_photo(uuid),
  public.inventory_staff_can_read_photo(text), public.inventory_request_handover(uuid, uuid, uuid, timestamptz),
  public.inventory_resolve_handover(uuid, public.handover_status, text),
  public.inventory_move_asset(uuid, uuid, timestamptz, uuid) to authenticated;

commit;
