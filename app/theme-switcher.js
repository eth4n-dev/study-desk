'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';

const storageKey='study-desk-theme';

export default function ThemeSwitcher(){
 const [theme,setTheme]=useState('dark');
 useEffect(()=>{
  setTheme(document.documentElement.dataset.theme==='light'?'light':'dark');
  const sync=event=>{if(event.key!==storageKey)return;const next=event.newValue==='light'?'light':'dark';document.documentElement.dataset.theme=next;setTheme(next);};
  window.addEventListener('storage',sync);
  return()=>window.removeEventListener('storage',sync);
 },[]);
 function toggle(){
  const next=document.documentElement.dataset.theme==='light'?'dark':'light';
  document.documentElement.dataset.theme=next;
  setTheme(next);
  try{localStorage.setItem(storageKey,next);}catch{ /* The current page still changes when storage is unavailable. */ }
 }
 return <button type="button" className="theme-switcher" onClick={toggle} aria-label={`Switch to ${theme==='dark'?'light':'dark'} theme`} title={`Switch to ${theme==='dark'?'light':'dark'} theme`}>
  {theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}<span>{theme==='dark'?'Light':'Dark'}</span>
 </button>;
}
