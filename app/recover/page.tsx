'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
export default function Recovery(){
 const [token,setToken]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 useEffect(()=>{const initial=location.hash.slice(1);if(initial)setToken(initial);history.replaceState(null,'',location.pathname);},[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const fields=new FormData(event.currentTarget);
  if(fields.get('password')!==fields.get('confirm')){setMessage('Passwords do not match.');return;}
  setBusy(true);
  try{const response=await fetch('/api/auth/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'recover',recoveryToken:token,password:fields.get('password')})});const result=await response.json();if(!response.ok)throw new Error(result.error);setDone(true);setToken('');setMessage('Password updated. Sign in with your new password.');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 return <main className="auth-page"><section className="panel auth-panel"><span className="brand">CareGrid</span><h1>Restore your access.</h1><p>Use the recovery link supplied by your administrator. It can be used once and expires after 30 minutes.</p><p role="status">{message}</p>{!done&&<form className="live-form" onSubmit={submit}><label className="field">Recovery token<input required value={token} onChange={e=>setToken(e.target.value)} autoComplete="off"/></label><label className="field">New password<input name="password" required type="password" minLength={14} maxLength={256} autoComplete="new-password"/></label><label className="field">Confirm password<input name="confirm" required type="password" minLength={14} maxLength={256} autoComplete="new-password"/></label><button className="primary" disabled={busy}>{busy?'Updating…':'Set new password'}</button></form>}<Link href="/">Back to sign in</Link></section></main>;
}
