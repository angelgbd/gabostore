import { useEffect, useState, type FormEvent } from 'react';
import type { LineaConsulta } from '../src/negocio/SolicitudConsulta.js';
import type { useSolicitudConsulta } from './useSolicitudConsulta.js';
import { Aviso, Cargando, dinero, Fotografia, nombreArticulo } from './componentes.js';
import { Icono } from './Icono.js';
import { mensajeError } from './api.js';

function CantidadConsulta({ item, ocupado, cambiar }: { item: LineaConsulta; ocupado: boolean; cambiar: (id: number, cantidad: number) => void }) {
  const [valor, setValor] = useState(String(item.cantidad));
  const [error, setError] = useState('');
  useEffect(() => setValor(String(item.cantidad)), [item.cantidad]);
  function aplicar(cantidad: number) {
    try { cambiar(item.varianteId, cantidad); setError(''); }
    catch (e) { setError(mensajeError(e)); }
    setValor(String(item.cantidad));
  }
  return <><div className="cantidad-control"><button type="button" disabled={ocupado || item.cantidad <= 1} aria-label={`Disminuir ${nombreArticulo(item.nombre)} ${item.tallaMedida}`} onClick={() => aplicar(item.cantidad - 1)}><Icono nombre="menos" tamano={12}/></button><input type="number" min="1" step="1" value={valor} disabled={ocupado} aria-label={`Cantidad de ${nombreArticulo(item.nombre)} ${item.tallaMedida}`} onChange={e => setValor(e.target.value)} onBlur={() => { if (Number(valor) !== item.cantidad) aplicar(Number(valor)); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /><button type="button" disabled={ocupado || (!item.sobrePedido && item.cantidad >= item.existencia)} aria-label={`Aumentar ${nombreArticulo(item.nombre)} ${item.tallaMedida}`} onClick={() => aplicar(item.cantidad + 1)}><Icono nombre="mas" tamano={12}/></button></div>{error && <p className="error-linea" role="alert">{error}</p>}</>;
}

export function PantallaSolicitud({ consulta }: { consulta: ReturnType<typeof useSolicitudConsulta> }) {
  const { resumen, solicitud, cargando, ocupado } = consulta;
  async function generar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    try { const mensaje = await consulta.preparar(); if (mensaje) location.hash = '#/mensaje'; } catch { /* El aviso conserva la solicitud y explica el problema. */ }
  }
  return <><div className="titulo-pagina titulo-solicitud"><h1><a href="#/" aria-label="Volver al catálogo"><Icono nombre="volver" tamano={18}/></a>Mi pedido</h1><span className="contador">{solicitud.items.reduce((n, i) => n + i.cantidad, 0)} art.</span></div>
    {consulta.error && <Aviso error>{consulta.error}</Aviso>}
    {!solicitud.items.length ? <div className="estado-vacio"><h2>Tu carrito está vacío</h2><p>Elige un artículo y su variante para preparar una consulta.</p><a className="boton" href="#/">Ver catálogo</a></div> : cargando ? <Cargando/> : <div className="solicitud-layout"><section aria-label="Artículos de la solicitud"><ul className="lineas-solicitud">{resumen.items.map(item => <li key={item.varianteId}>
      <a href={`#/articulo/${item.articuloId}`} className="miniatura-solicitud" aria-label={`Ver ${nombreArticulo(item.nombre)}`}><Fotografia ruta={item.fotografia} nombre={nombreArticulo(item.nombre)}/></a>
      <div className="solicitud-descripcion"><h2><a href={`#/articulo/${item.articuloId}`}>{nombreArticulo(item.nombre)}</a></h2><p>Variante {item.tallaMedida}</p><CantidadConsulta item={item} ocupado={ocupado} cambiar={consulta.cambiar}/><button className="boton texto eliminar" type="button" disabled={ocupado} onClick={() => consulta.quitar(item.varianteId)}>Eliminar</button></div>
      <strong className="importe-linea">{item.precioUnitario === null ? 'Por confirmar' : dinero(Math.round(item.precioUnitario * 100) * item.cantidad / 100)}</strong>
      {item.problema && <p className="error-linea problema-solicitud" role="alert">{item.problema}</p>}
    </li>)}</ul><a className="volver seguir" href="#/">Seguir consultando artículos</a></section>
      <aside className="resumen-solicitud"><dl className="importes-solicitud"><div><dt>Subtotal{resumen.parcial ? ' conocido' : ''}</dt><dd>{dinero(resumen.subtotal)}</dd></div><div><dt>Envío</dt><dd>A confirmar</dd></div></dl><div className="total"><span>{resumen.parcial ? 'Total parcial estimado' : 'Total estimado'}</span><strong>{dinero(resumen.subtotal)} <small>MXN</small></strong></div>
        {resumen.parcial && <p className="nota">Hay artículos con precio y disponibilidad por confirmar.</p>}
        <form className="contacto-solicitud" onSubmit={e => { void generar(e); }}><label>Correo de contacto<input type="email" autoComplete="email" maxLength={254} required value={solicitud.correoContacto} disabled={ocupado} onChange={e => consulta.correo(e.target.value)} placeholder="cliente@email.com" /></label><p className="nota">Se utiliza únicamente como dato de contacto. No crea una cuenta.</p><button className="boton whatsapp ancho" type="submit" disabled={ocupado}><Icono nombre="whatsapp" tamano={18}/>{ocupado ? 'Comprobando artículos…' : 'Generar mensaje de WhatsApp'}</button></form>
        <p className="nota nota-solicitud">La solicitud no registra un pedido, un pago ni una reserva.</p>
      </aside></div>}
  </>;
}
