'use client';
import {useEffect,useRef,useState} from 'react';
import {LogOut,Mail,ShieldCheck} from 'lucide-react';
import {isPasskeyCancellation} from '../lib/auth-errors.mjs';

export default function AccountMenu({name,email,onSignOut,onAdmin,onMigrateEmail}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const menuRef=useRef(null);
 useEffect(()=>{if(!onMigrateEmail)setNotice('');},[onMigrateEmail]);
 useEffect(()=>{
  if(!open)return;
  function closeOnOutside(event){if(!menuRef.current?.contains(event.target))setOpen(false);}
  function closeOnEscape(event){if(event.key==='Escape'){setOpen(false);menuRef.current?.querySelector('.avatar')?.focus();}}
  document.addEventListener('pointerdown',closeOnOutside);
  document.addEventListener('keydown',closeOnEscape);
  return()=>{document.removeEventListener('pointerdown',closeOnOutside);document.removeEventListener('keydown',closeOnEscape);};
 },[open]);
 async function signOut(){setBusy(true);try{if(await onSignOut())setOpen(false);}finally{setBusy(false);}}
 async function openAdmin(){setBusy(true);setError('');try{await onAdmin();setOpen(false);}catch(e){if(!isPasskeyCancellation(e))setError(e.message||'Could not open Admin.');}finally{setBusy(false);}}
 async function migrateEmail(){setBusy(true);setError('');try{await onMigrateEmail();setNotice('Check your email to confirm the address change.');}catch(e){setError(e.message||'Could not update the email address.');}finally{setBusy(false);}}
 return <div className="account-control" ref={menuRef}>
  <button type="button" className="avatar" title="Account" aria-label="Open account menu" aria-expanded={open} aria-controls="account-menu" onClick={()=>setOpen(value=>!value)}>{name.trim().charAt(0).toUpperCase()}</button>
  {open&&<div className="account-popover" id="account-menu"><div className="account-identity"><strong>{name}</strong><span>{email}</span></div>{onMigrateEmail&&<button type="button" className="account-signout" disabled={busy} onClick={migrateEmail}><Mail size={16}/>Use @ethz.ch address</button>}{onAdmin&&<button type="button" className="account-signout" disabled={busy} onClick={openAdmin}><ShieldCheck size={16}/>Admin</button>}<button type="button" className="account-signout" disabled={busy} onClick={signOut}><LogOut size={16}/>{busy?'Signing out…':'Sign out'}</button>{notice&&<p className="account-notice" role="status">{notice}</p>}{error&&<p className="account-error" role="alert">{error}</p>}</div>}
 </div>;
}
