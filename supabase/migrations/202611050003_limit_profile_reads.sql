begin;

-- The inventory views need only a holder or actor ID and display name.
revoke select on public.profiles from authenticated;
grant select (id, display_name) on public.profiles to authenticated;

create view public.assets_settings_accounts with (security_barrier = true) as
select id, username, display_name, role, is_active, must_change_password
from public.profiles
where (select public.assets_is_superadmin());

revoke all on public.assets_settings_accounts from anon, authenticated;
grant select on public.assets_settings_accounts to authenticated;

commit;
