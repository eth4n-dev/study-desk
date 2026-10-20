'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown,Search} from 'lucide-react';
import {fmt} from '../lib/model.mjs';
import {translate} from '../lib/i18n.mjs';

const day=86400000;
const searchable=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export default function ActivityTaskPicker({tasks,subjects,subject,value,onChange,date,disabled=false}){
 const tr=value=>translate(value,typeof document==='undefined'?'en':document.documentElement.lang.slice(0,2));
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[browse,setBrowse]=useState(false),[filter,setFilter]=useState('all'),[position,setPosition]=useState({});
 const trigger=useRef(null),panel=useRef(null),search=useRef(null);
 const selected=tasks.find(task=>task.id===value);
 const selectedSubject=selected?subject(selected.subject):null;
 const chosenDate=Date.parse(`${date}T12:00:00Z`);
 const distance=task=>task.due?Math.abs(Date.parse(task.due)-chosenDate)/day:90;
 const byRelevance=(a,b)=>(a.status==='In progress'?-10:0)+distance(a)+(a.status==='Done'?12:0)-((b.status==='In progress'?-10:0)+distance(b)+(b.status==='Done'?12:0));
 const nearby=tasks.filter(task=>task.status==='In progress'||distance(task)<=21).sort(byRelevance).slice(0,6);
 const suggestions=nearby.length?nearby:[...tasks].sort((a,b)=>(b.due||'').localeCompare(a.due||'')).slice(0,6);
 const matching=tasks.filter(task=>(filter==='all'||task.subject===filter)&&searchable(`${subject(task.subject).name} ${subject(task.subject).short} ${task.title}`).includes(searchable(query.trim())));
 const ordered=[...matching].sort((a,b)=>subject(a.subject).short.localeCompare(subject(b.subject).short)||(b.due||'').localeCompare(a.due||''));
 const visible=query.trim()||browse||filter!=='all'?ordered:suggestions;
 const groups=visible.reduce((result,task)=>{const key=query.trim()||browse||filter!=='all'?task.subject:'nearby';(result[key]??=[]).push(task);return result;},{});
 function place(){
  if(!trigger.current)return;
  const box=trigger.current.getBoundingClientRect(),width=Math.min(460,window.innerWidth-24),height=Math.min(440,window.innerHeight-24);
  const below=window.innerHeight-box.bottom-12,above=box.top-12;
  const placeBelow=below>=height+6||below>=above;
  const maxHeight=Math.max(120,Math.min(height,(placeBelow?below:above)-6));
  setPosition({width,left:Math.max(12,Math.min(box.left,window.innerWidth-width-12)),top:placeBelow?box.bottom+6:box.top-maxHeight-6,maxHeight});
 }
 function show(){if(disabled)return;setQuery('');setBrowse(false);setFilter('all');place();setOpen(true);}
 function choose(task){onChange(task.id);setOpen(false);trigger.current?.focus({preventScroll:true});}
 useEffect(()=>{if(open)search.current?.focus({preventScroll:true});},[open]);
 useEffect(()=>{
  if(!open)return;
  function outside(event){if(!trigger.current?.contains(event.target)&&!panel.current?.contains(event.target))setOpen(false);}
  function escape(event){if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus({preventScroll:true});}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open]);
 return <div className="activity-task-picker">
  <button ref={trigger} type="button" className="activity-task-trigger" aria-label={tr('Choose an assignment')} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={()=>open?setOpen(false):show()}>
   <span>{selected?<><i style={{background:selectedSubject.color}}/>{selectedSubject.short} · {selected.title}</>:tr('Choose an assignment')}</span><ChevronDown size={16}/>
  </button>
  {open&&createPortal(<div ref={panel} className="activity-task-panel" role="dialog" aria-label={tr('Choose an assignment')} style={position}>
   <label className="activity-task-search"><Search size={16}/><input ref={search} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={tr('Search subject or assignment')} aria-label={tr('Search subject or assignment')}/></label>
   {!query.trim()&&<div className="activity-task-tools"><span>{tr(browse||filter!=='all'?'Browse assignments':'Near this date')}</span><button type="button" onClick={()=>{setBrowse(current=>!current);setFilter('all');}}>{tr(browse||filter!=='all'?'Show nearby':'Browse all')}</button></div>}
   {(browse||filter!=='all'||query.trim())&&<div className="activity-task-subjects" aria-label={tr('Filter by subject')}><button type="button" className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>{tr('All')}</button>{subjects.filter(item=>tasks.some(task=>task.subject===item.id)).map(item=><button type="button" className={filter===item.id?'active':''} key={item.id} onClick={()=>setFilter(item.id)}>{item.short}</button>)}</div>}
   <div className="activity-task-results">{Object.keys(groups).length?Object.entries(groups).map(([group,items])=><section className="activity-task-group" key={group}>{group!=='nearby'&&<h3>{subject(group).short}</h3>}{items.map(task=><button type="button" className="activity-task-option" key={task.id} onClick={()=>choose(task)}><span className="activity-task-option-main"><strong>{task.title}</strong><small>{subject(task.subject).short} · {task.due?fmt(task.due,{year:undefined}):tr('No deadline')}</small></span>{task.id===value?<Check size={16}/>:task.status==='In progress'?<em>{tr('In progress')}</em>:task.status==='Done'?<em>{tr('Done')}</em>:null}</button>)}</section>):<p className="activity-task-empty">{tr('No assignments found.')}</p>}</div>
  </div>,document.body)}
 </div>;
}
