-- Allow student email addresses from the exact etu.unige.ch domain.
-- The existing Before User Created hook reads this table on every sign-up.
insert into public.study_signup_domains (domain)
values ('etu.unige.ch')
on conflict (domain) do nothing;
