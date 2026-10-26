import { useEffect, useRef, useState } from 'react';
import type { ArticuloCatalogo } from '../src/negocio/ControlCatalogo.js';
import { cantidadValida, generarMensajeConsulta, leerSolicitud, resumirConsulta, seleccionarConsulta, type SolicitudConsulta, type ResumenConsulta } from '../src/negocio/SolicitudConsulta.js';
import { solicitar, mensajeError, ErrorAPI } from './api.js';

const clave = 'gabostore-consulta-publica-v1';
export function useSolicitudConsulta() {
  const [solicitud, setSolicitud] = useState<SolicitudConsulta>(() => {
    try { return leerSolicitud(sessionStorage.getItem(clave)); } catch { return leerSolicitud(null); }
  });
  const [articulos, setArticulos] = useState<ArticuloCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [vista, setVista] = useState<{ mensaje: string; resumen: ResumenConsulta } | null>(null);
  const revision = useRef(0);
  const enCurso = useRef(false);
  const ids = [...new Set(solicitud.items.map(i => i.articuloId))].join(',');
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
    setSolicitud(anterior => ({ ...anterior, items })); setVista(null);
  }
  function cambiar(varianteId: number, cantidad: number) {
    if (!cantidadValida(cantidad)) throw new Error('La cantidad debe ser un entero positivo.');
    const linea = resumirConsulta(solicitud.items, articulos).items.find(i => i.varianteId === varianteId);
    if (!linea) return;
    if (!linea.sobrePedido && cantidad > linea.existencia) throw new Error(`Hay ${linea.existencia} unidades disponibles.`);
    setSolicitud(anterior => ({ ...anterior, items: anterior.items.map(i => i.varianteId === varianteId ? { ...i, cantidad } : i) }));
    setError(''); setVista(null);
  }
  function quitar(varianteId: number) {
    setSolicitud(anterior => ({ ...anterior, items: anterior.items.filter(i => i.varianteId !== varianteId) }));
    setError(''); setVista(null);
  }
  async function preparar() {
    if (enCurso.current) return;
    enCurso.current = true; setOcupado(true); setError('');
    const actual = ++revision.current;
    try {
      const datos = await consultar([...new Set(solicitud.items.map(i => i.articuloId))]);
      const resumen = resumirConsulta(solicitud.items, datos);
      setArticulos(datos);
      const mensaje = generarMensajeConsulta(solicitud, resumen);
      setVista({ mensaje, resumen });
      return mensaje;
    } catch (e) { setVista(null); setError(mensajeError(e)); throw e; }
    finally { if (actual === revision.current) setCargando(false); setOcupado(false); enCurso.current = false; }
  }
  return { solicitud, resumen: resumirConsulta(solicitud.items, articulos), vista, cargando, ocupado, error, agregar, cambiar, quitar, preparar };
}
