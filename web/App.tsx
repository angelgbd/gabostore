import { useEffect, useState } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { solicitar, mensajeError } from './api.js';
import { Aviso, Cargando, ErrorCarga } from './componentes.js';
import { PantallaCatalogo } from './PantallaCatalogo.js';
import { PantallaDetalleArticulo } from './PantallaDetalleArticulo.js';
import { AccesoPersonal } from './AccesoPersonal.js';
import { useSesion } from './useSesion.js';
import { useCarrito } from './useCarrito.js';
import { PantallaCarrito } from './PantallaCarrito.js';
import { ResumenPedido } from './ResumenPedido.js';

export function App() {
  const sesion = useSesion();
  const carrito = useCarrito(sesion.token, sesion.personal?.id);
  const [ruta, setRuta] = useState(location.hash.slice(1) || '/');
  const [articulos, setArticulos] = useState<ArticuloCatalogo[]>([]);
  const [detalle, setDetalle] = useState<ArticuloCatalogo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const cambio = () => setRuta(location.hash.slice(1) || '/');
    addEventListener('hashchange', cambio);
    return () => removeEventListener('hashchange', cambio);
  }, []);
  useEffect(() => {
    if (sesion.iniciando || ruta === '/personal' || ruta === '/carrito') return;
    let actual = true;
    setCargando(true); setError('');
    const id = ruta.match(/^\/articulo\/(\d+)$/)?.[1];
    const prefijo = sesion.personal ? 'personal/' : '';
    const consulta = id ? solicitar<ArticuloCatalogo>(`${prefijo}catalogo/${id}`, sesion.token).then(a => { if (actual) setDetalle(a); })
      : solicitar<ArticuloCatalogo[]>(`${prefijo}catalogo`, sesion.token).then(a => { if (actual) setArticulos(a); });
    void consulta.catch(e => { if (actual) setError(mensajeError(e)); }).finally(() => { if (actual) setCargando(false); });
    return () => { actual = false; };
  }, [ruta, sesion.token, sesion.personal, sesion.iniciando]);
  async function salir() {
    try { await sesion.salir(); location.hash = '#/'; }
    catch (e) { setError(mensajeError(e)); }
  }
  const unidades = carrito.carrito?.items.reduce((total, item) => total + item.cantidad, 0) ?? 0;
  const esCatalogo = ruta === '/' || ruta.startsWith('/articulo/');
  return <>
    <a className="saltar" href="#contenido">Saltar al contenido</a>
    <header className="cabecera"><div className="cabecera-interior"><a className="marca" href="#/" aria-label="GaboStore, catálogo">Gabo<span>Store</span></a><nav aria-label="Navegación principal"><a className="nav-activa nav-catalogo" href="#/">Catálogo</a>{sesion.personal ? <><a className="nav-carrito" href="#/carrito">Carrito <span className="unidades">{unidades}</span></a><button className="boton secundario" disabled={carrito.ocupado} onClick={() => { void salir(); }}>Salir</button></> : <a className="boton secundario" href="#/personal">Personal</a>}</nav></div></header>
    <main id="contenido" className="contenedor">{sesion.iniciando ? <Cargando /> : ruta === '/personal' ? <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error} /> : <>
      {sesion.error && <Aviso error>{sesion.error}</Aviso>}
      {carrito.error && <Aviso error>{carrito.error}</Aviso>}
      {sesion.personal && <p className="sesion-personal">Sesión de personal · {sesion.personal.email}</p>}
      {ruta === '/carrito' ? sesion.personal ? carrito.cargando ? <Cargando /> : <PantallaCarrito carrito={carrito.carrito} ocupado={carrito.ocupado} crear={carrito.crear} cambiar={carrito.cambiar} quitar={carrito.quitar} /> : <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error} /> :
        <div className={`catalogo-layout${sesion.personal && esCatalogo ? ' con-pedido' : ''}`}><section className="contenido-catalogo">{cargando ? <Cargando /> : error ? <ErrorCarga mensaje={error} /> : ruta.startsWith('/articulo/') && detalle ? <PantallaDetalleArticulo key={detalle.id} articulo={detalle} personal={Boolean(sesion.personal)} tieneCarrito={Boolean(carrito.carrito)} ocupado={carrito.ocupado} agregar={carrito.agregar} /> : <PantallaCatalogo articulos={articulos} />}</section>{sesion.personal && esCatalogo && <ResumenPedido carrito={carrito.carrito} cargando={carrito.cargando} />}</div>}
    </>}</main>
    <footer className="pie">GaboStore · Catálogo de artículos</footer>
  </>;
}
