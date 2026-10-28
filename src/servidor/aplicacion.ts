import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { crearCapaDatos } from '../index.js';
import { crearClienteSupabase, type ClienteSupabase } from '../supabase.js';
import { crearCapaNegocio, ErrorNegocio } from '../negocio/index.js';
import { ErrorDatos } from '../errors.js';
import { numeroWhatsApp } from '../negocio/SolicitudConsulta.js';
import { limiteFotografia, extensionesFotografia } from '../fotografias.js';
import type { ArticuloNuevo, CambiosArticulo, EstadoPedido } from '../models.js';
import type { FiltrosListadoPedidos } from '../filtrosPedidos.js';
import { ControlPedidoPublico } from '../negocio/ControlPedidoPublico.js';
import { ControlUsuarios, type UsuarioNuevo, type CambiosUsuario } from '../negocio/ControlUsuarios.js';
import { UsuarioRepository } from '../repositories/UsuarioRepository.js';
import {ControlMaestros,type RegistroMaestro} from '../negocio/ControlMaestros.js';
import {MaestroRepository} from '../repositories/MaestroRepository.js';

export interface OpcionesServidor {
  url: string;
  clavePublica: string;
  carpetaWeb: string;
  whatsappNumero?: string;
  claveServidor?: string;
  conectarServidor?: () => ClienteSupabase;
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
  const clienteServidor = opciones.conectarServidor?.() ?? (opciones.claveServidor
    ? crearClienteSupabase({ url: opciones.url, clavePublica: opciones.claveServidor }) : null);
  const pedidosPublicos = clienteServidor ? new ControlPedidoPublico(crearCapaDatos(clienteServidor).pedidos) : null;
  const solicitudes = new Map<string, { cantidad: number; hasta: number }>();
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
        if (metodo === 'POST' && ruta.pathname === '/api/pedidos/publicos') {
          if (!numeroWhatsApp(opciones.whatsappNumero) || !pedidosPublicos) throw new ErrorHTTP(503, 'El registro por WhatsApp todavía no está configurado.');
          const origen = peticion.headers.origin;
          if (peticion.headers['sec-fetch-site'] === 'cross-site' || (origen && origen !== `http://${peticion.headers.host}` && origen !== `https://${peticion.headers.host}`)) throw new ErrorHTTP(403, 'La solicitud debe originarse en GaboStore.');
          const ahora = Date.now();
          for (const [ip, valor] of solicitudes) if (valor.hasta <= ahora) solicitudes.delete(ip);
          const ip = peticion.socket.remoteAddress ?? 'local';
          const consumo = solicitudes.get(ip) ?? { cantidad: 0, hasta: ahora + 60_000 };
          if (consumo.cantidad >= 10 || solicitudes.size >= 10_000) throw new ErrorHTTP(429, 'Demasiados intentos. Espera un minuto y vuelve a intentar.');
          consumo.cantidad++; solicitudes.set(ip, consumo);
          const datos = await cuerpo(peticion);
          if (Object.keys(datos).some(k => !['claveSolicitud', 'items'].includes(k)) || !Array.isArray(datos.items)) throw new ErrorHTTP(400, 'Envía únicamente la clave de solicitud y sus artículos.');
          const items = datos.items.map((item: unknown) => {
            if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(k => !['varianteId', 'cantidad'].includes(k))) throw new ErrorHTTP(400, 'Envía únicamente variante y cantidad.');
            const linea = item as Record<string, unknown>;
            return { varianteId: numero(linea.varianteId), cantidad: numero(linea.cantidad) };
          });
          return json(respuesta, await pedidosPublicos.registrar({ claveSolicitud: cadena(datos.claveSolicitud), items }), 201);
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
          if ((rol !== 'ADMIN' && rol !== 'EMPLEADO') || data.user.app_metadata.activo === false) throw new ErrorHTTP(403, 'Esta cuenta no tiene acceso de personal o está desactivada.');
          identidad = { id: data.user.id, email: data.user.email, rol };
          negocio = crearCapaNegocio(crearCapaDatos(conectar(token)));
          const maestro = ruta.pathname.match(/^\/api\/personal\/(categorias)(?:\/(\d+))?$/);
          if(maestro){
            const control=new ControlMaestros(new MaestroRepository(conectar(token),'categorias'));
            if(metodo==='GET'&&!maestro[2])return json(respuesta,await control.listar(Number(ruta.searchParams.get('desde')??0),ruta.searchParams.get('opciones')==='1'));
            if(rol!=='ADMIN')throw new ErrorHTTP(403,'Solo el administrador puede modificar este registro.');
            if((metodo==='POST'&&!maestro[2])||(metodo==='PATCH'&&maestro[2]))return json(respuesta,await control.guardar(maestro[2]?Number(maestro[2]):null,await cuerpo(peticion) as unknown as Omit<RegistroMaestro,'id'>),metodo==='POST'?201:200);
          }
          const usuario = ruta.pathname.match(/^\/api\/personal\/usuarios(?:\/([\da-f-]+))?$/i);
          if (usuario) {
            if (rol !== 'ADMIN') throw new ErrorHTTP(403, 'Solo el administrador puede gestionar usuarios.');
            if (!clienteServidor) throw new ErrorHTTP(503, 'Falta configurar el backend para administrar usuarios.');
            const control = new ControlUsuarios(new UsuarioRepository(conectar(token),clienteServidor));
            if (metodo === 'GET' && !usuario[1]) return json(respuesta,await control.listar(Number(ruta.searchParams.get('desde') ?? 0)));
            if (metodo === 'POST' && !usuario[1]) return json(respuesta,await control.crear(await cuerpo(peticion) as unknown as UsuarioNuevo,identidad.id),201);
            if (metodo === 'PATCH' && usuario[1]) { await control.actualizar(usuario[1],await cuerpo(peticion) as unknown as CambiosUsuario); return json(respuesta,{guardado:true}); }
          }
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
          if (metodo === 'GET' && ruta.pathname === '/api/personal/pedidos') {
            const parametros = ruta.searchParams;
            const filtro: FiltrosListadoPedidos = {};
            for (const campo of ['desde', 'numero', 'estado', 'fechaDesde', 'fechaHasta']) {
              if (parametros.getAll(campo).length > 1) throw new ErrorHTTP(400, 'No repitas los filtros de pedidos.');
            }
            const numeroPedido = parametros.get('numero');
            if (numeroPedido !== null) {
              if (!/^[1-9]\d*$/.test(numeroPedido)) throw new ErrorHTTP(400, 'El número de pedido debe ser un entero positivo.');
              filtro.numero = Number(numeroPedido);
            }
            if (parametros.has('estado')) filtro.estado = parametros.get('estado') as EstadoPedido;
            if (parametros.has('fechaDesde')) filtro.fechaDesde = parametros.get('fechaDesde')!;
            if (parametros.has('fechaHasta')) filtro.fechaHasta = parametros.get('fechaHasta')!;
            return json(respuesta, await negocio.pedidos.listar(Number(parametros.get('desde') ?? 0), filtro));
          }
          const confirmar = ruta.pathname.match(/^\/api\/personal\/pedidos\/(\d+)\/confirmar$/);
          if (metodo === 'POST' && confirmar) {
            const datos = await cuerpo(peticion);
            if (Object.keys(datos).some(k => k !== 'confirmacionesProveedor')) throw new ErrorHTTP(400, 'Envía únicamente las confirmaciones del proveedor.');
            const confirmaciones = datos.confirmacionesProveedor ?? [];
            if (!Array.isArray(confirmaciones)) throw new ErrorHTTP(400, 'Las confirmaciones deben ser una lista.');
            return json(respuesta, await negocio.pedidos.confirmar(Number(confirmar[1]), confirmaciones.map(numero)));
          }
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
