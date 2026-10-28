import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ControlUsuarios,type DatosUsuarios} from '../src/negocio/ControlUsuarios.js';
test('usuarios valida correo, rol y contraseña antes de invocar la administración',async()=>{
 let escrituras=0;const datos:DatosUsuarios={listar:async()=>[],actualizar:async()=>{escrituras++;},crear:async d=>{escrituras++;return {...d,id:'id',activo:true};}};
 const c=new ControlUsuarios(datos),valido={nombre:' Ana ',email:'ANA@example.com',rol:'EMPLEADO' as const,password:'ClaveSegura123!'};
 for(const d of [{...valido,email:'incorrecto'},{...valido,password:'corta'},{...valido,nombre:' '},{...valido,rol:'CLIENTE'}])await assert.rejects(c.crear(d as typeof valido,'admin'));
 assert.equal(escrituras,0);const u=await c.crear(valido,'admin');assert.equal(u.email,'ana@example.com');assert.equal(u.nombre,'Ana');
 await assert.rejects(c.actualizar('invalido',{nombre:'Ana',rol:'ADMIN',activo:true}));
});
