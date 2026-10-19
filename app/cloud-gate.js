'use client';
import {useEffect,useMemo,useState} from 'react';
import {Fingerprint,GraduationCap,KeyRound,Mail,ShieldCheck} from 'lucide-react';
import {cloudClient} from '../lib/cloud.mjs';
import {emailMatchesSignupDomain} from '../lib/signup-domain.mjs';
import ThemeSwitcher from './theme-switcher';

const openSignupDomain=(process.env.NEXT_PUBLIC_OPEN_SIGNUP_DOMAIN||'').trim().toLowerCase();

function hasPasskeySession(session){
 try{
  const payload=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  return Array.isArray(payload.amr)&&payload.amr.some(entry=>entry==='passkey'||entry?.method==='passkey');
 }catch{return false;}
}

export default function CloudGate({children}){
 const api=useMemo(()=>cloudClient(),[]);
 const [session,setSession]=useState(undefined),[access,setAccess]=useState('checking');
 const [email,setEmail]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [totp,setTotp]=useState(null),[factors,setFactors]=useState([]),[code,setCode]=useState('');

 useEffect(()=>{
  let alive=true;
  api.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)setError(error.message);setSession(data?.session||null);}).catch(e=>{if(!alive)return;setError(e.message||'Could not check session.');setSession(null);});
  const {data:{subscription}}=api.auth.onAuthStateChange((_event,next)=>{if(alive)setSession(next);});
  return()=>{alive=false;subscription.unsubscribe();};
 },[api]);
 useEffect(()=>{
  let alive=true;
  if(session===undefined)return;
  if(!session){setAccess('signed-out');setFactors([]);setTotp(null);return;}
  if(hasPasskeySession(session)){setAccess('ready');return;}
  (async()=>{
   const [{data:level,error:levelError},{data:listed,error:listError}]=await Promise.all([
    api.auth.mfa.getAuthenticatorAssuranceLevel(),api.auth.mfa.listFactors()
   ]);
   if(!alive)return;
   if(levelError||listError){setError(levelError?.message||listError?.message);setAccess('email-session');return;}
   setFactors(listed?.totp?.filter(f=>f.status==='verified')||[]);
   setAccess(level?.currentLevel==='aal2'?'ready':'email-session');
  })();
  return()=>{alive=false;};
 },[api,session]);

 async function run(action){setError('');setBusy(true);try{await action();}catch(e){setError(e.message||'This sign-in step did not work. Try again.');}finally{setBusy(false);}}
 async function passkey(){await run(async()=>{const {error}=await api.auth.signInWithPasskey();if(error)throw error;});}
 async function sendLink(event){event.preventDefault();await run(async()=>{const address=email.trim();const {error}=await api.auth.signInWithOtp({email:address,options:{shouldCreateUser:emailMatchesSignupDomain(address,openSignupDomain),emailRedirectTo:window.location.origin}});if(error)throw error;setSent(true);});}
 async function registerPasskey(){await run(async()=>{const {error}=await api.auth.registerPasskey();if(error)throw error;const result=await api.auth.signInWithPasskey();if(result.error)throw new Error('Passkey added. Choose Use a saved passkey to sign in.');});}
 async function enrollTotp(){await run(async()=>{const {data,error}=await api.auth.mfa.enroll({factorType:'totp',friendlyName:'Study desk'});if(error)throw error;setTotp(data);});}
 async function verifyTotp(event){event.preventDefault();await run(async()=>{const factorId=totp?.id||factors[0]?.id;if(!factorId)throw new Error('Set up an authenticator first.');const {error}=await api.auth.mfa.challengeAndVerify({factorId,code:code.trim()});if(error)throw error;setCode('');const {data}=await api.auth.getSession();setSession(data.session);});}
 async function signOut(){await api.auth.signOut();setSession(null);setSent(false);setAccess('signed-out');}

 const workspace=useMemo(()=>({api,user:session?.user,signOut}),[api,session?.user?.id]);
 if(access==='ready'&&session)return children(workspace);
 return <main className="cloud-gate"><div className="cloud-gate-card"><div className="cloud-gate-theme"><ThemeSwitcher/></div>
  <div className="cloud-gate-brand"><GraduationCap size={25}/><span>Study <b>desk</b></span></div>
  {access==='checking'?<><h1>Opening Study desk</h1><p>Checking session…</p></>:
  access==='signed-out'?<><div className="cloud-gate-symbol"><Fingerprint size={28}/></div><h1>Sign in</h1><p>Use a saved passkey with Touch ID, Face ID, or device unlock.</p><button className="button primary cloud-gate-primary" onClick={passkey} disabled={busy}><Fingerprint size={18}/>{busy?'Checking…':'Use a saved passkey'}</button><div className="cloud-gate-divider">First sign-in · email link</div><form onSubmit={sendLink} className="cloud-gate-form"><label htmlFor="cloud-email">Email sign-in link</label><div className="cloud-gate-inline"><input id="cloud-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder={openSignupDomain?`name@${openSignupDomain}`:'Invited email'}/><button className="button" disabled={busy} type="submit"><Mail size={16}/>Send link</button></div></form>{openSignupDomain&&<p className="cloud-gate-note">Anyone with an @{openSignupDomain} address can join. Existing invited accounts can sign in too.</p>}{sent&&<p className="cloud-gate-note" role="status">Open the email link to add a passkey.</p>}</>:
  <><div className="cloud-gate-symbol"><ShieldCheck size={27}/></div><h1>Set up a passkey</h1><p>A passkey enables Touch ID or Face ID sign-in on this device.</p><button className="button primary cloud-gate-primary" onClick={registerPasskey} disabled={busy}><Fingerprint size={18}/>{busy?'Working…':'Add a passkey'}</button><div className="cloud-gate-divider">Or use an authenticator code</div>{totp?.totp?.qr_code&&<div className="cloud-gate-qr"><img src={totp.totp.qr_code} alt="Authenticator setup QR code"/><p>Scan this with an authenticator app, then enter the six-digit code.</p></div>}{(totp||factors.length>0)?<form className="cloud-gate-form" onSubmit={verifyTotp}><label htmlFor="cloud-code">Authenticator code</label><div className="cloud-gate-inline"><input id="cloud-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="6 digits"/><button className="button" disabled={busy} type="submit"><KeyRound size={16}/>Verify</button></div></form>:<button className="button cloud-gate-secondary" onClick={enrollTotp} disabled={busy}>Set up authenticator</button>}<button className="text-button quiet cloud-gate-signout" onClick={signOut}>Use a different account</button></>}
  {error&&<p className="cloud-gate-error" role="alert">{error}</p>}
 </div></main>;
}
