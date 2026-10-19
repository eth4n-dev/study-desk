-- Apply before enabling public sign-ups. Add allowed domains to the table,
-- then enable this function as Authentication > Auth Hooks > Before User Created.
-- Keep sign-ups disabled until the hook and custom SMTP are both working.

create table if not exists public.study_signup_domains (
  domain text primary key,
  constraint study_signup_domain_format check (
    domain = lower(domain)
    and domain ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'
  )
);

alter table public.study_signup_domains enable row level security;
revoke all on public.study_signup_domains from public, anon, authenticated;
grant select on public.study_signup_domains to supabase_auth_admin;
create policy "Auth hook reads allowed signup domains"
  on public.study_signup_domains for select to supabase_auth_admin
  using (true);

create or replace function public.study_before_user_created(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  address text := lower(btrim(coalesce(event->'user'->>'email', '')));
begin
  if address ~ '^[^@[:space:]]+@[^@[:space:]]+$'
     and exists (
       select 1 from public.study_signup_domains
       where domain = split_part(address, '@', 2)
     ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Registration is not available for this email address.'
  ));
end;
$$;

grant usage on schema public to supabase_auth_admin;
revoke execute on function public.study_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.study_before_user_created(jsonb) to supabase_auth_admin;
