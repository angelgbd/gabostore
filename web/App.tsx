import { useEffect, useState } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { solicitar, mensajeError } from './api.js';
import { Aviso, Cargando, ErrorCarga } from './componentes.js';
import { PantallaCatalogo } from './PantallaCatalogo.js';
import { PantallaDetalleArticulo } from './PantallaDetalleArticulo.js';
import { AccesoPersonal } from './AccesoPersonal.js';
import { useSesion } from './useSesion.js';

export function App() {
  const sesion = useSesion();
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
    if (sesion.iniciando || ruta === '/personal') return;
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
  return <>
    <a className="saltar" href="#contenido">Saltar al contenido</a>
    <header className="cabecera"><div className="cabecera-interior"><a className="marca" href="#/" aria-label="GaboStore, catálogo">Gabo<span>Store</span></a><nav aria-label="Navegación principal"><a className="nav-activa nav-catalogo" href="#/">Catálogo</a>{sesion.personal ? <button className="boton secundario" onClick={() => { void salir(); }}>Salir</button> : <a className="boton secundario" href="#/personal">Personal</a>}</nav></div></header>
    <main id="contenido" className="contenedor">{sesion.iniciando ? <Cargando /> : ruta === '/personal' ? <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error} /> : <>
      {sesion.error && <Aviso error>{sesion.error}</Aviso>}
      {sesion.personal && <p className="sesion-personal">Sesión de personal · {sesion.personal.email}</p>}
      <div className="catalogo-layout"><section className="contenido-catalogo">{cargando ? <Cargando /> : error ? <ErrorCarga mensaje={error} /> : ruta.startsWith('/articulo/') && detalle ? <PantallaDetalleArticulo articulo={detalle} /> : <PantallaCatalogo articulos={articulos} />}</section></div>
    </>}</main>
    <footer className="pie">GaboStore · Catálogo de artículos</footer>
  </>;
}
