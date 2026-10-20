-- Apply after 001_study_cloud.sql. Assign the first admin separately in the
-- Supabase SQL editor; never grant this role based on an email typed in the app.

create table if not exists public.study_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.study_admins enable row level security;
revoke all on public.study_admins from anon, authenticated;
grant select on public.study_admins to authenticated;
create policy "Read own admin membership"
  on public.study_admins for select to authenticated
  using (user_id = (select auth.uid()) and (select public.study_access_allowed()));

create or replace function public.study_admin_passkey_allowed()
returns boolean language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from jsonb_array_elements(coalesce((select auth.jwt()->'amr'), '[]'::jsonb)) as entry
    where entry->>'method' = 'passkey'
      and to_timestamp((entry->>'timestamp')::double precision) >= now() - interval '5 minutes'
  );
$$;
revoke execute on function public.study_admin_passkey_allowed() from public, anon;
grant execute on function public.study_admin_passkey_allowed() to authenticated;

create table if not exists public.study_error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area text not null check (area in ('home','plan','activity','stats','subject','tasks','files','settings','other')),
  code text not null check (code in ('sync','file','backup','workspace','other')),
  occurred_at timestamptz not null default now()
);
create index if not exists study_error_events_recent on public.study_error_events (occurred_at desc);
alter table public.study_error_events enable row level security;
revoke all on public.study_error_events from anon, authenticated;
grant insert on public.study_error_events to authenticated;
create policy "Record own application errors"
  on public.study_error_events for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.study_access_allowed()));

create or replace function public.study_admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.study_admin_passkey_allowed()) or not exists (
    select 1 from public.study_admins where user_id = (select auth.uid())
  ) then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'confirmedUsers', (select count(*) from auth.users where email_confirmed_at is not null),
    'signedIn7Days', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'signedIn30Days', (select count(*) from auth.users where last_sign_in_at >= now() - interval '30 days'),
    'workspaces', (select count(*) from public.study_documents),
    'workspacesUpdated7Days', (select count(*) from public.study_documents where updated_at >= now() - interval '7 days'),
    'appErrors7Days', (select count(*) from public.study_error_events where occurred_at >= now() - interval '7 days'),
    'recentErrors', coalesce((
      select jsonb_agg(jsonb_build_object('area', area, 'code', code, 'at', occurred_at) order by occurred_at desc)
      from (select area, code, occurred_at from public.study_error_events order by occurred_at desc limit 12) recent
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.study_admin_overview() from public, anon;
grant execute on function public.study_admin_overview() to authenticated;
