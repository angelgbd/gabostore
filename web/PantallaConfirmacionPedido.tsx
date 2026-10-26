import { useState, type FormEvent } from 'react';
import type { CarritoDetalle } from '../src/negocio/ControlCarrito.js';
import type { PedidoDetalle } from '../src/negocio/ControlGeneracionPedido.js';
import { dinero, nombreArticulo } from './componentes.js';

export function PantallaConfirmacionPedido({ carrito, pedido, registrando, registrar }: {
  carrito: CarritoDetalle | null; pedido?: PedidoDetalle | null; registrando: boolean;
  registrar: (confirmaciones: number[]) => Promise<void>;
}) {
  const [confirmadas, setConfirmadas] = useState<number[]>([]);
  const datos = pedido ?? carrito;
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    await registrar(confirmadas);
  }
  if (!datos || !datos.items.length) return <div className="estado-vacio"><h1>No hay un pedido para revisar</h1><p>Prepara un carrito con al menos un artículo.</p><a className="boton" href="#/carrito">Ir al carrito</a></div>;
  const sobrePedido = datos.items.filter(item => item.sobrePedido);
  return <>
    {!pedido && <a className="volver" href="#/carrito">Volver al carrito</a>}
    {pedido && <a className="volver" href="#/pedidos">Volver a pedidos</a>}
    <div className="titulo-pagina"><div><h1>{pedido ? 'Pedido registrado' : 'Revisar pedido'}</h1><p>{pedido ? `Pedido #${pedido.id} · ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(pedido.fechaCreacion))}` : 'Comprueba los datos antes de registrar el pedido.'}</p></div>{pedido && <span className="etiqueta">{pedido.estado === 'PENDIENTE' ? 'Pendiente' : pedido.estado}</span>}</div>
    {pedido && <div className="confirmacion-exito" role="status"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg><p>El pedido y sus detalles quedaron guardados. Puedes continuar con otro pedido.</p></div>}
    <div className="carrito-layout"><section aria-label="Detalle del pedido"><ul className="lineas-carrito revision">{datos.items.map(item => <li key={item.varianteId}><div className="linea-descripcion"><h2>{nombreArticulo(item.nombre)}</h2><p>Variante {item.tallaMedida} · {item.cantidad} {item.cantidad === 1 ? 'unidad' : 'unidades'} × {dinero(item.precioUnitario)}</p></div><strong>{dinero(item.subtotal)}</strong></li>)}</ul></section>
      <aside className="datos-pedido"><h2>Cliente y total</h2><dl className="datos-cliente"><div><dt>Cliente</dt><dd>{datos.cliente.nombre}</dd></div><div><dt>Teléfono</dt><dd>{datos.cliente.telefono}</dd></div></dl><div className="total"><span>Total</span><strong>{dinero(datos.total)}</strong></div><p className="nota">Este pedido no registra un pago ni reserva unidades.</p></aside>
    </div>
    {pedido ? <div className="acciones-confirmacion"><a className="boton" href="#/carrito">Preparar otro pedido</a><a className="boton secundario" href="#/">Volver al catálogo</a></div> : <form className="registro-pedido" onSubmit={e => { void enviar(e); }}>
      {sobrePedido.length > 0 && <fieldset><legend>Confirmación del proveedor</legend><p className="nota">Confirma únicamente las variantes cuya disponibilidad ya consultaste con el proveedor.</p>{sobrePedido.map(item => <label className="confirmacion-check" key={item.varianteId}><input type="checkbox" required disabled={registrando} checked={confirmadas.includes(item.varianteId)} onChange={e => setConfirmadas(actual => e.target.checked ? [...actual, item.varianteId] : actual.filter(id => id !== item.varianteId))} /><span>Disponibilidad confirmada: {nombreArticulo(item.nombre)}, variante {item.tallaMedida}.</span></label>)}</fieldset>}
      <div className="acciones-confirmacion"><button className="boton" type="submit" disabled={registrando}>{registrando ? 'Registrando pedido…' : 'Registrar pedido pendiente'}</button><a className="boton secundario" href="#/carrito">Revisar carrito</a></div>
    </form>}
  </>;
}
