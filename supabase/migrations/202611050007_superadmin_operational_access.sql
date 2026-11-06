begin;

create or replace function public.inventory_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assets_account_state()
    where role in ('admin', 'superadmin') and not needs_password
  );
$$;

create or replace view public.inventory_staff_assets with (security_barrier = true) as
select a.id, a.code, a.name, c.name as category_name, r.name as room_name,
  a.condition, a.serial_number, a.brand_model, (a.photo_path is not null) as has_photo
from public.assets a
join public.categories c on c.id = a.category_id
join public.rooms r on r.id = a.room_id
where ((select public.inventory_is_staff()) or (select public.assets_is_superadmin()))
  and a.holder_id = (select auth.uid()) and a.status = 'active';

commit;
