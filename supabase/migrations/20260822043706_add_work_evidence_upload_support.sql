-- Daily task evidence is stored in the existing private bucket.
-- Keep the bucket private; public owner reports receive only temporary signed URLs.
update storage.buckets
set allowed_mime_types = array(
  select distinct mime_type
  from unnest(
    coalesce(allowed_mime_types, '{}'::text[]) || array[
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  ) as mime_type
)
where id = 'erp-private-uploads';
