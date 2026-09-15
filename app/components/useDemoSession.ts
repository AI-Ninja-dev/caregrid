'use client';
import { useSyncExternalStore } from 'react';
import { SESSION_KEY, emptySession, applyEvent, restoreSession, encodeSession, type DemoSession, type DemoEvent } from '../../lib/session';
import type { Action } from '../../lib/workflow';
type Snapshot={session:DemoSession;mode:'loading'|'saved'|'memory';notice:string};
const initial:Snapshot={session:emptySession(),mode:'loading',notice:''};
let snapshot=initial;
const listeners=new Set<()=>void>();
function emit(){listeners.forEach(listener=>listener())}
function subscribe(listener:()=>void){
 listeners.add(listener);
 if(snapshot.mode==='loading'){
  try{const result=restoreSession(sessionStorage.getItem(SESSION_KEY));snapshot={session:result.session,mode:'saved',notice:result.recovered?'Saved demo data could not be read. A fresh demo has been opened.':''};if(result.recovered)sessionStorage.removeItem(SESSION_KEY);}
  catch{snapshot={session:emptySession(),mode:'memory',notice:'Browser storage is unavailable. You can use the demo, but refresh will clear activity.'};}
  emit();
 }
 return()=>{listeners.delete(listener)};
}
function send(event:DemoEvent){
 const session=applyEvent(snapshot.session,event);
 let mode:Snapshot['mode']='saved',notice='';
 try{if(session.events.length>2000)throw new Error('Session too large');if(session.events.length===0)sessionStorage.removeItem(SESSION_KEY);else sessionStorage.setItem(SESSION_KEY,encodeSession(session));}
 catch{mode='memory';notice='Activity is available in this page, but could not be saved. Export a demo report before refreshing.';}
 snapshot={session,mode,notice};emit();
}
export function useDemoSession(){
 const state=useSyncExternalStore(subscribe,()=>snapshot,()=>initial);
 return {...state,dispatchWorkflow:(action:Action)=>send({type:'workflow',action}),acknowledge:(id:string)=>send({type:'acknowledge',id}),reset:()=>send({type:'workflow',action:{type:'reset'}})};
}
