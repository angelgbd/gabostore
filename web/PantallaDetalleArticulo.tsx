import { useState, type FormEvent } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { Aviso, dinero, Fotografia, nombreArticulo } from './componentes.js';
import { Icono } from './Icono.js';
import { mensajeError } from './api.js';

export function PantallaDetalleArticulo({ articulo, personal = false, tieneCarrito = false, ocupado = false, agregar }: {
  articulo: ArticuloCatalogo; personal?: boolean; tieneCarrito?: boolean; ocupado?: boolean;
  agregar?: (articuloId: number, varianteId: number, cantidad: number) => Promise<unknown>;
}) {
  const [varianteId, setVarianteId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const [error, setError] = useState('');
  const elegida = articulo.variantes.find(v => v.id === varianteId);
  const puedeAgregar = articulo.activo!==false && (!personal || tieneCarrito);
  const rutaCarrito = personal ? '#/carrito' : '#/solicitud';
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setAgregado(false); setError('');
    if (!varianteId || !agregar) return;
    try { await agregar(articulo.id, varianteId, cantidad); setAgregado(true); }
    catch (e) { setError(mensajeError(e)); }
  }
  function cambiarCantidad(valor: number) { setCantidad(valor); setAgregado(false); setError(''); }
  return <>
    <a className="volver" href="#/"><Icono nombre="volver" tamano={16}/>Detalle del artículo</a>
    <div className={`detalle-articulo${puedeAgregar ? ' detalle-con-accion' : ''}`}>
      <Fotografia ruta={articulo.fotografia} nombre={nombreArticulo(articulo.nombre)} />
      <div className="detalle-informacion"><div className="detalle-encabezado"><h1>{nombreArticulo(articulo.nombre)}</h1><p className="precio-detalle">{dinero(articulo.precioBase===null?null:Math.round((articulo.precioBase+(elegida?.recargo??0))*100)/100)}</p></div><p className="etiqueta categoria-detalle">{articulo.categoria}</p>
        {personal && <a className="boton secundario editar-desde-detalle" href={`#/productos/${articulo.id}/editar`}>Editar producto</a>}
        {articulo.sobrePedido && <p className="nota">Artículo sobre pedido. Precio y disponibilidad sujetos a confirmación con el negocio.</p>}
        {puedeAgregar ? <form className="formulario agregar-articulo" onSubmit={e => { void enviar(e); }}>
          <fieldset className="opciones-variantes"><legend>Talla / medida</legend><div className="variantes-selector">{articulo.variantes.map(v => <label className="opcion-variante" title={`${v.tallaMedida}: ${v.existencia ? `${v.existencia} disponibles` : 'Agotada'}`} key={v.id}><input type="radio" name="variante" value={v.id} checked={varianteId === v.id} disabled={ocupado || v.activo===false || (!articulo.sobrePedido && !v.existencia)} required onChange={() => { setVarianteId(v.id); setCantidad(1); setAgregado(false); setError(''); }} /><strong>{v.tallaMedida}{Boolean(v.recargo)&&<small> +{dinero(v.recargo??0)}</small>}{v.activo===false&&<small> · Inactiva</small>}</strong><span className="sr-only">{v.existencia ? `${v.existencia} disponibles` : 'Agotada'}</span></label>)}</div></fieldset>
          <p className="disponibilidad-seleccion" aria-live="polite">{elegida ? articulo.sobrePedido ? 'Disponibilidad a confirmar con el proveedor.' : `${elegida.existencia} disponibles` : 'Selecciona una variante disponible.'}</p>
          <label className="etiqueta-cantidad" htmlFor="cantidad-articulo">Cantidad</label>
          <div className="cantidad-control cantidad-detalle"><button type="button" aria-label="Disminuir cantidad" disabled={ocupado || cantidad <= 1} onClick={() => cambiarCantidad(cantidad - 1)}><Icono nombre="menos" tamano={14}/></button><input id="cantidad-articulo" type="number" min="1" step="1" max={articulo.sobrePedido ? undefined : elegida?.existencia} value={cantidad} disabled={ocupado} onChange={e => cambiarCantidad(Number(e.target.value))} required /><button type="button" aria-label="Aumentar cantidad" disabled={ocupado || (!articulo.sobrePedido && Boolean(elegida) && cantidad >= (elegida?.existencia ?? 0))} onClick={() => cambiarCantidad(cantidad + 1)}><Icono nombre="mas" tamano={14}/></button></div>
          {error && <Aviso error>{error}</Aviso>}
          {agregado && <Aviso>Variante añadida. <a href={rutaCarrito}>Ver {personal ? 'carrito' : 'mi pedido'}</a></Aviso>}
          <div className="accion-agregar"><button className="boton ancho" type="submit" disabled={ocupado || !elegida}>{ocupado ? 'Añadiendo…' : 'Agregar al carrito'}</button></div>
        </form> : <><h2>Variantes y disponibilidad</h2><ul className="variantes">{articulo.variantes.map(v => <li key={v.id}><strong>{v.tallaMedida}</strong><span>{v.existencia ? `${v.existencia} disponibles` : 'Agotada'}</span></li>)}</ul><div className="empezar-pedido"><p className="nota">Captura los datos del cliente para preparar su pedido.</p><a className="boton" href="#/carrito">Nuevo pedido</a></div></>}
        {!articulo.variantes.length && <p className="nota">Este artículo aún no tiene variantes registradas.</p>}
      </div>
    </div>
  </>;
}
