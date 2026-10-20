'use client';
import {useEffect,useRef,useState} from 'react';
import {LogOut} from 'lucide-react';

export default function AccountMenu({name,email,onSignOut}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const menuRef=useRef(null);
 useEffect(()=>{
  if(!open)return;
  function closeOnOutside(event){if(!menuRef.current?.contains(event.target))setOpen(false);}
  function closeOnEscape(event){if(event.key==='Escape'){setOpen(false);menuRef.current?.querySelector('.avatar')?.focus();}}
  document.addEventListener('pointerdown',closeOnOutside);
  document.addEventListener('keydown',closeOnEscape);
  return()=>{document.removeEventListener('pointerdown',closeOnOutside);document.removeEventListener('keydown',closeOnEscape);};
 },[open]);
 async function signOut(){setBusy(true);try{if(await onSignOut())setOpen(false);}finally{setBusy(false);}}
 return <div className="account-control" ref={menuRef}>
  <button type="button" className="avatar" title="Account" aria-label="Open account menu" aria-expanded={open} aria-controls="account-menu" onClick={()=>setOpen(value=>!value)}>{name.trim().charAt(0).toUpperCase()}</button>
  {open&&<div className="account-popover" id="account-menu"><div className="account-identity"><strong>{name}</strong><span>{email}</span></div><button type="button" className="account-signout" disabled={busy} onClick={signOut}><LogOut size={16}/>{busy?'Signing out…':'Sign out'}</button></div>}
 </div>;
}
