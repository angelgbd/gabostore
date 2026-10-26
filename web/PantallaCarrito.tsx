import { useEffect, useState, type FormEvent } from 'react';
import type { CarritoDetalle, ContactoCliente, LineaCarrito } from '../src/negocio/ControlCarrito.js';
import { dinero, nombreArticulo } from './componentes.js';

interface Props {
  carrito: CarritoDetalle | null;
  ocupado: boolean;
  crear: (contacto: ContactoCliente) => Promise<unknown>;
  cambiar: (varianteId: number, cantidad: number) => Promise<unknown>;
  quitar: (varianteId: number) => Promise<unknown>;
}

function Cantidad({ item, ocupado, cambiar }: { item: LineaCarrito; ocupado: boolean; cambiar: Props['cambiar'] }) {
  const [valor, setValor] = useState(String(item.cantidad));
  useEffect(() => setValor(String(item.cantidad)), [item.cantidad]);
  async function aplicar(cantidad: number) {
    if (!Number.isInteger(cantidad) || cantidad < 1) { setValor(String(item.cantidad)); return; }
    try { await cambiar(item.varianteId, cantidad); }
    catch { setValor(String(item.cantidad)); }
  }
  return <div className="cantidad-control"><button type="button" disabled={ocupado || item.cantidad <= 1} aria-label={`Disminuir cantidad de ${nombreArticulo(item.nombre)} ${item.tallaMedida}`} onClick={() => { void aplicar(item.cantidad - 1); }}>−</button><input type="number" min="1" max={item.sobrePedido ? undefined : item.existencia} step="1" inputMode="numeric" value={valor} disabled={ocupado} aria-label={`Cantidad de ${nombreArticulo(item.nombre)} ${item.tallaMedida}`} onChange={e => setValor(e.target.value)} onBlur={() => { if (Number(valor) !== item.cantidad) void aplicar(Number(valor)); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /><button type="button" disabled={ocupado || (!item.sobrePedido && item.cantidad >= item.existencia)} aria-label={`Aumentar cantidad de ${nombreArticulo(item.nombre)} ${item.tallaMedida}`} onClick={() => { void aplicar(item.cantidad + 1); }}>+</button></div>;
}

export function PantallaCarrito({ carrito, ocupado, crear, cambiar, quitar }: Props) {
  async function crearPedido(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    try {
      await crear({ nombre: String(datos.get('nombre')), telefono: String(datos.get('telefono')) });
      location.hash = '#/';
    } catch { /* El error de negocio se muestra en el aviso del flujo. */ }
  }
  if (!carrito) return <div className="nuevo-pedido"><a className="volver" href="#/">Volver al catálogo</a><h1>Nuevo pedido</h1><p className="nota">Captura los datos del cliente que solicitó el pedido por WhatsApp.</p>
    <form className="formulario" onSubmit={e => { void crearPedido(e); }}><label>Nombre del cliente<input name="nombre" autoComplete="name" required minLength={2} maxLength={120} /></label><label>Teléfono<input name="telefono" type="tel" autoComplete="tel" required maxLength={25} placeholder="Ej. 662 123 4567" /></label><button className="boton" type="submit" disabled={ocupado}>{ocupado ? 'Preparando carrito…' : 'Continuar a los artículos'}</button></form>
  </div>;
  return <><a className="volver" href="#/">Seguir seleccionando artículos</a><div className="titulo-pagina"><div><h1>Carrito</h1><p>Revisa las variantes y cantidades del pedido.</p></div><span className="etiqueta">En preparación</span></div>
    <div className="carrito-layout"><section aria-label="Artículos del carrito">{carrito.items.length ? <ul className="lineas-carrito">{carrito.items.map(item => <li key={item.varianteId}>
      <div className="linea-descripcion"><a href={`#/articulo/${item.articuloId}`}><h2>{nombreArticulo(item.nombre)}</h2></a><p>Variante {item.tallaMedida} · {dinero(item.precioUnitario)} por unidad</p>{item.sobrePedido && <span className="etiqueta">Sobre pedido</span>}</div>
      <div className="linea-controles"><Cantidad item={item} ocupado={ocupado} cambiar={cambiar} /><strong>{dinero(item.subtotal)}</strong><button className="boton texto" type="button" disabled={ocupado} onClick={() => { void quitar(item.varianteId).catch(() => {}); }}>Quitar</button></div>
    </li>)}</ul> : <div className="estado-vacio"><h2>El carrito está vacío</h2><p>Selecciona un artículo, su variante y la cantidad solicitada.</p><a className="boton" href="#/">Elegir artículos</a></div>}</section>
    <aside className="datos-pedido"><h2>Datos del pedido</h2><dl className="datos-cliente"><div><dt>Cliente</dt><dd>{carrito.cliente.nombre}</dd></div><div><dt>Teléfono</dt><dd>{carrito.cliente.telefono}</dd></div></dl><div className="total"><span>Total</span><strong>{dinero(carrito.total)}</strong></div><p className="nota">El pedido conservará los precios que aparecen aquí.</p>{carrito.items.length > 0 && <a className="boton ancho" href="#/confirmar" aria-disabled={ocupado} onClick={e => { if (ocupado) e.preventDefault(); }}>Revisar pedido</a>}</aside></div>
  </>;
}
