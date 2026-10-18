import { useEffect, useState } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { solicitar, mensajeError } from './api.js';
import { Cargando, ErrorCarga } from './componentes.js';
import { PantallaCatalogo } from './PantallaCatalogo.js';
import { PantallaDetalleArticulo } from './PantallaDetalleArticulo.js';

export function App() {
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
    let actual = true;
    setCargando(true); setError('');
    const id = ruta.match(/^\/articulo\/(\d+)$/)?.[1];
    const consulta = id ? solicitar<ArticuloCatalogo>(`catalogo/${id}`).then(a => { if (actual) setDetalle(a); })
      : solicitar<ArticuloCatalogo[]>('catalogo').then(a => { if (actual) setArticulos(a); });
    void consulta.catch(e => { if (actual) setError(mensajeError(e)); }).finally(() => { if (actual) setCargando(false); });
    return () => { actual = false; };
  }, [ruta]);
  return <>
    <a className="saltar" href="#contenido">Saltar al contenido</a>
    <header className="cabecera"><div className="cabecera-interior"><a className="marca" href="#/" aria-label="GaboStore, catálogo">Gabo<span>Store</span></a><nav aria-label="Navegación principal"><a className="nav-activa" href="#/">Catálogo</a></nav></div></header>
    <main id="contenido" className="contenedor"><div className="catalogo-layout"><section className="contenido-catalogo">{cargando ? <Cargando /> : error ? <ErrorCarga mensaje={error} /> : ruta.startsWith('/articulo/') && detalle ? <PantallaDetalleArticulo articulo={detalle} /> : <PantallaCatalogo articulos={articulos} />}</section></div></main>
    <footer className="pie">GaboStore · Catálogo de artículos</footer>
  </>;
}
