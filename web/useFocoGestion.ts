import {useEffect,useState} from 'react';

// Espera al render del resultado antes de enfocar y mostrar la región actualizada.
export function useFocoGestion(error='') {
 const[destino,setDestino]=useState<{selector:string}|null>(null);
 function enfocar(selector:string){
  const elemento=document.querySelector<HTMLElement>(selector);
  if(!elemento)return;
  elemento.setAttribute('tabindex','-1');
  elemento.focus({preventScroll:true});
  elemento.scrollIntoView({block:'start',behavior:'instant'});
  const cabecera=document.querySelector('header');
  if(cabecera&&['sticky','fixed'].includes(getComputedStyle(cabecera).position)){
   const margen=cabecera.getBoundingClientRect().bottom+24;
   if(elemento.getBoundingClientRect().top<margen)window.scrollBy({top:elemento.getBoundingClientRect().top-margen,behavior:'instant'});
  }
 }
 useEffect(()=>{if(destino)enfocar(destino.selector);},[destino]);
 useEffect(()=>{if(error)enfocar('main [role="alert"]');},[error]);
 return(selector:string)=>setDestino({selector});
}
