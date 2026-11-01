-- Count courses created before migration 007 toward the monthly allowance (they were never logged).
insert into public.course_creations (user_id, course_id, paid, created_at)
select c.user_id, c.id, false, c.created_at
  from public.courses c
 where not exists (select 1 from public.course_creations cc where cc.course_id = c.id);
