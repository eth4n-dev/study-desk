-- Apply to existing Supabase projects to enable the file-library trash action.
create policy "Delete own study files with strong sign in"
  on storage.objects for delete to authenticated
  using (bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.study_access_allowed()));
