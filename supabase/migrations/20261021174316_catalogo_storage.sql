-- Fotografías públicas del catálogo; solo personal puede cargar archivos nuevos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy catalogo_personal_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'catalogo'
  and (select public.es_personal())
  and (storage.foldername(name))[1] = 'productos'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
-- Sin permisos de UPDATE/DELETE: cada sustitución utiliza una ruta nueva.
