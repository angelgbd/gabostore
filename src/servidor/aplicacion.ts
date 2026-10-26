import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { crearCapaDatos } from '../index.js';
import { crearClienteSupabase, type ClienteSupabase } from '../supabase.js';
import { crearCapaNegocio, ErrorNegocio } from '../negocio/index.js';
import { ErrorDatos } from '../errors.js';
import { numeroWhatsApp } from '../negocio/SolicitudConsulta.js';
import { limiteFotografia, extensionesFotografia } from '../fotografias.js';
import type { ArticuloNuevo, CambiosArticulo } from '../models.js';

export interface OpcionesServidor {
  url: string;
  clavePublica: string;
  carpetaWeb: string;
  whatsappNumero?: string;
  conectar?: (token?: string) => ClienteSupabase;
}

class ErrorHTTP extends Error {
  constructor(readonly estado: number, mensaje: string) { super(mensaje); }
}

function numero(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 1) throw new ErrorHTTP(400, 'El identificador o cantidad no es válido.');
  return valor;
}

function cadena(valor: unknown): string {
  if (typeof valor !== 'string') throw new ErrorHTTP(400, 'Los campos de texto deben contener texto.');
  return valor;
}

function camposArticulo(datos: Record<string, unknown>): CambiosArticulo {
  const ficha: CambiosArticulo = {};
  if (datos.nombre !== undefined) ficha.nombre = cadena(datos.nombre);
  if (datos.categoria !== undefined) ficha.categoria = cadena(datos.categoria);
  if (datos.fotografia !== undefined) ficha.fotografia = cadena(datos.fotografia);
  if (datos.precioBase !== undefined) {
    if (typeof datos.precioBase !== 'number') throw new ErrorHTTP(400, 'El precio debe ser un número.');
    ficha.precioBase = datos.precioBase;
  }
  if (datos.sobrePedido !== undefined) {
    if (typeof datos.sobrePedido !== 'boolean') throw new ErrorHTTP(400, 'Sobre pedido debe ser verdadero o falso.');
    ficha.sobrePedido = datos.sobrePedido;
  }
  return ficha;
}

async function imagen(peticion: IncomingMessage) {
  const tipo = peticion.headers['content-type'] ?? '';
  if (!extensionesFotografia[tipo]) throw new ErrorHTTP(415, 'Elige una imagen JPEG, PNG o WebP.');
  if (Number(peticion.headers['content-length']) > limiteFotografia) {
    peticion.resume(); throw new ErrorHTTP(413, 'La imagen supera el límite de 5 MiB.');
  }
  const partes: Buffer[] = []; let longitud = 0;
  for await (const fragmento of peticion) {
    const parte = Buffer.from(fragmento as Uint8Array); longitud += parte.length;
    if (longitud > limiteFotografia) throw new ErrorHTTP(413, 'La imagen supera el límite de 5 MiB.');
    partes.push(parte);
  }
  return { contenido: Buffer.concat(partes), tipo };
}

async function cuerpo(peticion: IncomingMessage): Promise<Record<string, unknown>> {
  if (!peticion.headers['content-type']?.startsWith('application/json')) throw new ErrorHTTP(415, 'Envía los datos como JSON.');
  let longitud = 0;
  const partes: Buffer[] = [];
  for await (const fragmento of peticion) {
    const parte = Buffer.from(fragmento as Uint8Array);
    longitud += parte.length;
    if (longitud > 16_384) throw new ErrorHTTP(413, 'La solicitud es demasiado grande.');
    partes.push(parte);
  }
  try {
    const valor: unknown = JSON.parse(Buffer.concat(partes).toString('utf8'));
    if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) throw new Error();
    return valor as Record<string, unknown>;
  } catch { throw new ErrorHTTP(400, 'Los datos enviados no son un objeto JSON válido.'); }
}

function json(respuesta: ServerResponse, valor: unknown, estado = 200): void {
  respuesta.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  respuesta.end(JSON.stringify(valor));
}

