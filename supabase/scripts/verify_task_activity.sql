-- Verify task_activity exists and PostgREST can expose it.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'task_activity';

select id, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'task-attachments';

notify pgrst, 'reload schema';
