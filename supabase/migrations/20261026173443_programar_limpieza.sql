begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('gabostore-limpiar-pendientes-publicos','* * * * *',
  'select private.limpiar_pedidos_publicos_vencidos();');
commit;
