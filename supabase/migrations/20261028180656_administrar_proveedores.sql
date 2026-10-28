begin;
create table public.proveedores(
 id bigint generated always as identity primary key check(id<=9007199254740991),
 nombre text not null check(length(btrim(nombre)) between 1 and 120),
 contacto text not null default '' check(length(contacto)<=500),
 telefono text not null check(telefono ~ '^\+?[0-9 ()-]{7,30}$' and length(regexp_replace(telefono,'\D','','g')) between 7 and 15),
 direccion text not null default '' check(length(direccion)<=500),activo boolean not null default true,
 creado_por uuid default auth.uid(),fecha_creacion timestamptz not null default now()
);
create unique index proveedores_nombre_unico on public.proveedores(lower(btrim(nombre)));
alter table public.proveedores enable row level security;
create policy proveedores_lectura on public.proveedores for select to authenticated using((select public.es_personal()));
create policy proveedores_alta on public.proveedores for insert to authenticated with check((select public.es_admin()));
create policy proveedores_edicion on public.proveedores for update to authenticated using((select public.es_admin())) with check((select public.es_admin()));
revoke all on public.proveedores from public,anon,authenticated;
grant select on public.proveedores to authenticated;
grant insert(nombre,contacto,telefono,direccion,activo),update(nombre,contacto,telefono,direccion,activo) on public.proveedores to authenticated;
grant usage,select on sequence public.proveedores_id_seq to authenticated;
create trigger auditar_proveedor after insert or update on public.proveedores for each row execute function private.auditar_ficha();
notify pgrst,'reload schema';
commit;
