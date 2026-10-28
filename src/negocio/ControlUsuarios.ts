import { ErrorNegocio } from './ErrorNegocio.js';

export interface UsuarioPersonal { id: string; email: string; nombre: string; rol: 'ADMIN' | 'EMPLEADO'; activo: boolean }
export interface UsuarioNuevo { email: string; nombre: string; rol: 'ADMIN' | 'EMPLEADO'; password: string }
export type CambiosUsuario = Pick<UsuarioPersonal, 'nombre' | 'rol' | 'activo'>;
export interface DatosUsuarios {
  listar(desde: number): Promise<UsuarioPersonal[]>;
  crear(datos: UsuarioNuevo, actor: string): Promise<UsuarioPersonal>;
  actualizar(id: string, cambios: CambiosUsuario): Promise<void>;
}
export class ControlUsuarios {
  constructor(private readonly datos: DatosUsuarios) {}
  async listar(desde = 0) {
    if (!Number.isInteger(desde) || desde < 0 || desde > 2147483600) throw new ErrorNegocio('Página inválida.');
    const usuarios = await this.datos.listar(desde);
    return { usuarios: usuarios.slice(0,20), desde, hayMas: usuarios.length > 20 };
  }
  async crear(datos: UsuarioNuevo, actor: string) {
    this.validar(datos);
    if (typeof datos.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim()) || datos.email.length > 254) throw new ErrorNegocio('Introduce un correo de acceso válido.');
    if (typeof datos.password !== 'string' || datos.password.length < 12 || datos.password.length > 128 || !/[a-z]/.test(datos.password) || !/[A-Z]/.test(datos.password) || !/\d/.test(datos.password)) throw new ErrorNegocio('La contraseña inicial debe tener de 12 a 128 caracteres, mayúsculas, minúsculas y números.');
    return this.datos.crear({ ...datos, nombre: datos.nombre.trim(), email: datos.email.trim().toLowerCase() }, actor);
  }
  async actualizar(id: string, datos: CambiosUsuario) {
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) throw new ErrorNegocio('Identificador de usuario inválido.');
    this.validar(datos);
    if (typeof datos.activo !== 'boolean') throw new ErrorNegocio('Indica si la cuenta está activa.');
    await this.datos.actualizar(id, { ...datos, nombre: datos.nombre.trim() });
  }
  private validar(datos: {nombre: string;rol: string}) {
    if (typeof datos.nombre !== 'string' || !datos.nombre.trim() || datos.nombre.trim().length > 120 || !['ADMIN','EMPLEADO'].includes(datos.rol)) throw new ErrorNegocio('Nombre o rol del usuario inválido.');
  }
}
