'use client';
import { useSyncExternalStore } from 'react';
import { parseRoute, routeHash, type Route } from '../../lib/navigation';
function subscribe(callback:()=>void){window.addEventListener('hashchange',callback);window.addEventListener('popstate',callback);window.addEventListener('caregrid-navigation',callback);return()=>{window.removeEventListener('hashchange',callback);window.removeEventListener('popstate',callback);window.removeEventListener('caregrid-navigation',callback)}}
export function useWorkspaceRoute(){
 const hash=useSyncExternalStore(subscribe,()=>window.location.hash,()=>'');
 const route=parseRoute(hash);
 function go(next:Route){const hash=routeHash(next);if(window.location.hash!==hash){window.history.pushState(null,'',hash);window.dispatchEvent(new Event('caregrid-navigation'));}window.requestAnimationFrame(()=>{document.querySelector<HTMLElement>('#main h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}
 return {route,go};
}
