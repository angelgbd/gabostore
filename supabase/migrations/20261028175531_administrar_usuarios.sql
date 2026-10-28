begin;
-- La autorización consulta la cuenta actual, incluso con un JWT anterior al cambio de rol.
create function private.rol_personal_actual() returns text
language sql stable security definer set search_path='' as $$
 select u.raw_app_meta_data->>'rol' from auth.users u where u.id=(select auth.uid())
 and coalesce(u.raw_app_meta_data->>'activo','true')='true'
 and (u.banned_until is null or u.banned_until<=now())
 and u.raw_app_meta_data->>'rol' in ('ADMIN','EMPLEADO');
$$;
revoke all on function private.rol_personal_actual() from public,anon,authenticated;
grant execute on function private.rol_personal_actual() to authenticated;
create or replace function public.es_personal() returns boolean
language sql stable security invoker set search_path='' as $$ select private.rol_personal_actual() is not null; $$;
create function public.es_admin() returns boolean
language sql stable security invoker set search_path='' as $$ select coalesce(private.rol_personal_actual()='ADMIN',false); $$;
revoke all on function public.es_admin() from public,anon,authenticated;
grant execute on function public.es_admin() to authenticated;

create table private.auditoria (
 id bigint generated always as identity primary key,
 fecha timestamptz not null default now(), actor uuid not null,
 operacion text not null, entidad text not null, entidad_id text not null
);
alter table private.auditoria enable row level security;
revoke all on private.auditoria from public,anon,authenticated,service_role;

create function private.listar_personal(p_desde integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.es_admin() then raise exception 'Solo el administrador puede gestionar usuarios.' using errcode='42501'; end if;
 if p_desde<0 then raise exception 'Página inválida.' using errcode='22023'; end if;
 return coalesce((select jsonb_agg(to_jsonb(t)) from (
 select u.id,u.email,coalesce(u.raw_user_meta_data->>'nombre','') nombre,u.raw_app_meta_data->>'rol' rol,
 coalesce(u.raw_app_meta_data->>'activo','true')='true' activo
 from auth.users u where u.raw_app_meta_data->>'rol' in ('ADMIN','EMPLEADO') order by u.created_at desc,u.id limit 21 offset p_desde) t),'[]'::jsonb);
end; $$;
create function private.actualizar_personal(p_id uuid,p_nombre text,p_rol text,p_activo boolean) returns void
language plpgsql security definer set search_path='' as $$
declare anterior jsonb;
begin
 if not public.es_admin() then raise exception 'Solo el administrador puede gestionar usuarios.' using errcode='42501'; end if;
 if p_rol not in ('ADMIN','EMPLEADO') or p_activo is null or length(btrim(p_nombre)) not between 1 and 120 then raise exception 'Datos del usuario inválidos.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(2801001);
 select raw_app_meta_data into anterior from auth.users where id=p_id for update;
 if not found or anterior->>'rol' not in ('ADMIN','EMPLEADO') then raise exception 'Usuario no encontrado.' using errcode='P0002'; end if;
 if p_id=auth.uid() and (not p_activo or p_rol<>'ADMIN') then raise exception 'No puedes quitar tu propio acceso de administrador.' using errcode='22023'; end if;
 if anterior->>'rol'='ADMIN' and (not p_activo or p_rol<>'ADMIN') and not exists(
 select 1 from auth.users where id<>p_id and raw_app_meta_data->>'rol'='ADMIN' and coalesce(raw_app_meta_data->>'activo','true')='true'
 and (banned_until is null or banned_until<=now())) then raise exception 'Debe permanecer al menos un administrador activo.' using errcode='22023'; end if;
 update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('rol',p_rol,'activo',p_activo),
 raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('nombre',btrim(p_nombre)),updated_at=now() where id=p_id;
 insert into private.auditoria(actor,operacion,entidad,entidad_id) values(auth.uid(),'MODIFICAR','USUARIO',p_id::text);
end; $$;
create function public.listar_personal(p_desde integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.listar_personal(p_desde); $$;
create function public.actualizar_personal(p_id uuid,p_nombre text,p_rol text,p_activo boolean) returns void
language sql security invoker set search_path='' as $$ select private.actualizar_personal(p_id,p_nombre,p_rol,p_activo); $$;
revoke all on function private.listar_personal(integer),private.actualizar_personal(uuid,text,text,boolean),public.listar_personal(integer),public.actualizar_personal(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function private.listar_personal(integer),private.actualizar_personal(uuid,text,text,boolean),public.listar_personal(integer),public.actualizar_personal(uuid,text,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
