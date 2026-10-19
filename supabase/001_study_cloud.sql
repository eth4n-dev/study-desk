-- Apply in a new Supabase project's SQL editor before enabling cloud mode.
-- Keep public sign-ups disabled and invite each intended user in Authentication.

create table if not exists public.study_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint study_state_shape check (
    jsonb_typeof(state) = 'object'
    and jsonb_typeof(state->'tasks') = 'array'
    and jsonb_typeof(state->'files') = 'array'
    and jsonb_typeof(state->'rules') = 'array'
    and jsonb_typeof(state->'logs') = 'array'
    and jsonb_typeof(state->'revisions') = 'array'
  )
);

alter table public.study_documents enable row level security;
revoke all on public.study_documents from anon, authenticated;
grant select, insert, update on public.study_documents to authenticated;

-- Supabase currently issues AAL1 for a passkey sign-in. Its signed JWT records
-- the phishing-resistant method in amr. Email sign-in needs an MFA step (AAL2).
create or replace function public.study_access_allowed()
returns boolean language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null and (
    (select auth.jwt()->>'aal') = 'aal2'
    or exists (
      select 1 from jsonb_array_elements(coalesce((select auth.jwt()->'amr'), '[]'::jsonb)) as entry
      where entry->>'method' = 'passkey' or entry = '"passkey"'::jsonb
    )
  );
$$;
revoke execute on function public.study_access_allowed() from public, anon;
grant execute on function public.study_access_allowed() to authenticated;

create policy "Read own study document with strong sign in"
  on public.study_documents for select to authenticated
  using ((select auth.uid()) = user_id and (select public.study_access_allowed()));
create policy "Create own study document with strong sign in"
  on public.study_documents for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.study_access_allowed()));
create policy "Update own study document with strong sign in"
  on public.study_documents for update to authenticated
  using ((select auth.uid()) = user_id and (select public.study_access_allowed()))
  with check ((select auth.uid()) = user_id and (select public.study_access_allowed()));

create or replace function public.save_study_document(p_expected_revision bigint, p_state jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare v_revision bigint;
begin
  if not (select public.study_access_allowed()) then
    raise exception 'STRONG_SIGN_IN_REQUIRED' using errcode = '42501';
  end if;
  if p_expected_revision is null then
    insert into public.study_documents (user_id, state)
    values ((select auth.uid()), p_state)
    on conflict do nothing
    returning revision into v_revision;
  else
    update public.study_documents
       set state = p_state, revision = revision + 1, updated_at = now()
     where user_id = (select auth.uid()) and revision = p_expected_revision
    returning revision into v_revision;
  end if;
  if v_revision is null then
    raise exception 'STUDY_CONFLICT' using errcode = '40001';
  end if;
  return v_revision;
end;
$$;
revoke execute on function public.save_study_document(bigint,jsonb) from public, anon;
grant execute on function public.save_study_document(bigint,jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('study-files', 'study-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "Read own study files with strong sign in"
  on storage.objects for select to authenticated
  using (bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.study_access_allowed()));
create policy "Upload own study files with strong sign in"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.study_access_allowed()));
create policy "Replace own study files with strong sign in"
  on storage.objects for update to authenticated
  using (bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.study_access_allowed()))
  with check (bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.study_access_allowed()));
create policy "Delete own study files with strong sign in"
  on storage.objects for delete to authenticated
  using (bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.study_access_allowed()));