export function crearServidor(opciones: OpcionesServidor) {
  const conectar = opciones.conectar ?? ((token?: string) => crearClienteSupabase({
    url: opciones.url, clavePublica: opciones.clavePublica,
    ...(token ? { tokenUsuario: token } : {}),
  }));
  const publico = conectar();
  const negocioPublico = crearCapaNegocio(crearCapaDatos(publico));
  const raiz = resolve(opciones.carpetaWeb);

  return createServer(async (peticion, respuesta) => {
    respuesta.setHeader('X-Content-Type-Options', 'nosniff');
    respuesta.setHeader('Referrer-Policy', 'no-referrer');
    respuesta.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data: blob:; connect-src 'self' ${new URL(opciones.url).origin}; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
    try {
      const ruta = new URL(peticion.url ?? '/', 'http://localhost');
      const metodo = peticion.method ?? 'GET';
      if (ruta.pathname.startsWith('/api/')) {
        if (metodo === 'GET' && ruta.pathname === '/api/config') {
          return json(respuesta, { url: opciones.url, clavePublica: opciones.clavePublica, whatsappNumero: numeroWhatsApp(opciones.whatsappNumero) });
        }
        const personal = ruta.pathname.startsWith('/api/personal/');
        let negocio = negocioPublico;
        let identidad: { id: string; email: string | undefined; rol: string } | undefined;
        if (personal) {
          const cabecera = peticion.headers.authorization;
          if (!cabecera?.startsWith('Bearer ') || cabecera.length > 16_384) throw new ErrorHTTP(401, 'Inicia sesión con tu cuenta de personal.');
          const token = cabecera.slice(7);
          const { data, error } = await publico.auth.getUser(token);
          if (error || !data.user) throw new ErrorHTTP(error && error.status && error.status >= 500 ? 503 : 401, 'La sesión no es válida. Inicia sesión nuevamente.');
          const rol: unknown = data.user.app_metadata.rol;
          if (rol !== 'ADMIN' && rol !== 'EMPLEADO') throw new ErrorHTTP(403, 'Esta cuenta no tiene acceso de personal.');
          identidad = { id: data.user.id, email: data.user.email, rol };
          negocio = crearCapaNegocio(crearCapaDatos(conectar(token)));
        }
        if (metodo === 'GET' && ruta.pathname === '/api/personal/sesion') return json(respuesta, identidad);
        if (metodo === 'GET' && (ruta.pathname === '/api/catalogo' || ruta.pathname === '/api/personal/catalogo')) {
          const limite = Number(ruta.searchParams.get('limite') ?? 100);
          const desde = Number(ruta.searchParams.get('desde') ?? 0);
          return json(respuesta, await negocio.catalogo.listar(personal, limite, desde));
        }
        const articulo = ruta.pathname.match(/^\/api\/(?:personal\/)?catalogo\/(\d+)$/);
        if (metodo === 'GET' && articulo) return json(respuesta, await negocio.catalogo.detalle(Number(articulo[1]), personal));
        if (personal) {
          if (metodo === 'POST' && ruta.pathname === '/api/personal/imagenes') {
            const archivo = await imagen(peticion);
            return json(respuesta, { fotografia: await negocio.catalogo.subirFotografia(archivo.contenido, archivo.tipo, identidad!.id) }, 201);
          }
          if (metodo === 'POST' && ruta.pathname === '/api/personal/catalogo') {
            const datos = await cuerpo(peticion);
            if (!Array.isArray(datos.variantes)) throw new ErrorHTTP(400, 'Agrega las variantes del artículo.');
            const nuevo: ArticuloNuevo = { ...camposArticulo(datos), nombre: cadena(datos.nombre), categoria: cadena(datos.categoria),
              precioBase: datos.precioBase as number, variantes: datos.variantes.map((entrada: unknown) => {
                if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new ErrorHTTP(400, 'La variante no es válida.');
                const v = entrada as Record<string, unknown>;
                if (typeof v.existencia !== 'number') throw new ErrorHTTP(400, 'La existencia debe ser un número entero.');
                return { tallaMedida: cadena(v.tallaMedida), existencia: v.existencia };
              }) };
            return json(respuesta, await negocio.catalogo.crear(nuevo), 201);
          }
          if (metodo === 'PATCH' && articulo) {
            const datos = await cuerpo(peticion);
            if ('variantes' in datos) throw new ErrorHTTP(400, 'Ajusta las existencias desde el control de cada variante.');
            return json(respuesta, await negocio.catalogo.actualizar(Number(articulo[1]), camposArticulo(datos)));
          }
          const existencias = ruta.pathname.match(/^\/api\/personal\/catalogo\/(\d+)\/variantes\/(\d+)\/existencias$/);
          if (metodo === 'POST' && existencias) {
            const datos = await cuerpo(peticion);
            if (typeof datos.cambio !== 'number') throw new ErrorHTTP(400, 'El ajuste debe ser un número entero.');
            return json(respuesta, await negocio.catalogo.ajustarExistencia(Number(existencias[1]), Number(existencias[2]), datos.cambio));
          }
          if (metodo === 'GET' && ruta.pathname === '/api/personal/pedidos') return json(respuesta, await negocio.pedidos.listar(Number(ruta.searchParams.get('desde') ?? 0)));
          if (metodo === 'POST' && ruta.pathname === '/api/personal/carritos') {
            const datos = await cuerpo(peticion);
            return json(respuesta, await negocio.carritos.crear({ nombre: cadena(datos.nombre), telefono: cadena(datos.telefono) }), 201);
          }
          const carrito = ruta.pathname.match(/^\/api\/personal\/carritos\/(\d+)$/);
          if (metodo === 'GET' && carrito) return json(respuesta, await negocio.carritos.detalle(Number(carrito[1])));
          const items = ruta.pathname.match(/^\/api\/personal\/carritos\/(\d+)\/items(?:\/(\d+))?$/);
          if (items) {
            const carritoId = Number(items[1]);
            if (metodo === 'POST' && !items[2]) {
              const datos = await cuerpo(peticion);
              return json(respuesta, await negocio.carritos.agregar(carritoId, numero(datos.articuloId), numero(datos.varianteId), numero(datos.cantidad)));
            }
            if (metodo === 'PATCH' && items[2]) {
              const datos = await cuerpo(peticion);
              return json(respuesta, await negocio.carritos.cambiarCantidad(carritoId, Number(items[2]), numero(datos.cantidad)));
            }
            if (metodo === 'DELETE' && items[2]) return json(respuesta, await negocio.carritos.quitar(carritoId, Number(items[2])));
          }
          if (metodo === 'POST' && ruta.pathname === '/api/personal/pedidos') {
            const datos = await cuerpo(peticion);
            const confirmaciones = datos.confirmacionesProveedor ?? [];
            if (!Array.isArray(confirmaciones)) throw new ErrorHTTP(400, 'Las confirmaciones deben ser una lista.');
            return json(respuesta, await negocio.pedidos.generar(numero(datos.carritoId), confirmaciones.map(numero)), 201);
          }
          const pedido = ruta.pathname.match(/^\/api\/personal\/pedidos\/(\d+)$/);
          if (metodo === 'GET' && pedido) return json(respuesta, await negocio.pedidos.obtener(Number(pedido[1])));
        }
        throw new ErrorHTTP(404, 'No se encontró esta operación.');
      }
      if (metodo !== 'GET' && metodo !== 'HEAD') throw new ErrorHTTP(405, 'Método no permitido.');
      const nombre = decodeURIComponent(ruta.pathname) === '/' ? '/index.html' : decodeURIComponent(ruta.pathname);
      const archivo = resolve(raiz, `.${nombre}`);
      const tipos: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
      const tipo = tipos[extname(archivo)];
      if (!archivo.startsWith(raiz + sep) || !tipo) throw new ErrorHTTP(404, 'No se encontró el archivo.');
      let contenido: Buffer;
      try { contenido = await readFile(archivo); } catch { throw new ErrorHTTP(404, 'No se encontró la página. Ejecuta npm run build:web.'); }
      respuesta.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
      respuesta.end(metodo === 'HEAD' ? undefined : contenido);
    } catch (error: unknown) {
      let estado = 500;
      let mensaje = 'No fue posible completar la operación. Intenta nuevamente.';
      if (error instanceof ErrorHTTP) { estado = error.estado; mensaje = error.message; }
      else if (error instanceof ErrorNegocio || error instanceof ErrorDatos) {
        estado = error.codigo === 'NO_ENCONTRADO' || error.codigo === 'P0002' ? 404
          : ['CONFLICTO', 'SIN_EXISTENCIA', '55000'].includes(error.codigo) ? 409
          : error.codigo === '42501' ? 403 : 400;
        mensaje = error.message;
      }
      if (!respuesta.headersSent) json(respuesta, { error: mensaje }, estado);
      else respuesta.end();
    }
  });
}
