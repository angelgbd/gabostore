import { useEffect, useRef, useState } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { cantidadValida, generarMensajeConsulta, leerSolicitud, resumirConsulta, seleccionarConsulta, type SolicitudConsulta, type ResumenConsulta } from '../src/negocio/SolicitudConsulta.js';
import { solicitar, mensajeError, ErrorAPI } from './api.js';
import type { PedidoPublicoRegistrado } from '../src/negocio/ControlPedidoPublico.js';
import { nuevoIntento, restaurarIntento } from './registroSolicitud.js';

const clave = 'gabostore-consulta-publica-v1';
export function useSolicitudConsulta() {
  const [solicitud, setSolicitud] = useState<SolicitudConsulta>(() => {
    try { return leerSolicitud(sessionStorage.getItem(clave)); } catch { return leerSolicitud(null); }
  });
  const [articulos, setArticulos] = useState<ArticuloCatalogo[]>([]);
  const [intento, setIntento] = useState(() => {
    try { return restaurarIntento(sessionStorage.getItem(`${clave}-registro`), solicitud.items); }
    catch { return nuevoIntento(solicitud.items); }
  });
  const [cargando, setCargando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [vista, setVista] = useState<{ mensaje: string; resumen: ResumenConsulta } | null>(null);
  const revision = useRef(0);
  const enCurso = useRef(false);
  const ids = [...new Set(solicitud.items.map(i => i.articuloId))].join(',');
  useEffect(() => { try { sessionStorage.setItem(`${clave}-registro`, JSON.stringify(intento)); } catch { /* Se conserva en memoria. */ } }, [intento]);
  useEffect(() => { try { sessionStorage.setItem(clave, JSON.stringify(solicitud)); } catch { /* La selección sigue en memoria si el navegador bloquea almacenamiento. */ } }, [solicitud]);
  useEffect(() => {
    let vigente = true;
    const actual = ++revision.current;
    if (!ids) { setArticulos([]); setCargando(false); return; }
    setCargando(true); setError('');
    void consultar(ids.split(',').map(Number)).then(datos => { if (vigente && actual === revision.current) setArticulos(datos); })
      .catch(e => { if (vigente && actual === revision.current) setError(mensajeError(e)); })
      .finally(() => { if (vigente && actual === revision.current) setCargando(false); });
    return () => { vigente = false; };
  }, [ids]);
  async function consultar(identificadores: number[]) {
    const datos = await Promise.all(identificadores.map(id => solicitar<ArticuloCatalogo>(`catalogo/${id}`).catch(e => {
      if (e instanceof ErrorAPI && e.estado === 404) return null;
      throw e;
    })));
    return datos.filter((a): a is ArticuloCatalogo => a !== null);
  }
  function agregar(articulo: ArticuloCatalogo, varianteId: number, cantidad: number) {
    setError('');
    const items = seleccionarConsulta(solicitud.items, articulo, varianteId, cantidad);
    setArticulos(anterior => [...anterior.filter(a => a.id !== articulo.id), articulo]);
    setSolicitud({ items }); setIntento(nuevoIntento(items)); setVista(null);
  }
  function cambiar(varianteId: number, cantidad: number) {
    if (!cantidadValida(cantidad)) throw new Error('La cantidad debe ser un entero positivo.');
    const linea = resumirConsulta(solicitud.items, articulos).items.find(i => i.varianteId === varianteId);
    if (!linea) return;
    if (!linea.sobrePedido && cantidad > linea.existencia) throw new Error(`Hay ${linea.existencia} unidades disponibles.`);
    const items = solicitud.items.map(i => i.varianteId === varianteId ? { ...i, cantidad } : i);
    setSolicitud({ items }); setIntento(nuevoIntento(items));
    setError(''); setVista(null);
  }
  function quitar(varianteId: number) {
    const items = solicitud.items.filter(i => i.varianteId !== varianteId);
    setSolicitud({ items }); setIntento(nuevoIntento(items));
    setError(''); setVista(null);
  }
  async function preparar() {
    if (enCurso.current) return;
    enCurso.current = true; setOcupado(true); setError('');
    const actual = ++revision.current;
    try {
      if (intento.registro) { setVista({ mensaje: intento.registro.mensaje, resumen: resumirConsulta(solicitud.items, articulos) }); return intento.registro.mensaje; }
      const datos = await consultar([...new Set(solicitud.items.map(i => i.articuloId))]);
      const resumen = resumirConsulta(solicitud.items, datos);
      setArticulos(datos);
      const mensaje = generarMensajeConsulta(solicitud, resumen);
      setVista({ mensaje, resumen });
      return mensaje;
    } catch (e) { setVista(null); setError(mensajeError(e)); throw e; }
    finally { if (actual === revision.current) setCargando(false); setOcupado(false); enCurso.current = false; }
  }
  async function registrar() {
    if (enCurso.current) return;
    enCurso.current = true; setOcupado(true); setError('');
    try {
      const registro = await solicitar<PedidoPublicoRegistrado>('pedidos/publicos', undefined, 'POST', {
        claveSolicitud: intento.claveSolicitud, items: solicitud.items.map(({ varianteId, cantidad }) => ({ varianteId, cantidad })),
      });
      const guardado = { ...intento, registro };
      try { sessionStorage.setItem(`${clave}-registro`, JSON.stringify(guardado)); } catch { /* Se conserva en memoria. */ }
      setIntento(guardado); setVista({ mensaje: registro.mensaje, resumen: resumirConsulta(solicitud.items, articulos) });
      return registro;
    } catch (e) { setError(mensajeError(e)); throw e; }
    finally { enCurso.current = false; setOcupado(false); }
  }
  function nueva() { setIntento(nuevoIntento(solicitud.items)); setVista(null); setError(''); }
  return { solicitud, resumen: resumirConsulta(solicitud.items, articulos), vista, registro: intento.registro, cargando, ocupado, error, agregar, cambiar, quitar, preparar, registrar, nueva };
}
