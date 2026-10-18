import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { dinero, Fotografia, nombreArticulo } from './componentes.js';

export function PantallaDetalleArticulo({ articulo }: { articulo: ArticuloCatalogo }) {
  return <>
    <a className="volver" href="#/">Volver al catálogo</a>
    <div className="detalle-articulo">
      <Fotografia ruta={articulo.fotografia} nombre={nombreArticulo(articulo.nombre)} />
      <div><h1>{nombreArticulo(articulo.nombre)}</h1><p className="categoria-texto">{articulo.categoria}</p><p className="precio-detalle">{dinero(articulo.precioBase)}</p>
        {articulo.sobrePedido && <p className="nota">Artículo sobre pedido. Consulta con el negocio por WhatsApp para confirmar su disponibilidad con el proveedor.</p>}
        <h2>Variantes y disponibilidad</h2>
        <ul className="variantes">{articulo.variantes.map(v => <li key={v.id}><strong>{v.tallaMedida}</strong><span className={v.existencia ? 'disponible' : 'agotado'}>{v.existencia ? `${v.existencia} disponibles` : 'Agotada'}</span></li>)}</ul>
        {!articulo.variantes.length && <p className="nota">Este artículo aún no tiene variantes registradas.</p>}
      </div>
    </div>
  </>;
}
