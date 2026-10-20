'use client';
import {useEffect,useMemo,useState} from 'react';
import {Fingerprint,GraduationCap,KeyRound,Mail,ShieldCheck} from 'lucide-react';
import {cloudClient} from '../lib/cloud.mjs';
import {canonicalAuthEmail,emailMatchesSignupDomain,signupDomains} from '../lib/signup-domain.mjs';
import {emailCodeError,isPasskeyCancellation} from '../lib/auth-errors.mjs';
import ThemeSwitcher from './theme-switcher';

const openSignupDomains=signupDomains(process.env.NEXT_PUBLIC_OPEN_SIGNUP_DOMAINS||process.env.NEXT_PUBLIC_OPEN_SIGNUP_DOMAIN);
const signupDomainList=openSignupDomains.map(domain=>`@${domain}`).join(' or ');

function hasPasskeySession(session){
 try{
  const payload=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  return Array.isArray(payload.amr)&&payload.amr.some(entry=>entry==='passkey'||entry?.method==='passkey');
 }catch{return false;}
}

export default function CloudGate({children}){
 const api=useMemo(()=>cloudClient(),[]);
 const [session,setSession]=useState(undefined),[profileUser,setProfileUser]=useState(null),[access,setAccess]=useState('checking');
 const [mode,setMode]=useState('sign-in'),[email,setEmail]=useState(''),[sentAddress,setSentAddress]=useState(''),[emailCode,setEmailCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [totp,setTotp]=useState(null),[factors,setFactors]=useState([]),[code,setCode]=useState('');

 useEffect(()=>{
  let alive=true;
  api.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)setError(error.message);setSession(data?.session||null);}).catch(e=>{if(!alive)return;setError(e.message||'Could not check session.');setSession(null);});
  const {data:{subscription}}=api.auth.onAuthStateChange((_event,next)=>{if(alive)setSession(next);});
  return()=>{alive=false;subscription.unsubscribe();};
 },[api]);
 useEffect(()=>{
  let alive=true;
  if(!session?.user?.id){setProfileUser(null);return;}
  async function refreshProfile(){
   const {data}=await api.auth.getUser();
   if(alive&&data?.user?.id===session.user.id)setProfileUser(data.user);
  }
  refreshProfile().catch(()=>{});
  window.addEventListener('focus',refreshProfile);
  document.addEventListener('visibilitychange',refreshProfile);
  return()=>{alive=false;window.removeEventListener('focus',refreshProfile);document.removeEventListener('visibilitychange',refreshProfile);};
 },[api,session?.user?.id]);
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

 async function run(action,{quietCancellation=false}={}){setError('');setBusy(true);try{await action();}catch(e){if(!quietCancellation||!isPasskeyCancellation(e))setError(e.message||'This sign-in step did not work. Try again.');}finally{setBusy(false);}}
 async function passkey(){await run(async()=>{const {error}=await api.auth.signInWithPasskey();if(error)throw error;},{quietCancellation:true});}
 function changeMode(next){setMode(next);setError('');setSentAddress('');setEmailCode('');}
 async function sendCode(event){event?.preventDefault();await run(async()=>{
  const address=canonicalAuthEmail(email);
  if(mode==='sign-up'&&!emailMatchesSignupDomain(address,openSignupDomains))throw new Error(`Use a ${signupDomainList} email address to create an account.`);
  const {error}=await api.auth.signInWithOtp({email:address,options:{shouldCreateUser:mode==='sign-up',emailRedirectTo:window.location.origin}});
  if(error)throw error;
  setEmail(address);setSentAddress(address);setEmailCode('');
 });}
 async function verifyEmailCode(event){event.preventDefault();setError('');setBusy(true);try{
  const {data,error}=await api.auth.verifyOtp({email:sentAddress,token:emailCode.trim(),type:'email'});
  if(error)throw error;
  if(!data?.session)throw new Error('Code accepted, but no session was returned. Please try signing in again.');
  setSession(data.session);setEmailCode('');
 }catch(e){setError(emailCodeError(e));setEmailCode('');}finally{setBusy(false);}}
 async function registerPasskey(){await run(async()=>{const {error}=await api.auth.registerPasskey();if(error)throw error;const result=await api.auth.signInWithPasskey();if(result.error&&!isPasskeyCancellation(result.error))throw new Error('Passkey added. Try signing in with it.');},{quietCancellation:true});}
 async function enrollTotp(){await run(async()=>{const {data,error}=await api.auth.mfa.enroll({factorType:'totp',friendlyName:'Study desk'});if(error)throw error;setTotp(data);});}
 async function verifyTotp(event){event.preventDefault();await run(async()=>{const factorId=totp?.id||factors[0]?.id;if(!factorId)throw new Error('Set up an authenticator first.');const {error}=await api.auth.mfa.challengeAndVerify({factorId,code:code.trim()});if(error)throw error;setCode('');const {data}=await api.auth.getSession();setSession(data.session);});}
 async function signOut(){const {error}=await api.auth.signOut({scope:'local'});if(error)throw error;setSession(null);setSentAddress('');setEmailCode('');setMode('sign-in');setAccess('signed-out');}

 const currentUser=profileUser?.id===session?.user?.id?profileUser:session?.user;
 const workspace=useMemo(()=>({api,user:currentUser,signOut}),[api,currentUser]);
 if(access==='ready'&&session)return children(workspace);
 return <main className="cloud-gate"><div className="cloud-gate-card"><div className="cloud-gate-theme"><ThemeSwitcher/></div>
  <div className="cloud-gate-brand" translate="no"><GraduationCap size={25}/><span>Study <b>desk</b></span></div>
  {access==='checking'?<><h1>Opening Study desk</h1><p>Checking session…</p></>:
  access==='signed-out'?<><div className="cloud-gate-symbol"><Fingerprint size={28}/></div><h1>{mode==='sign-up'?'Create account':'Sign in'}</h1>
   {mode==='sign-in'&&!sentAddress&&<><button className="button primary cloud-gate-primary" onClick={passkey} disabled={busy}><Fingerprint size={18}/>Use a passkey</button><div className="cloud-gate-divider">or</div><button className="button cloud-gate-secondary" onClick={()=>changeMode('email-sign-in')} disabled={busy}><Mail size={17}/>Sign in with email</button><div className="cloud-gate-switch">New to Study desk? <button type="button" onClick={()=>changeMode('sign-up')}>Create account</button></div></>}
   {(mode==='email-sign-in'||mode==='sign-up')&&!sentAddress&&<><form onSubmit={sendCode} className="cloud-gate-form"><label htmlFor="cloud-email">University email</label><div className="cloud-gate-inline"><input id="cloud-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@university.edu"/><button className="button primary" disabled={busy} type="submit"><Mail size={16}/>Send code</button></div></form><button className="text-button quiet cloud-gate-back" type="button" onClick={()=>changeMode('sign-in')}>Back to sign in</button></>}
   {sentAddress&&<><p className="cloud-gate-sent" role="status">Code sent to <strong>{sentAddress}</strong></p><form onSubmit={verifyEmailCode} className="cloud-gate-form cloud-gate-code-form"><label htmlFor="cloud-email-code">Email code</label><div className="cloud-gate-inline"><input id="cloud-email-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={emailCode} onChange={e=>setEmailCode(e.target.value.replace(/\D/g,''))} placeholder="6-digit code"/><button className="button primary" disabled={busy} type="submit">{busy?'Checking…':'Continue'}</button></div></form><div className="cloud-gate-code-actions"><button type="button" className="text-button quiet" disabled={busy} onClick={()=>{setSentAddress('');setEmailCode('');setError('');}}>Change email</button><button type="button" className="text-button quiet" disabled={busy} onClick={()=>sendCode()}>Resend code</button></div></>}
   </>:
  <><div className="cloud-gate-symbol"><ShieldCheck size={27}/></div><h1>Set up a passkey</h1><p>A passkey enables Touch ID or Face ID sign-in on this device.</p><button className="button primary cloud-gate-primary" onClick={registerPasskey} disabled={busy}><Fingerprint size={18}/>{busy?'Working…':'Add a passkey'}</button><div className="cloud-gate-divider">Or use an authenticator code</div>{totp?.totp?.qr_code&&<div className="cloud-gate-qr"><img src={totp.totp.qr_code} alt="Authenticator setup QR code"/><p>Scan this with an authenticator app, then enter the six-digit code.</p></div>}{(totp||factors.length>0)?<form className="cloud-gate-form" onSubmit={verifyTotp}><label htmlFor="cloud-code">Authenticator code</label><div className="cloud-gate-inline"><input id="cloud-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="6 digits"/><button className="button" disabled={busy} type="submit"><KeyRound size={16}/>Verify</button></div></form>:<button className="button cloud-gate-secondary" onClick={enrollTotp} disabled={busy}>Set up authenticator</button>}<button className="text-button quiet cloud-gate-signout" onClick={()=>run(signOut)}>Use a different account</button></>}
  {error&&<p className="cloud-gate-error" role="alert">{error}</p>}
 </div></main>;
}
