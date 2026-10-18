import { useState, type FormEvent } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { Aviso, dinero, Fotografia, nombreArticulo } from './componentes.js';

export function PantallaDetalleArticulo({ articulo, personal = false, tieneCarrito = false, ocupado = false, agregar }: {
  articulo: ArticuloCatalogo; personal?: boolean; tieneCarrito?: boolean; ocupado?: boolean;
  agregar?: (articuloId: number, varianteId: number, cantidad: number) => Promise<unknown>;
}) {
  const [varianteId, setVarianteId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const elegida = articulo.variantes.find(v => v.id === varianteId);
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setAgregado(false);
    if (!varianteId || !agregar) return;
    try { await agregar(articulo.id, varianteId, cantidad); setAgregado(true); }
    catch { /* El error de negocio aparece en el aviso del flujo. */ }
  }
  return <>
    <a className="volver" href="#/">Volver al catálogo</a>
    <div className="detalle-articulo">
      <Fotografia ruta={articulo.fotografia} nombre={nombreArticulo(articulo.nombre)} />
      <div><h1>{nombreArticulo(articulo.nombre)}</h1><p className="categoria-texto">{articulo.categoria}</p><p className="precio-detalle">{dinero(articulo.precioBase)}</p>
        {articulo.sobrePedido && <p className="nota">Artículo sobre pedido. Consulta con el negocio por WhatsApp para confirmar su disponibilidad con el proveedor.</p>}
        <h2>Variantes y disponibilidad</h2>
        <ul className="variantes">{articulo.variantes.map(v => <li key={v.id}><strong>{v.tallaMedida}</strong><span className={v.existencia ? 'disponible' : 'agotado'}>{v.existencia ? `${v.existencia} disponibles` : 'Agotada'}</span></li>)}</ul>
        {!articulo.variantes.length && <p className="nota">Este artículo aún no tiene variantes registradas.</p>}
        {personal && (tieneCarrito ? <form className="formulario agregar-articulo" onSubmit={e => { void enviar(e); }}>
          <label>Variante<select value={varianteId ?? ''} onChange={e => { setVarianteId(Number(e.target.value)); setCantidad(1); setAgregado(false); }} required><option value="" disabled>Selecciona una variante</option>{articulo.variantes.map(v => <option key={v.id} value={v.id} disabled={!articulo.sobrePedido && !v.existencia}>{v.tallaMedida}{!v.existencia ? ' · Agotada' : ''}</option>)}</select></label>
          <label>Cantidad<input type="number" min="1" step="1" max={articulo.sobrePedido ? undefined : elegida?.existencia} value={cantidad} onChange={e => { setCantidad(Number(e.target.value)); setAgregado(false); }} required /></label>
          <button className="boton" type="submit" disabled={ocupado || !elegida}>{ocupado ? 'Añadiendo…' : 'Añadir al carrito'}</button>
          {agregado && <Aviso>Variante añadida al carrito. <a href="#/carrito">Revisar carrito</a></Aviso>}
        </form> : <div className="empezar-pedido"><p className="nota">Captura primero los datos del cliente para preparar su pedido.</p><a className="boton" href="#/carrito">Nuevo pedido</a></div>)}
      </div>
    </div>
  </>;
}
