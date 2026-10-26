import { useEffect, useState } from 'react';
import type { PedidoResumen } from '../src/repositories/PedidoRepository.js';
import { solicitar, mensajeError } from './api.js';
import { Aviso, Cargando, dinero } from './componentes.js';
import { Icono } from './Icono.js';

interface PaginaPedidos { pedidos: PedidoResumen[]; desde: number; hayMas: boolean }
const fecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export function PantallaPedidos({ token }: { token: string }) {
  const [desde, setDesde] = useState(0); const [revision, setRevision] = useState(0);
  const [pagina, setPagina] = useState<PaginaPedidos | null>(null);
  const [cargando, setCargando] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    let actual = true; setCargando(true); setError('');
    void solicitar<PaginaPedidos>(`personal/pedidos?desde=${desde}`, token).then(p => { if (actual) setPagina(p); })
      .catch(e => { if (actual) setError(mensajeError(e)); }).finally(() => { if (actual) setCargando(false); });
    return () => { actual = false; };
  }, [desde, token, revision]);
  return <>
    <a className="volver" href="#/"><Icono nombre="volver" tamano={16}/>Volver al catálogo</a>
    <div className="titulo-pagina"><div><h1>Pedidos</h1><p>Consulta los pedidos registrados, del más reciente al más antiguo.</p></div><a className="boton" href="#/carrito">Preparar pedido</a></div>
    {cargando ? <Cargando/> : error ? <div className="error-lista"><Aviso error>{error}</Aviso><button className="boton secundario" onClick={() => setRevision(n => n + 1)}>Volver a intentar</button></div>
      : !pagina?.pedidos.length ? <div className="estado-vacio"><h2>Aún no hay pedidos registrados</h2><p>Cuando el personal registre un pedido, aparecerá aquí.</p><a className="boton secundario" href="#/carrito">Preparar pedido</a></div>
        : <><div className="cabecera-lista-pedidos" aria-hidden="true"><span>Pedido</span><span>Cliente</span><span>Fecha</span><span>Estado</span><span>Total</span></div>
          <ol className="lista-pedidos">{pagina.pedidos.map(p => <li key={p.id}><a href={`#/pedido/${p.id}`}>
            <span className="numero-pedido">Pedido #{p.id}</span><span className="cliente-pedido"><span className="sr-only">Cliente: </span>{p.cliente?.nombre ?? 'Pedido web'}</span>
            <time dateTime={p.fechaCreacion}>{fecha.format(new Date(p.fechaCreacion))}</time><span className="etiqueta estado-lista">{p.estado}</span><strong className="importe-pedido">{dinero(p.total)}</strong>
          </a></li>)}</ol>
          <nav className="paginacion-pedidos" aria-label="Páginas de pedidos"><button className="boton secundario" disabled={desde === 0} onClick={() => setDesde(n => Math.max(0, n - 20))}>Anterior</button><p role="status">Mostrando {desde + 1}–{desde + pagina.pedidos.length}</p><button className="boton secundario" disabled={!pagina.hayMas} onClick={() => setDesde(n => n + 20)}>Siguiente</button></nav>
        </>}
  </>;
}
