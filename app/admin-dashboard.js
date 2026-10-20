'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,RefreshCw,RotateCcw,ShieldCheck} from 'lucide-react';
import {resetSandbox} from '../lib/sandbox-storage.mjs';
import ThemeSwitcher from './theme-switcher';

const statCards=[
 ['users','Accounts'],['confirmedUsers','Confirmed'],['signedIn7Days','Signed in · 7 days'],
 ['signedIn30Days','Signed in · 30 days'],['workspaces','Workspaces'],
 ['workspacesUpdated7Days','Active workspaces · 7 days'],['appErrors7Days','App errors · 7 days']
];

export default function AdminDashboard({cloud,onBack,onOpenSandbox}){
 const [stats,setStats]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[resetting,setResetting]=useState(false);
 async function refresh(){setBusy(true);setError('');try{const {data,error}=await cloud.api.rpc('study_admin_overview');if(error)throw error;setStats(data);}catch(e){setError(e.message||'Could not load admin overview.');}finally{setBusy(false);}}
 useEffect(()=>{refresh();},[cloud.api]);
 async function startFresh(){if(!window.confirm('Clear the test workspace in this browser and start again? Your real workspace will stay untouched.'))return;setResetting(true);try{await resetSandbox();onOpenSandbox();}catch(e){setError(e.message||'Could not reset the test workspace.');}finally{setResetting(false);}}
 return <main className="admin-screen"><header className="admin-topbar"><button className="text-button" onClick={onBack}><ArrowLeft size={17}/>Back to workspace</button><ThemeSwitcher/></header><div className="admin-content"><span className="admin-eyebrow"><ShieldCheck size={16}/>Admin</span><h1>Overview</h1><p className="admin-intro">Account activity and a safe place to try the app from a fresh start.</p>
  <section className="admin-test-panel"><div><h2>Test workspace</h2><p>Try the app with no subjects, classes, or assignments. This stays in this browser and does not change your real workspace or create a user account.</p></div><div className="admin-test-actions"><button className="button primary" onClick={onOpenSandbox}>Open test workspace<ArrowRight size={16}/></button><button className="button" disabled={resetting} onClick={startFresh}><RotateCcw size={15}/>{resetting?'Resetting…':'Start fresh'}</button></div></section>
  <div className="admin-section-heading"><h2>Usage</h2><button className="button small" disabled={busy} onClick={refresh}><RefreshCw size={15}/>{busy?'Refreshing…':'Refresh'}</button></div>{error&&<p className="admin-error" role="alert">{error}</p>}{stats&&<div className="admin-stat-grid">{statCards.map(([key,label])=><div className="admin-stat" key={key}><strong>{stats[key]??'—'}</strong><span>{label}</span></div>)}</div>}
  <div className="admin-section-heading"><h2>Recent app errors</h2></div>{stats?.recentErrors?.length?<div className="admin-error-list">{stats.recentErrors.map((item,index)=><div key={`${item.at}-${index}`}><span>{item.area} · {item.code}</span><time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time></div>)}</div>:<p className="admin-empty">{busy?'Loading…':'No recorded app errors.'}</p>}<p className="admin-footnote">Only error categories are recorded here; file names and study content are not included. Sign-in errors remain in Supabase Auth logs.</p>
 </div></main>;
}
