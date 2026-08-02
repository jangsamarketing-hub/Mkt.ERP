-- Raw source files are written only by server-side service-role routes.
-- Keep this bucket private because finance files may contain sensitive transaction data.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'erp-private-uploads',
  'erp-private-uploads',
  false,
  10485760,
  array[
    'application/json',
    'text/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
