begin;
create table public.categorias(
 id bigint generated always as identity primary key check(id<=9007199254740991),
 nombre text not null check(length(btrim(nombre)) between 1 and 120),
 descripcion text not null default '' check(length(descripcion)<=500), activo boolean not null default true,
 creado_por uuid default auth.uid(),fecha_creacion timestamptz not null default now()
);
create unique index categorias_nombre_unico on public.categorias(lower(btrim(nombre)));
insert into public.categorias(nombre) select distinct on(lower(btrim(categoria))) btrim(categoria) from public.articulos order by lower(btrim(categoria)),btrim(categoria);
alter table public.articulos add column categoria_id bigint references public.categorias(id) on delete restrict;
update public.articulos a set categoria_id=c.id from public.categorias c where lower(btrim(a.categoria))=lower(btrim(c.nombre));
create index articulos_categoria_idx on public.articulos(categoria_id);
create function private.sincronizar_categoria() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.categorias%rowtype;
begin
 if new.categoria_id is not null and (tg_op='INSERT' or new.categoria_id is distinct from old.categoria_id) then
  select * into c from public.categorias where id=new.categoria_id;
 else
  select * into c from public.categorias where lower(btrim(nombre))=lower(btrim(new.categoria));
  if not found and (auth.uid() is null or public.es_admin()) then
   insert into public.categorias(nombre) values(btrim(new.categoria)) returning * into c;
  end if;
 end if;
 if c.id is null then raise exception 'Selecciona una categoría registrada.' using errcode='22023'; end if;
 if not c.activo and (tg_op='INSERT' or new.categoria_id is distinct from old.categoria_id) then raise exception 'La categoría está inactiva.' using errcode='22023'; end if;
 new.categoria_id:=c.id;new.categoria:=c.nombre;return new;
end; $$;
revoke all on function private.sincronizar_categoria() from public,anon,authenticated,service_role;
create trigger sincronizar_categoria before insert or update of categoria,categoria_id on public.articulos for each row execute function private.sincronizar_categoria();
create function private.propagar_categoria() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.nombre is distinct from old.nombre then update public.articulos set categoria=new.nombre where categoria_id=new.id;end if;return new;end;$$;
revoke all on function private.propagar_categoria() from public,anon,authenticated,service_role;
create trigger propagar_categoria after update of nombre on public.categorias for each row execute function private.propagar_categoria();
create function private.auditar_ficha() returns trigger language plpgsql security definer set search_path='' as $$
begin if auth.uid() is not null then insert into private.auditoria(actor,operacion,entidad,entidad_id) values(auth.uid(),tg_op,tg_table_name,new.id::text);end if;return new;end; $$;
revoke all on function private.auditar_ficha() from public,anon,authenticated,service_role;
create trigger auditar_categoria after insert or update on public.categorias for each row execute function private.auditar_ficha();
alter table public.categorias enable row level security;
create policy categorias_lectura on public.categorias for select to authenticated using((select public.es_personal()));
create policy categorias_alta on public.categorias for insert to authenticated with check((select public.es_admin()));
create policy categorias_edicion on public.categorias for update to authenticated using((select public.es_admin())) with check((select public.es_admin()));
revoke all on public.categorias from public,anon,authenticated;
grant select on public.categorias to authenticated;
grant insert(nombre,descripcion,activo),update(nombre,descripcion,activo) on public.categorias to authenticated;
grant usage,select on sequence public.categorias_id_seq to authenticated;
create or replace function private.obtener_catalogo(p_articulo_id bigint default null,p_limite integer default 100,p_desde integer default 0)
returns table(articulo_id bigint,nombre text,categoria text,precio_base numeric,fotografia text,sobre_pedido boolean,variantes jsonb)
language plpgsql stable security definer set search_path='' as $$ begin
 if p_limite is null or p_desde is null or p_limite<1 or p_limite>100 or p_desde<0 then raise exception 'Página inválida.' using errcode='22023';end if;
 return query select a.id,a.nombre,a.categoria,a.precio_base,a.fotografia,a.sobre_pedido,
 (select jsonb_agg(jsonb_build_object('id',v.id,'talla_medida',v.talla_medida,'existencia',v.existencia) order by v.id) from public.variantes v where v.articulo_id=a.id)
 from public.articulos a join public.categorias c on c.id=a.categoria_id and c.activo
 where (p_articulo_id is null or a.id=p_articulo_id) and exists(select 1 from public.variantes v where v.articulo_id=a.id and v.existencia>0)
 order by a.nombre,a.id limit p_limite offset p_desde;
end;$$;
notify pgrst,'reload schema';
commit;
