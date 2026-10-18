import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';

async function main(): Promise<void> {
  const archivo = '.env.personal.local';
  try {
    await access(archivo);
    console.log(`El acceso de prueba ya está preparado. Consulta ${archivo}. No se modificó ninguna cuenta.`);
    return;
  } catch { /* Primera preparación local. */ }
  const url = process.env.SUPABASE_URL;
  const secreto = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secreto) throw new Error('Configura SUPABASE_URL y SUPABASE_SECRET_KEY en .env para preparar el personal de prueba.');
  const email = process.env.GABOSTORE_PERSONAL_EMAIL ?? 'demo.personal@gabostore.local';
  const password = randomBytes(18).toString('base64url') + 'aA1!';
  const admin = createClient(url, secreto, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { rol: 'EMPLEADO' }, user_metadata: { nombre: 'Personal de demostración GaboStore' },
  });
  if (error) throw new Error(`No se creó la cuenta de prueba: ${error.message}. No se cambió la contraseña de ninguna cuenta existente.`);
  await writeFile(archivo, `# Acceso personal de demostración. Archivo privado, ignorado por Git.\nGABOSTORE_PERSONAL_EMAIL=${email}\nGABOSTORE_PERSONAL_PASSWORD=${password}\n`, { flag: 'wx', mode: 0o600 });
  console.log(`Cuenta EMPLEADO creada sin enviar correo. Datos de acceso guardados en ${archivo}.`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'No fue posible preparar la cuenta.'); process.exitCode = 1; });
