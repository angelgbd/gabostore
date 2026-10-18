import { useState } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { dinero, Fotografia, nombreArticulo } from './componentes.js';

export function PantallaCatalogo({ articulos }: { articulos: ArticuloCatalogo[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const categorias = ['Todas', ...new Set(articulos.map(a => a.categoria))];
  const consulta = busqueda.trim().toLocaleLowerCase('es');
  const visibles = articulos.filter(a => (categoria === 'Todas' || a.categoria === categoria)
    && `${a.nombre} ${a.categoria}`.toLocaleLowerCase('es').includes(consulta));
  return <>
    <div className="titulo-pagina"><div><h1>Catálogo</h1><p>Artículos, variantes y disponibilidad actual.</p></div><span className="contador">{articulos.length} artículos</span></div>
    <label className="busqueda">Buscar artículos<input type="search" placeholder="Nombre o categoría" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
    <div className="categorias" aria-label="Filtrar por categoría">{categorias.map(c => <button key={c} className={categoria === c ? 'categoria activa' : 'categoria'} aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>)}</div>
    {visibles.length ? <div className="productos">{visibles.map(articulo => <a className="producto" href={`#/articulo/${articulo.id}`} key={articulo.id}>
      <Fotografia ruta={articulo.fotografia} nombre={nombreArticulo(articulo.nombre)} />
      <div className="producto-info"><div className="producto-nombre"><h2>{nombreArticulo(articulo.nombre)}</h2>{articulo.nombre.startsWith('DEMO') && <span className="etiqueta neutra">Demo</span>}</div>
        <p className="categoria-texto">{articulo.categoria}</p>
        <div className="producto-precio"><strong>{dinero(articulo.precioBase)}</strong>{articulo.sobrePedido && <span className="etiqueta">Sobre pedido</span>}</div>
        <div className="producto-pie"><span>{articulo.existenciaTotal > 0 ? `${articulo.existenciaTotal} disponibles` : 'Sin existencias'}</span><span className="enlace">Ver variantes</span></div>
      </div>
    </a>)}</div> : <div className="estado-vacio"><h2>{articulos.length ? 'No encontramos coincidencias' : 'No hay artículos disponibles'}</h2><p>{articulos.length ? 'Prueba con otro nombre o categoría.' : 'El catálogo mostrará los artículos cuando tengan existencias.'}</p>{articulos.length > 0 && <button className="boton secundario" onClick={() => { setBusqueda(''); setCategoria('Todas'); }}>Limpiar filtros</button>}</div>}
  </>;
}
