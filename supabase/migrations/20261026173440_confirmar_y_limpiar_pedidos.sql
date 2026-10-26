begin;
create or replace function public.proteger_carrito()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  -- Exclusión estrecha para la rutina privada del propietario: nunca para sesiones del personal.
  if tg_op='DELETE' and current_user=pg_get_userbyid((select relowner from pg_class where oid='public.pedidos'::regclass)) then
    if tg_table_name='carritos' then
      if old.cliente_id is null and old.cerrado and not exists(select 1 from public.pedidos where carrito_id=old.id) then return old; end if;
    elsif exists(select 1 from public.pedidos p where p.carrito_id=old.carrito_id and p.origen='PUBLICO' and p.estado='PENDIENTE' and p.vence_en<=clock_timestamp()) then return old;
    end if;
  end if;
  if tg_table_name = 'carritos' then
    if old.cerrado then
      raise exception 'El carrito está cerrado y forma parte del historial.' using errcode = '55000';
    end if;
    if tg_op = 'DELETE' then return old; end if;
    if new.cliente_id is distinct from old.cliente_id then
      raise exception 'El cliente del carrito no se puede cambiar.' using errcode = '55000';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.carrito_id <> old.carrito_id then
    raise exception 'No se puede mover una línea a otro carrito.' using errcode = '55000';
  end if;
  -- Todas las escrituras de líneas se serializan sobre su carrito.
  perform 1 from public.carritos
    where id = case when tg_op = 'DELETE' then old.carrito_id else new.carrito_id end
      and not cerrado for update;
  if not found then
    raise exception 'El carrito no existe, no es accesible o está cerrado.' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.proteger_pedido()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if tg_op='DELETE' then
    if current_user=pg_get_userbyid((select relowner from pg_class where oid='public.pedidos'::regclass)) then
      if tg_table_name='pedidos' then
        if old.origen='PUBLICO' and old.estado='PENDIENTE' and old.vence_en<=clock_timestamp() then return old; end if;
      elsif exists(select 1 from public.pedidos p where p.id=old.pedido_id and p.origen='PUBLICO' and p.estado='PENDIENTE' and p.vence_en<=clock_timestamp()) then return old;
      end if;
    end if;
    raise exception 'El historial solo admite la limpieza privada de pedidos públicos vencidos.' using errcode='55000';
  end if;
  if tg_table_name='items_pedido' then raise exception 'El contenido del pedido no se puede modificar.' using errcode='55000'; end if;
  if (to_jsonb(new)-'estado') is distinct from (to_jsonb(old)-'estado') then raise exception 'Solo se permite actualizar el estado del pedido.' using errcode='55000'; end if;
  if old.origen='PUBLICO' and old.estado='PENDIENTE' then
    if old.vence_en<=clock_timestamp() then raise exception 'El pedido venció y ya no puede confirmarse.' using errcode='55000'; end if;
    if new.estado not in ('PENDIENTE','CONFIRMADO') then raise exception 'Primero confirma el pedido público.' using errcode='55000'; end if;
  end if;
  return new;
end;
$$;

-- Las confirmaciones públicas pasan por la operación que comprueba disponibilidad.
drop policy personal_pedidos on public.pedidos;
create policy personal_pedidos_lectura on public.pedidos for select to authenticated using ((select public.es_personal()));
create policy personal_pedidos_estado on public.pedidos for update to authenticated
  using ((select public.es_personal()) and origen='PERSONAL') with check ((select public.es_personal()) and origen='PERSONAL');

create function private.confirmar_pedido(p_id bigint,p_confirmaciones bigint[] default '{}')
returns bigint language plpgsql security definer set search_path=''
as $$
declare v_pedido public.pedidos%rowtype;
begin
  if not public.es_personal() then raise exception 'Solo el personal puede confirmar pedidos.' using errcode='42501'; end if;
  select * into v_pedido from public.pedidos where id=p_id for update;
  if not found then raise exception 'El pedido no existe; pudo haber vencido.' using errcode='P0002'; end if;
  if v_pedido.estado='CONFIRMADO' then return p_id; end if;
  if v_pedido.estado<>'PENDIENTE' then raise exception 'Solo puedes confirmar pedidos pendientes.' using errcode='55000'; end if;
  if v_pedido.origen='PUBLICO' and v_pedido.vence_en<=clock_timestamp() then raise exception 'El pedido venció y ya no puede confirmarse.' using errcode='55000'; end if;
  perform v.id from public.items_pedido i join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id
    where i.pedido_id=p_id order by v.id for share of v,a;
  if exists(select 1 from public.items_pedido i join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id
    where i.pedido_id=p_id and not a.sobre_pedido and i.cantidad>v.existencia) then
    raise exception 'La disponibilidad cambió. Ajusta las existencias antes de confirmar.' using errcode='22023';
  end if;
  if exists(select 1 from public.items_pedido i join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id
    where i.pedido_id=p_id and a.sobre_pedido and not (i.variante_id=any(coalesce(p_confirmaciones,'{}'::bigint[])))) then
    raise exception 'Confirma con el proveedor las variantes sobre pedido.' using errcode='22023';
  end if;
  update public.pedidos set estado='CONFIRMADO' where id=p_id;
  return p_id;
end;
$$;
revoke all on function private.confirmar_pedido(bigint,bigint[]) from public,anon,authenticated,service_role;
grant execute on function private.confirmar_pedido(bigint,bigint[]) to authenticated;
create function public.confirmar_pedido(p_id bigint,p_confirmaciones bigint[] default '{}')
returns bigint language sql volatile security invoker set search_path=''
as $$ select private.confirmar_pedido(p_id,p_confirmaciones); $$;
revoke all on function public.confirmar_pedido(bigint,bigint[]) from public,anon,authenticated,service_role;
grant execute on function public.confirmar_pedido(bigint,bigint[]) to authenticated;

create function private.limpiar_pedidos_publicos_vencidos()
returns integer language plpgsql security definer set search_path=''
as $$
declare v record; v_total integer:=0;
begin
  for v in select id,carrito_id from public.pedidos where origen='PUBLICO' and estado='PENDIENTE' and vence_en<=clock_timestamp()
    order by vence_en,id limit 500 for update skip locked
  loop
    delete from public.items_carrito where carrito_id=v.carrito_id;
    delete from public.items_pedido where pedido_id=v.id;
    delete from public.pedidos where id=v.id;
    delete from public.carritos where id=v.carrito_id;
    v_total:=v_total+1;
  end loop;
  return v_total;
end;
$$;
-- Solo el propietario de la base y Cron pueden ejecutar el borrado.
revoke all on function private.limpiar_pedidos_publicos_vencidos() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
