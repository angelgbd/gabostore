import type { CarritoDetalle } from '../src/negocio/ControlCarrito.js';
import { dinero, nombreArticulo } from './componentes.js';

export function ResumenPedido({ carrito, cargando }: { carrito: CarritoDetalle | null; cargando: boolean }) {
  return <aside className="resumen-pedido" aria-label="Resumen del pedido"><h2>Pedido en preparación</h2>
    {cargando ? <p className="nota">Cargando carrito…</p> : carrito ? <>
      <p className="cliente-resumen">{carrito.cliente.nombre}</p>
      {carrito.items.length ? <ul className="resumen-lineas">{carrito.items.map(item => <li key={item.varianteId}><div><strong>{nombreArticulo(item.nombre)}</strong><span>{item.tallaMedida} · {item.cantidad} unidades</span></div><strong>{dinero(item.subtotal)}</strong></li>)}</ul> : <p className="nota">Elige un artículo y añade una variante para comenzar.</p>}
      <div className="total"><span>Total</span><strong>{dinero(carrito.total)}</strong></div>
      <a className="boton ancho" href="#/carrito">Ver carrito</a>
    </> : <><p className="nota">Captura los datos del cliente y prepara su pedido con los artículos del catálogo.</p><a className="boton ancho" href="#/carrito">Nuevo pedido</a></>}
    <p className="nota">El pedido se registra como pendiente. No representa un pago.</p>
  </aside>;
}
