import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import type { PedidoDetalle } from '../src/negocio/ControlGeneracionPedido.js';
import { solicitar, mensajeError } from './api.js';
import { Aviso, Cargando, ErrorCarga } from './componentes.js';
import { PantallaCatalogo } from './PantallaCatalogo.js';
import { PantallaDetalleArticulo } from './PantallaDetalleArticulo.js';
import { AccesoPersonal } from './AccesoPersonal.js';
import { useSesion } from './useSesion.js';
import { useCarrito } from './useCarrito.js';
import { PantallaCarrito } from './PantallaCarrito.js';
import { ResumenPedido } from './ResumenPedido.js';
import { PantallaConfirmacionPedido } from './PantallaConfirmacionPedido.js';
import { useSolicitudConsulta } from './useSolicitudConsulta.js';
import { PantallaSolicitud } from './PantallaSolicitud.js';
import { PantallaMensaje } from './PantallaMensaje.js';
import { cargarConfiguracion } from './configuracion.js';
import { Icono, Logotipo } from './Icono.js';
import { PantallaProducto } from './PantallaProducto.js';
import { PantallaPedidos } from './PantallaPedidos.js';
const PantallaGestion = lazy(() => import('./PantallaGestion.js').then(m => ({default:m.PantallaGestion})));

export function App() {
  const sesion = useSesion();
  const carrito = useCarrito(sesion.token, sesion.personal?.id);
  const consulta = useSolicitudConsulta();
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [ruta, setRuta] = useState(location.hash.slice(1) || '/');
  const rutaActual = useRef(ruta);
  const posicionCatalogo = useRef(0);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [articulos, setArticulos] = useState<ArticuloCatalogo[]>([]);
  const [detalle, setDetalle] = useState<ArticuloCatalogo | null>(null);
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const registroEnCurso = useRef(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { void cargarConfiguracion().then(c => setWhatsapp(c.whatsappNumero)).catch(() => {}); }, []);
  useEffect(() => {
    const cambio = () => {
      const siguiente = location.hash.slice(1) || '/';
      if (rutaActual.current === '/') posicionCatalogo.current = window.scrollY;
      rutaActual.current = siguiente;
      setRuta(siguiente);
    };
    addEventListener('hashchange', cambio);
    return () => removeEventListener('hashchange', cambio);
  }, []);
  useEffect(() => {
    if (ruta !== '/') window.scrollTo(0, 0);
    document.title = `GaboStore · ${ruta === '/pedidos' ? 'Pedidos' : ruta === '/productos/nuevo' ? 'Nuevo producto' : ruta.startsWith('/productos/') ? 'Editar producto' : ruta === '/solicitud' ? 'Mi pedido' : ruta === '/mensaje' ? 'Mensaje de WhatsApp' : ruta === '/personal' ? 'Acceso del personal' : ruta === '/carrito' ? 'Carrito' : ruta === '/confirmar' ? 'Revisar pedido' : ruta.startsWith('/pedido/') ? 'Pedido registrado' : ruta.startsWith('/articulo/') ? 'Detalle del artículo' : 'Catálogo'}`;
  }, [ruta]);
  useEffect(() => {
    if (ruta === '/' && !cargando && !sesion.iniciando) window.scrollTo(0, posicionCatalogo.current);
  }, [ruta, cargando, sesion.iniciando]);
  useEffect(() => {
    if (sesion.iniciando || ruta.startsWith('/gestion/') || ruta.startsWith('/productos/') || ['/pedidos', '/personal', '/carrito', '/confirmar', '/solicitud', '/mensaje'].includes(ruta)) return;
    let actual = true;
    setCargando(true); setError('');
    const id = ruta.match(/^\/articulo\/(\d+)$/)?.[1];
    const pedidoId = ruta.match(/^\/pedido\/(\d+)$/)?.[1];
    const prefijo = sesion.personal ? 'personal/' : '';
    if (pedidoId && !sesion.token) { setCargando(false); return; }
    const consulta = pedidoId ? solicitar<PedidoDetalle>(`personal/pedidos/${pedidoId}`, sesion.token).then(p => { if (actual) setPedido(p); })
      : id ? solicitar<ArticuloCatalogo>(`${prefijo}catalogo/${id}`, sesion.token).then(a => { if (actual) setDetalle(a); })
      : solicitar<ArticuloCatalogo[]>(`${prefijo}catalogo`, sesion.token).then(a => { if (actual) setArticulos(a); });
    void consulta.catch(e => { if (actual) setError(mensajeError(e)); }).finally(() => { if (actual) setCargando(false); });
    return () => { actual = false; };
  }, [ruta, sesion.token, sesion.personal, sesion.iniciando]);
  async function salir() {
    try { await sesion.salir(); location.hash = '#/'; }
    catch (e) { setError(mensajeError(e)); }
  }
  async function registrar(confirmacionesProveedor: number[]) {
    if (!carrito.carrito || !sesion.token || registroEnCurso.current) return;
    registroEnCurso.current = true; setRegistrando(true); setError('');
    try {
      const resultado = await solicitar<PedidoDetalle>('personal/pedidos', sesion.token, 'POST', {
        carritoId: carrito.carrito.id, confirmacionesProveedor,
      });
      setPedido(resultado); carrito.cerrar(); location.hash = `#/pedido/${resultado.id}`;
    } catch (e) { setError(mensajeError(e)); }
    finally { registroEnCurso.current = false; setRegistrando(false); }
  }
  async function confirmarPedido(confirmacionesProveedor: number[]) {
    if (!pedido || !sesion.token || registroEnCurso.current) return;
    registroEnCurso.current = true; setRegistrando(true); setError('');
    try { setPedido(await solicitar<PedidoDetalle>(`personal/pedidos/${pedido.id}/confirmar`, sesion.token, 'POST', { confirmacionesProveedor })); }
    catch (e) { setError(mensajeError(e)); }
    finally { registroEnCurso.current = false; setRegistrando(false); }
  }
  const publico = !sesion.personal || ruta === '/solicitud' || ruta === '/mensaje';
  const unidades = publico ? consulta.solicitud.items.reduce((total, item) => total + item.cantidad, 0) : carrito.carrito?.items.reduce((total, item) => total + item.cantidad, 0) ?? 0;
  const esCatalogo = ruta === '/' || ruta.startsWith('/articulo/');
  const mostrarResumen = Boolean(sesion.personal && esCatalogo && (carrito.carrito || carrito.cargando));
  return <>
    <a className="saltar" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    <header className="cabecera"><div className="cabecera-interior"><a className="marca" href="#/" aria-label="GaboStore, catálogo"><Logotipo/></a>
      <nav aria-label="Navegación principal"><a className={`nav-catalogo${esCatalogo ? ' nav-activa' : ''}`} href="#/" aria-current={esCatalogo ? 'page' : undefined}>Catálogo</a>
        {sesion.personal && <a href="#/pedidos" className={ruta === '/pedidos' ? 'nav-activa' : ''} aria-current={ruta === '/pedidos' ? 'page' : undefined}>Pedidos</a>}
        {sesion.personal && <a href="#/gestion/usuarios" className={ruta.startsWith('/gestion/')?'nav-activa':''}>Gestión</a>}
        <a className="nav-carrito" href={publico ? '#/solicitud' : '#/carrito'} aria-label={`${publico ? 'Mi pedido' : 'Carrito del personal'}, ${unidades} ${unidades === 1 ? 'artículo' : 'artículos'}`}><Icono nombre="carrito"/><span className="unidades">{unidades}</span></a>
        {sesion.personal ? <><span className="sesion-personal" title={sesion.personal.email} aria-label={`Personal: ${sesion.personal.email}`}>Personal</span><button className="cuenta-salir" disabled={carrito.ocupado || registrando} onClick={() => { void salir(); }}>Salir</button></> : <a href="#/personal" className="acceso-enlace">Personal<span className="sr-only">: acceso del personal</span></a>}
      </nav></div></header>
    <main id="contenido" className={`contenedor${ruta.startsWith('/articulo/') ? ' pagina-detalle' : ''}`} tabIndex={-1}>{sesion.iniciando ? <Cargando /> : ruta === '/solicitud' ? <PantallaSolicitud consulta={consulta}/> : ruta === '/mensaje' ? <PantallaMensaje consulta={consulta} numero={whatsapp}/> : ruta === '/personal' ? <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error} /> : <>
      {sesion.error && <Aviso error>{sesion.error}</Aviso>}
      {carrito.error && <Aviso error>{carrito.error}</Aviso>}
      {sesion.personal && (ruta === '/carrito' || ruta === '/confirmar') && <ol className="pasos" aria-label="Etapas del pedido"><li><a href="#/">Artículos</a></li><li className={ruta === '/carrito' ? 'paso-actual' : ''}><a href="#/carrito">Carrito</a></li><li className={ruta === '/confirmar' ? 'paso-actual' : ''}>Confirmación</li></ol>}
      {error && !esCatalogo && <Aviso error>{error}</Aviso>}
      {ruta.startsWith('/gestion/') ? !sesion.personal ? <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error}/> : <Suspense fallback={<Cargando/>}><PantallaGestion ruta={ruta} token={sesion.token!} personal={sesion.personal}/></Suspense> : ruta === '/pedidos' ? !sesion.personal ? <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error}/> : <PantallaPedidos token={sesion.token!}/> :
        ruta.startsWith('/productos/') ? !sesion.personal ? <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error}/> : <PantallaProducto key={ruta} token={sesion.token!} {...(ruta.match(/^\/productos\/(\d+)\/editar$/)?.[1] ? { id: Number(ruta.match(/^\/productos\/(\d+)\/editar$/)![1]) } : {})}/> :
        ruta === '/carrito' ? sesion.personal ? carrito.cargando ? <Cargando /> : <PantallaCarrito carrito={carrito.carrito} ocupado={carrito.ocupado} crear={carrito.crear} cambiar={carrito.cambiar} quitar={carrito.quitar} /> : <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error} /> :
        ruta === '/confirmar' ? sesion.personal ? carrito.cargando ? <Cargando /> : <PantallaConfirmacionPedido carrito={carrito.carrito} registrando={registrando} registrar={registrar} /> : <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error} /> :
        ruta.startsWith('/pedido/') ? !sesion.personal ? <AccesoPersonal iniciar={sesion.iniciar} errorSesion={sesion.error} /> : cargando ? <Cargando /> : error ? <ErrorCarga mensaje={error} /> : <PantallaConfirmacionPedido key={pedido?.id} carrito={null} pedido={pedido} registrando={registrando} registrar={registrar} confirmar={confirmarPedido} /> :
        <div className={`catalogo-layout${mostrarResumen ? ' con-pedido' : ''}`}><section className="contenido-catalogo">{cargando ? <Cargando /> : error ? <ErrorCarga mensaje={error} /> : ruta.startsWith('/articulo/') && detalle ? <PantallaDetalleArticulo key={detalle.id} articulo={detalle} personal={Boolean(sesion.personal)} tieneCarrito={Boolean(carrito.carrito)} ocupado={sesion.personal ? carrito.ocupado : consulta.ocupado} agregar={sesion.personal ? carrito.agregar : async (_articuloId, varianteId, cantidad) => consulta.agregar(detalle, varianteId, cantidad)} /> : <PantallaCatalogo articulos={articulos} busqueda={busqueda} categoria={categoria} setBusqueda={setBusqueda} setCategoria={setCategoria} personal={Boolean(sesion.personal)} nuevoPedido={Boolean(sesion.personal && !carrito.carrito)} />}</section>{mostrarResumen && <ResumenPedido carrito={carrito.carrito} cargando={carrito.cargando} />}</div>}
    </>}</main>
  </>;
}
