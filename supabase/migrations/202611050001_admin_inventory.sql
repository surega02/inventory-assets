begin;

create type public.role as enum ('superadmin', 'admin', 'staff');
create type public.asset_condition as enum ('good', 'minor_damage', 'major_damage');
create type public.asset_status as enum ('active', 'archived');
create type public.asset_event_type as enum (
  'created', 'handover_accepted', 'returned', 'room_moved', 'condition_changed', 'archived'
);

create table public.profiles (
  id uuid primary key references auth.users(id),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  display_name text not null,
  role public.role not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  session_valid_after timestamptz,
  created_at timestamptz not null default now()
);

create unique index profiles_one_active_admin on public.profiles (role)
where role = 'admin' and is_active;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default true
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default true
);

create unique index categories_normalized_name on public.categories (lower(trim(name)));
create unique index rooms_normalized_name on public.rooms (lower(trim(name)));

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  code text not null check (length(trim(code)) > 0),
  name text not null check (length(trim(name)) > 0),
  category_id uuid not null references public.categories(id),
  room_id uuid not null references public.rooms(id),
  holder_id uuid references public.profiles(id),
  condition public.asset_condition not null,
  status public.asset_status not null default 'active',
  serial_number text,
  brand_model text,
  notes text,
  purchase_date date,
  acquisition_cost_idr bigint check (acquisition_cost_idr >= 0),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index assets_normalized_code on public.assets (lower(trim(code)));
create index assets_category_id on public.assets (category_id);
create index assets_room_id on public.assets (room_id);
create index assets_holder_id on public.assets (holder_id);
create index assets_photo_path on public.assets (photo_path) where photo_path is not null;

create table public.asset_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id),
  event_type public.asset_event_type not null,
  actor_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  before_state jsonb,
  after_state jsonb not null,
  notes text
);

create index asset_events_asset_occurred on public.asset_events (asset_id, occurred_at desc, id);

create function public.inventory_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.sessions s on s.user_id = p.id
    where p.id = (select auth.uid())
      and s.id = ((select auth.jwt())->>'session_id')::uuid
      and (s.not_after is null or s.not_after > now())
      and (p.session_valid_after is null or s.created_at >= p.session_valid_after)
      and p.role = 'admin' and p.is_active and not p.must_change_password
  );
$$;

revoke all on function public.inventory_is_admin() from public;
grant execute on function public.inventory_is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.rooms enable row level security;
alter table public.assets enable row level security;
alter table public.asset_events enable row level security;

revoke all on public.profiles, public.categories, public.rooms, public.assets, public.asset_events
from anon, authenticated;
grant select on public.profiles, public.categories, public.rooms, public.assets, public.asset_events
to authenticated;
grant select, insert, update, delete on public.profiles, public.categories, public.rooms, public.assets, public.asset_events
to service_role;

create policy inventory_admin_profiles on public.profiles
for select to authenticated using ((select public.inventory_is_admin()));
create policy inventory_admin_categories on public.categories
for select to authenticated using ((select public.inventory_is_admin()));
create policy inventory_admin_rooms on public.rooms
for select to authenticated using ((select public.inventory_is_admin()));
create policy inventory_admin_assets on public.assets
for select to authenticated using ((select public.inventory_is_admin()));
create policy inventory_admin_events on public.asset_events
for select to authenticated using ((select public.inventory_is_admin()));

create view public.inventory_admin_index with (security_invoker = true) as
select
  a.id, a.code, a.name, a.category_id, c.name as category_name,
  a.room_id, r.name as room_name, p.display_name as holder_name,
  a.condition, a.status, a.serial_number, a.brand_model, a.photo_path,
  a.notes, a.purchase_date, a.acquisition_cost_idr::text as acquisition_cost_idr
from public.assets a
join public.categories c on c.id = a.category_id
join public.rooms r on r.id = a.room_id
left join public.profiles p on p.id = a.holder_id;

create view public.inventory_admin_history with (security_invoker = true) as
select e.id, e.asset_id, e.event_type, e.occurred_at, p.display_name as actor_name,
  e.before_state, e.after_state, e.notes
from public.asset_events e
join public.profiles p on p.id = e.actor_id;

revoke all on public.inventory_admin_index, public.inventory_admin_history from anon, authenticated;
grant select on public.inventory_admin_index, public.inventory_admin_history to authenticated;

create function public.inventory_admin_search(
  search_term text,
  category_filter uuid,
  room_filter uuid,
  condition_filter public.asset_condition,
  status_filter public.asset_status
)
returns setof public.inventory_admin_index
language sql stable
as $$
  select a.* from public.inventory_admin_index a
  where (category_filter is null or a.category_id = category_filter)
    and (room_filter is null or a.room_id = room_filter)
    and (condition_filter is null or a.condition = condition_filter)
    and (status_filter is null or a.status = status_filter)
    and (
      coalesce(search_term, '') = ''
      or strpos(lower(a.code), lower(search_term)) > 0
      or strpos(lower(a.name), lower(search_term)) > 0
      or strpos(lower(a.serial_number), lower(search_term)) > 0
      or strpos(lower(a.holder_name), lower(search_term)) > 0
    );
$$;

revoke all on function public.inventory_admin_search(text, uuid, uuid, public.asset_condition, public.asset_status)
from public;
grant execute on function public.inventory_admin_search(text, uuid, uuid, public.asset_condition, public.asset_status)
to authenticated;

insert into storage.buckets (id, name, public) values ('asset-photos', 'asset-photos', false);
create policy inventory_admin_asset_photos on storage.objects
for select to authenticated using (
  bucket_id = 'asset-photos' and (select public.inventory_is_admin())
  and exists (select 1 from public.assets a where a.photo_path = storage.objects.name)
);

commit;
