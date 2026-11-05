begin;

create function public.inventory_create_asset(
  asset_id uuid, asset_code text, asset_name text, category uuid, room uuid,
  physical_condition public.asset_condition, serial text, model text, asset_notes text,
  purchased_on date, cost_idr bigint, photo_key text
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  room_label text;
begin
  if not public.inventory_is_admin() then
    raise exception using errcode = '42501', message = 'inventory_forbidden';
  end if;
  asset_code := regexp_replace(asset_code, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  asset_name := regexp_replace(asset_name, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if asset_id is null or asset_code is null or char_length(asset_code) not between 1 and 80
    or asset_name is null or char_length(asset_name) not between 1 and 160
    or physical_condition is null or char_length(serial) > 120 or char_length(model) > 160
    or char_length(asset_notes) > 2000 or cost_idr < 0
    or (purchased_on is not null and purchased_on not between date '0001-01-01' and date '9999-12-31') then
    raise exception 'asset_invalid';
  end if;

  perform 1 from public.categories where id = category and is_active for share;
  if not found then raise exception 'asset_category_inactive'; end if;
  select name into room_label from public.rooms where id = room and is_active for share;
  if not found then raise exception 'asset_room_inactive'; end if;

  if photo_key is not null then
    if photo_key not in (asset_id::text || '.jpeg', asset_id::text || '.png',
        asset_id::text || '.webp', asset_id::text || '.avif')
      or not exists (select 1 from storage.objects where bucket_id = 'asset-photos' and name = photo_key) then
      raise exception 'asset_photo_missing';
    end if;
  end if;

  insert into public.assets (id, code, name, category_id, room_id, condition,
    serial_number, brand_model, notes, purchase_date, acquisition_cost_idr, photo_path)
  values (asset_id, asset_code, asset_name, category, room, physical_condition,
    nullif(trim(serial), ''), nullif(trim(model), ''), nullif(trim(asset_notes), ''), purchased_on, cost_idr, photo_key)
  on conflict (lower(trim(code))) do nothing;
  if not found then raise exception 'asset_code_taken'; end if;

  insert into public.asset_events (asset_id, event_type, actor_id, after_state)
  values (asset_id, 'created', (select auth.uid()), jsonb_build_object(
    'room_id', room, 'room_name', room_label, 'holder_id', null::uuid,
    'holder_name', null::text, 'condition', physical_condition, 'status', 'active'
  ));
end;
$$;

create function public.inventory_archive_asset(asset_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  target public.assets;
  room_label text;
  pending boolean;
  previous_state jsonb;
begin
  if not public.inventory_is_admin() then
    raise exception using errcode = '42501', message = 'inventory_forbidden';
  end if;

  -- All handover writes must also lock the asset before checking its status.
  select * into target from public.assets where id = asset_id for update;
  if not found then raise exception 'asset_missing'; end if;
  if target.status = 'archived' then return; end if;
  if target.holder_id is not null then raise exception 'asset_has_holder'; end if;
  if to_regclass('public.handovers') is not null then
    execute 'select exists (select 1 from public.handovers where asset_id = $1 and status = ''pending'')'
      into pending using asset_id;
    if pending then raise exception 'asset_pending_handover'; end if;
  end if;

  select name into room_label from public.rooms where id = target.room_id;
  previous_state := jsonb_build_object(
    'room_id', target.room_id, 'room_name', room_label, 'holder_id', null::uuid,
    'holder_name', null::text, 'condition', target.condition, 'status', target.status
  );
  update public.assets set status = 'archived', updated_at = now() where id = asset_id;
  insert into public.asset_events (asset_id, event_type, actor_id, before_state, after_state)
  values (asset_id, 'archived', (select auth.uid()), previous_state,
    previous_state || jsonb_build_object('status', 'archived'));
end;
$$;

revoke all on function public.inventory_create_asset(uuid, text, text, uuid, uuid, public.asset_condition,
  text, text, text, date, bigint, text), public.inventory_archive_asset(uuid) from public;
grant execute on function public.inventory_create_asset(uuid, text, text, uuid, uuid, public.asset_condition,
  text, text, text, date, bigint, text), public.inventory_archive_asset(uuid) to authenticated;

commit;
