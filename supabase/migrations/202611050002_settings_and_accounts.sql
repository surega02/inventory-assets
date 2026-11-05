begin;

create unique index profiles_one_superadmin on public.profiles (role)
where role = 'superadmin';

create table public.app_settings (
  id smallint primary key check (id = 1),
  warehouse_room_id uuid not null references public.rooms(id)
);

with warehouse as (
  insert into public.rooms (name) values ('Gudang')
  on conflict (lower(trim(name))) do update set is_active = true
  returning id
)
insert into public.app_settings (id, warehouse_room_id) select 1, id from warehouse;

create function public.assets_account_state()
returns table (role public.role, needs_password boolean, username text, session_version timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select p.role, p.must_change_password, p.username, p.session_valid_after
  from public.profiles p
  join auth.sessions s on s.user_id = p.id
  where p.id = (select auth.uid())
    and s.id = ((select auth.jwt())->>'session_id')::uuid
    and (s.not_after is null or s.not_after > now())
    and (p.session_valid_after is null or s.created_at >= p.session_valid_after)
    and p.is_active;
$$;

create function public.assets_is_superadmin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assets_account_state()
    where role = 'superadmin' and not needs_password
  );
$$;

revoke all on function public.assets_account_state(), public.assets_is_superadmin() from public;
grant execute on function public.assets_account_state(), public.assets_is_superadmin() to authenticated;

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;
grant select on public.app_settings to service_role;

create policy settings_superadmin_accounts on public.profiles
for select to authenticated using ((select public.assets_is_superadmin()));
create policy settings_superadmin_categories on public.categories
for select to authenticated using ((select public.assets_is_superadmin()));
create policy settings_superadmin_rooms on public.rooms
for select to authenticated using ((select public.assets_is_superadmin()));
create policy settings_superadmin_warehouse on public.app_settings
for select to authenticated using ((select public.assets_is_superadmin()));

-- Only the Auth Admin API may set raw_app_meta_data. Provision the profile
-- in the same transaction as the Auth account.
create function public.assets_provision_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  profile jsonb := new.raw_app_meta_data -> 'assets_profile';
begin
  if profile is null then return new; end if;
  if tg_op = 'UPDATE' and old.raw_app_meta_data -> 'assets_profile' is not null then return new; end if;
  if new.email is null or split_part(new.email, '@', 1) is distinct from profile ->> 'username'
     or nullif(trim(profile ->> 'display_name'), '') is null
     or coalesce(new.encrypted_password, '') = '' then
    raise exception 'invalid_assets_profile';
  end if;
  insert into public.profiles (id, username, display_name, role)
  values (new.id, profile ->> 'username', trim(profile ->> 'display_name'), (profile ->> 'role')::public.role);
  return new;
end;
$$;

create trigger assets_provision_profile
after insert or update of raw_app_meta_data on auth.users for each row execute function public.assets_provision_profile();

create function public.assets_sync_password()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  completed jsonb := new.raw_app_meta_data -> 'assets_password_changed';
begin
  if new.raw_app_meta_data ->> 'assets_reset' is distinct from old.raw_app_meta_data ->> 'assets_reset'
     and new.raw_app_meta_data ->> 'assets_reset' is not null then
    update public.profiles
    set must_change_password = true, session_valid_after = clock_timestamp()
    where id = new.id and role in ('admin', 'staff') and is_active;
    if not found then raise exception 'account_inactive'; end if;
    delete from auth.sessions where user_id = new.id;
  elsif completed is not null
    and completed is distinct from old.raw_app_meta_data -> 'assets_password_changed' then
    update public.profiles
    set must_change_password = false, session_valid_after = clock_timestamp()
    where id = new.id and is_active and must_change_password
      and session_valid_after is not distinct from (completed ->> 'version')::timestamptz;
    if not found then raise exception 'password_state_changed'; end if;
    delete from auth.sessions where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger assets_sync_password
after update of raw_app_meta_data on auth.users
for each row execute function public.assets_sync_password();

revoke all on function public.assets_provision_profile(), public.assets_sync_password() from public;

