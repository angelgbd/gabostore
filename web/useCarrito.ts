import { useEffect, useRef, useState } from 'react';
import type { CarritoDetalle, ContactoCliente } from '../src/negocio/ControlCarrito.js';
import { mensajeError, solicitar } from './api.js';

export function useCarrito(token: string | undefined, usuarioId: string | undefined) {
  const [carrito, setCarrito] = useState<CarritoDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const enCurso = useRef(false);
  const clave = usuarioId ? `gabostore-carrito-${usuarioId}` : '';
  useEffect(() => {
    let vigente = true;
    setCarrito(null); setError('');
    const id = clave ? Number(sessionStorage.getItem(clave)) : 0;
    if (!token || !id) { setCargando(false); return; }
    setCargando(true);
    void solicitar<CarritoDetalle>(`personal/carritos/${id}`, token).then(datos => {
      if (!vigente) return;
      if (datos.cerrado) sessionStorage.removeItem(clave);
      else setCarrito(datos);
    }).catch(e => { if (vigente) setError(mensajeError(e)); }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [token, clave]);

  async function operar(ruta: string, metodo: string, datos?: unknown): Promise<CarritoDetalle> {
    if (!token) throw new Error('Inicia sesión para preparar un pedido.');
    if (enCurso.current) throw new Error('Espera a que termine la operación actual.');
    enCurso.current = true; setOcupado(true); setError('');
    try {
      const resultado = await solicitar<CarritoDetalle>(ruta, token, metodo, datos);
      setCarrito(resultado); sessionStorage.setItem(clave, String(resultado.id));
      return resultado;
    } catch (e) { setError(mensajeError(e)); throw e; }
    finally { enCurso.current = false; setOcupado(false); }
  }
  return {
    carrito, cargando, ocupado, error,
    crear: (datos: ContactoCliente) => operar('personal/carritos', 'POST', datos),
    agregar: (articuloId: number, varianteId: number, cantidad: number) => {
      if (!carrito) return Promise.reject(new Error('Primero captura los datos del cliente en Nuevo pedido.'));
      return operar(`personal/carritos/${carrito.id}/items`, 'POST', { articuloId, varianteId, cantidad });
    },
    cambiar: (varianteId: number, cantidad: number) => operar(`personal/carritos/${carrito?.id}/items/${varianteId}`, 'PATCH', { cantidad }),
    quitar: (varianteId: number) => operar(`personal/carritos/${carrito?.id}/items/${varianteId}`, 'DELETE'),
    cerrar: () => { setCarrito(null); if (clave) sessionStorage.removeItem(clave); },
  };
}
