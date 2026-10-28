import {useState,useEffect} from 'react';
function formaValida(v:unknown,m:unknown):boolean{if(Array.isArray(m))return Array.isArray(v)&&v.length>0&&v.length<=100&&v.every(i=>formaValida(i,m[0]));if(m&&typeof m==='object')return Boolean(v)&&typeof v==='object'&&Object.entries(m).every(([k,x])=>formaValida((v as Record<string,unknown>)[k],x));return typeof v===typeof m;}
export function useBorradorOperacion<T>(clave:string,inicial:()=>T){
 const[valor,setValor]=useState<{datos:T;claveSolicitud:string}>(()=>{try{const v=JSON.parse(sessionStorage.getItem(clave)??'null');if(v&&formaValida(v.datos,inicial())&&typeof v.claveSolicitud==='string'&&/^[\da-f-]{36}$/i.test(v.claveSolicitud))return v;}catch{/* Borrador dañado. */}return{datos:inicial(),claveSolicitud:crypto.randomUUID()};});
 const[aviso,setAviso]=useState('');
 useEffect(()=>{try{sessionStorage.setItem(clave,JSON.stringify(valor));setAviso('');}catch{setAviso('La pestaña no puede conservar el borrador al recargar. Mantén esta página abierta hasta terminar.');}},[clave,valor]);
 function cambiar(datos:T){setValor({datos,claveSolicitud:crypto.randomUUID()});}
 function limpiar(){cambiar(inicial());}
 return{...valor,cambiar,limpiar,aviso};
}