create function public.assets_disable_account(account_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  target public.profiles;
  pending boolean;
begin
  if not public.assets_is_superadmin() then
    raise exception using errcode = '42501', message = 'settings_forbidden';
  end if;
  select * into target from public.profiles where id = account_id and role in ('admin', 'staff') for update;
  if not found then raise exception 'account_missing'; end if;
  if not target.is_active then return; end if;

  if target.role = 'staff' then
    if exists (select 1 from public.assets where holder_id = account_id) then
      raise exception 'account_holds_assets';
    end if;
    if to_regclass('public.handovers') is not null then
      execute 'select exists (select 1 from public.handovers where recipient_id = $1 and status = ''pending'')'
        into pending using account_id;
      if pending then raise exception 'account_pending_handover'; end if;
    end if;
  end if;

  update public.profiles set is_active = false, session_valid_after = clock_timestamp() where id = account_id;
  delete from auth.sessions where user_id = account_id;
end;
$$;

create function public.assets_save_master(master_kind text, record_id uuid, record_name text, active boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  room_in_use boolean;
begin
  if not public.assets_is_superadmin() then
    raise exception using errcode = '42501', message = 'settings_forbidden';
  end if;
  record_name := trim(record_name);
  if record_name is null or char_length(record_name) not between 1 and 100 or active is null then
    raise exception 'master_invalid';
  end if;
  if master_kind = 'categories' then
    if record_id is null then
      insert into public.categories (name, is_active) values (record_name, active);
    else
      update public.categories set name = record_name, is_active = active where id = record_id;
      if not found then raise exception 'master_missing'; end if;
    end if;
  elsif master_kind = 'rooms' then
    if record_id is null then
      insert into public.rooms (name, is_active) values (record_name, active);
      return;
    end if;
    perform 1 from public.app_settings where id = 1 for update;
    perform 1 from public.rooms where id = record_id for update;
    if not found then raise exception 'master_missing'; end if;
    if not active then
      if exists (select 1 from public.app_settings where warehouse_room_id = record_id) then
        raise exception 'warehouse_must_stay_active';
      end if;
      if exists (select 1 from public.assets where room_id = record_id and status = 'active') then
        raise exception 'room_has_active_assets';
      end if;
      if to_regclass('public.stocktake_sessions') is not null then
        execute 'select exists (select 1 from public.stocktake_sessions where room_id = $1 and status = ''open'')'
          into room_in_use using record_id;
        if room_in_use then raise exception 'room_has_open_stocktake'; end if;
      end if;
    end if;
    update public.rooms set name = record_name, is_active = active where id = record_id;
  else
    raise exception 'master_invalid';
  end if;
end;
$$;

create function public.assets_set_warehouse(room_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.assets_is_superadmin() then
    raise exception using errcode = '42501', message = 'settings_forbidden';
  end if;
  perform 1 from public.app_settings where id = 1 for update;
  perform 1 from public.rooms where id = room_id and is_active for share;
  if not found then raise exception 'warehouse_room_inactive'; end if;
  update public.app_settings set warehouse_room_id = room_id where id = 1;
  if not found then raise exception 'warehouse_settings_missing'; end if;
end;
$$;

revoke all on function public.assets_disable_account(uuid),
  public.assets_save_master(text, uuid, text, boolean), public.assets_set_warehouse(uuid) from public;
grant execute on function public.assets_disable_account(uuid),
  public.assets_save_master(text, uuid, text, boolean), public.assets_set_warehouse(uuid) to authenticated;

-- Serialize changes that can introduce an asset into a room or assign it to
-- a holder against the corresponding deactivation checks.
create function public.assets_check_assignment()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    perform 1 from public.rooms where id = new.room_id and is_active for share;
    if not found then raise exception 'asset_room_inactive'; end if;
  end if;
  if new.holder_id is not null then
    perform 1 from public.profiles where id = new.holder_id and role = 'staff' and is_active for share;
    if not found then raise exception 'asset_holder_inactive'; end if;
  end if;
  return new;
end;
$$;

create trigger assets_check_assignment
before insert or update of room_id, status, holder_id on public.assets
for each row execute function public.assets_check_assignment();

revoke all on function public.assets_check_assignment() from public;

commit;
