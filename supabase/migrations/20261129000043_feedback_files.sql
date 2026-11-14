-- Closed beta B.5: testers can delete their own feedback screenshots, so deleting an account (Account → Settings)
-- removes the files too (the privacy page says so). Deleting a report's row (account deletion cascades) doesn't
-- touch Storage, so the app removes the files through the Storage API first. Run after 042. Safe to run twice.
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  execute 'drop policy if exists "feedback: delete your own" on storage.objects';
  execute $p$create policy "feedback: delete your own" on storage.objects for delete to authenticated
    using (bucket_id = 'feedback' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
end $$;
