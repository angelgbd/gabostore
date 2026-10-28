import { useEffect, useState } from 'react';
import type { PedidoResumen } from '../src/repositories/PedidoRepository.js';
import { solicitar, mensajeError } from './api.js';
import { Aviso, Cargando, dinero } from './componentes.js';
import { Icono } from './Icono.js';
import { EstadoPedido } from '../src/models.js';

interface PaginaPedidos { pedidos: PedidoResumen[]; desde: number; hayMas: boolean }
const fecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Hermosillo' });
const filtrosVacios = { numero: '', estado: '', fechaDesde: '', fechaHasta: '' };

export function PantallaPedidos({ token }: { token: string }) {
  const [desde, setDesde] = useState(0); const [revision, setRevision] = useState(0);
  const [pagina, setPagina] = useState<PaginaPedidos | null>(null);
  const [cargando, setCargando] = useState(true); const [error, setError] = useState('');
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [aplicados, setAplicados] = useState('');
  const [errorFiltros, setErrorFiltros] = useState('');
  const cambiar = (campo: keyof typeof filtrosVacios, valor: string) => setFiltros(actual => ({ ...actual, [campo]: valor }));
  useEffect(() => {
    let actual = true; setCargando(true); setError('');
    void solicitar<PaginaPedidos>(`personal/pedidos?desde=${desde}${aplicados ? `&${aplicados}` : ''}`, token).then(p => { if (actual) setPagina(p); })
      .catch(e => { if (actual) setError(mensajeError(e)); }).finally(() => { if (actual) setCargando(false); });
    return () => { actual = false; };
  }, [desde, token, revision, aplicados]);
  function buscar() {
    const numero = filtros.numero.trim().replace(/^#/, '');
    if (filtros.numero.trim() && (!/^[1-9]\d*$/.test(numero) || !Number.isSafeInteger(Number(numero)))) {
      setErrorFiltros('Introduce un número de pedido entero y positivo.'); return;
    }
    if (filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta) {
      setErrorFiltros('La fecha inicial no puede ser posterior a la fecha final.'); return;
    }
    const parametros = new URLSearchParams();
    for (const [campo, valor] of Object.entries({ ...filtros, numero })) if (valor) parametros.set(campo, valor);
    setErrorFiltros(''); setAplicados(parametros.toString()); setDesde(0); setRevision(n => n + 1);
  }
  function limpiar() {
    setFiltros(filtrosVacios); setAplicados(''); setDesde(0); setErrorFiltros(''); setRevision(n => n + 1);
  }
  const hayFiltros = Boolean(aplicados || Object.values(filtros).some(Boolean));
  return <>
    <a className="volver" href="#/"><Icono nombre="volver" tamano={16}/>Volver al catálogo</a>
    <div className="titulo-pagina"><div><h1>Pedidos</h1><p>Consulta los pedidos registrados, del más reciente al más antiguo.</p></div><a className="boton" href="#/carrito">Preparar pedido</a></div>
    <form className="filtros-pedidos" aria-label="Buscar pedidos" onSubmit={e => { e.preventDefault(); buscar(); }}>
      <label>Número de pedido<input inputMode="numeric" placeholder="Ej. 15" maxLength={17} value={filtros.numero} onChange={e => cambiar('numero', e.target.value)}/></label>
      <label>Estado<select value={filtros.estado} onChange={e => cambiar('estado', e.target.value)}><option value="">Todos los estados</option>{Object.values(EstadoPedido).map(estado => <option key={estado} value={estado}>{estado[0]}{estado.slice(1).toLowerCase()}</option>)}</select></label>
      <label>Fecha inicial<input type="date" value={filtros.fechaDesde} onInput={e => cambiar('fechaDesde', e.currentTarget.value)} onChange={e => cambiar('fechaDesde', e.target.value)}/></label>
      <label>Fecha final<input type="date" value={filtros.fechaHasta} onInput={e => cambiar('fechaHasta', e.currentTarget.value)} onChange={e => cambiar('fechaHasta', e.target.value)}/></label>
      <div className="acciones-filtros"><button className="boton" disabled={cargando}>Buscar</button><button type="button" className="boton secundario" disabled={!hayFiltros} onClick={limpiar}>Limpiar filtros</button></div>
      <p className="ayuda-filtros">Las fechas incluyen el día completo, en horario de Hermosillo.</p>
      {errorFiltros && <div className="error-filtros"><Aviso error>{errorFiltros}</Aviso></div>}
    </form>
    <div aria-busy={cargando}>
    {cargando ? <Cargando/> : error ? <div className="error-lista"><Aviso error>{error}</Aviso><button className="boton secundario" onClick={() => setRevision(n => n + 1)}>Volver a intentar</button></div>
      : !pagina?.pedidos.length ? <div className="estado-vacio" role="status"><h2>{aplicados ? 'No hay pedidos con estos filtros' : 'Aún no hay pedidos registrados'}</h2><p>{aplicados ? 'Prueba otro número, estado o rango de fechas.' : 'Cuando se registre un pedido, aparecerá aquí.'}</p>{aplicados ? <button className="boton secundario" onClick={limpiar}>Ver todos los pedidos</button> : <a className="boton secundario" href="#/carrito">Preparar pedido</a>}</div>
        : <><div className="cabecera-lista-pedidos" aria-hidden="true"><span>Pedido</span><span>Cliente</span><span>Fecha</span><span>Estado</span><span>Total</span></div>
          <ol className="lista-pedidos">{pagina.pedidos.map(p => <li key={p.id}><a href={`#/pedido/${p.id}`}>
            <span className="numero-pedido">Pedido #{p.id}</span><span className="cliente-pedido"><span className="sr-only">Cliente: </span>{p.cliente?.nombre ?? 'Pedido web'}</span>
            <time dateTime={p.fechaCreacion}>{fecha.format(new Date(p.fechaCreacion))}</time><span className="etiqueta estado-lista">{p.estado}</span><strong className="importe-pedido">{dinero(p.total)}</strong>
          </a></li>)}</ol>
          <nav className="paginacion-pedidos" aria-label="Páginas de pedidos"><button className="boton secundario" disabled={desde === 0} onClick={() => setDesde(n => Math.max(0, n - 20))}>Anterior</button><p role="status">Mostrando {desde + 1}–{desde + pagina.pedidos.length}</p><button className="boton secundario" disabled={!pagina.hayMas} onClick={() => setDesde(n => n + 20)}>Siguiente</button></nav>
        </>}
    </div>
  </>;
}
