import type { ClienteSupabase } from '../supabase.js';
import { comprobarError, ErrorDatos } from '../errors.js';
import type { UsuarioPersonal, UsuarioNuevo, CambiosUsuario, DatosUsuarios } from '../negocio/ControlUsuarios.js';

export class UsuarioRepository implements DatosUsuarios {
  constructor(private readonly db: ClienteSupabase, private readonly servidor: ClienteSupabase) {}
  async listar(desde: number): Promise<UsuarioPersonal[]> {
    const { data, error } = await this.db.rpc('listar_personal', {p_desde: desde}); comprobarError(error);
    return data as unknown as UsuarioPersonal[];
  }
  async crear(datos: UsuarioNuevo, actor: string): Promise<UsuarioPersonal> {
    const {data,error} = await this.servidor.auth.admin.createUser({ email: datos.email, password: datos.password,
      email_confirm: true, app_metadata: {rol: datos.rol, activo: true, creado_por: actor}, user_metadata: {nombre: datos.nombre} });
    if (error || !data.user) throw new ErrorDatos('No se pudo crear la cuenta. Revisa si el correo ya existe o cambia la contraseña inicial.', 'VALIDACION');
    return {id:data.user.id,email:datos.email,nombre:datos.nombre,rol:datos.rol,activo:true};
  }
  async actualizar(id: string, cambios: CambiosUsuario) {
    const {error} = await this.db.rpc('actualizar_personal', {p_id:id,p_nombre:cambios.nombre,p_rol:cambios.rol,p_activo:cambios.activo}); comprobarError(error);
  }
}
