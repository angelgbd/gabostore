import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {access,writeFile} from 'node:fs/promises';
const archivo='.env.admin.local';
try { await access(archivo); console.log('El administrador de prueba ya está preparado. Consulta .env.admin.local.'); }
catch {
 const url=process.env.SUPABASE_URL,secreto=process.env.SUPABASE_SECRET_KEY;
 if(!url||!secreto)throw new Error('Falta configurar el backend de Supabase.');
 const email='demo.admin@gabostore.local',password=randomBytes(24).toString('base64url')+'aA1!';
 const db=createClient(url,secreto,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{rol:'ADMIN',activo:true},user_metadata:{nombre:'Administrador de prueba GaboStore'}});
 if(error)throw new Error('No se creó la cuenta de prueba. No se modificó ninguna cuenta existente.');
 await writeFile(archivo,`# Administrador de prueba autorizado. Privado; no subir a Git.\nGABOSTORE_ADMIN_EMAIL=${email}\nGABOSTORE_ADMIN_PASSWORD=${password}\n`,{flag:'wx',mode:0o600});
 console.log('ADMIN de prueba creado. Credenciales guardadas en .env.admin.local.');
}
