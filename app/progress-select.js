'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown} from 'lucide-react';
import {STATUSES} from '../lib/model.mjs';

const statusClass=value=>value.toLowerCase().replaceAll(' ','-');
export default function ProgressSelect({value,onChange,label='Progress',name}){
 const id=useId(),trigger=useRef(null),menu=useRef(null);
 const [open,setOpen]=useState(false),[active,setActive]=useState(0),[position,setPosition]=useState({});
 function place(){const rect=trigger.current.getBoundingClientRect(),width=Math.max(176,rect.width);const height=132;setPosition({width,left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),top:rect.bottom+height+6>window.innerHeight?Math.max(12,rect.top-height-6):rect.bottom+6});}
 function show(index=STATUSES.indexOf(value)){place();setActive(index);setOpen(true);}
 function choose(index){onChange(STATUSES[index]);setOpen(false);trigger.current?.focus();}
 useEffect(()=>{if(!open)return;function outside(e){if(!trigger.current?.contains(e.target)&&!menu.current?.contains(e.target))setOpen(false);}document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};},[open]);
 function keydown(e){
  if(e.key==='Tab'){setOpen(false);return;}
  if(e.key==='Escape'){if(open){e.preventDefault();e.stopPropagation();setOpen(false);}return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();let next=e.key==='Home'?0:e.key==='End'?STATUSES.length-1:open?(active+(e.key==='ArrowDown'?1:-1)+STATUSES.length)%STATUSES.length:STATUSES.indexOf(value);open?setActive(next):show(next);return;}
  if(e.key==='Enter'||e.key===' '){e.preventDefault();open?choose(active):show();}
 }
 return <><button ref={trigger} type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} className={`status progress-trigger ${statusClass(value)}`} onClick={()=>open?setOpen(false):show()} onKeyDown={keydown} onBlur={e=>{if(!menu.current?.contains(e.relatedTarget))setOpen(false);}}><span className="progress-dot"/><span>{value}</span><ChevronDown size={14}/></button>{name&&<input type="hidden" name={name} value={value}/>} {open&&createPortal(<div ref={menu} id={id} role="listbox" aria-label={label} className="progress-menu" style={position}>{STATUSES.map((status,index)=><button key={status} id={`${id}-${index}`} type="button" tabIndex={-1} role="option" aria-selected={value===status} className={`progress-option ${statusClass(status)} ${active===index?'highlighted':''}`} onPointerDown={e=>e.preventDefault()} onPointerMove={()=>setActive(index)} onClick={()=>choose(index)}><span className="progress-dot"/><span>{status}</span>{value===status&&<Check size={14}/>}</button>)}</div>,trigger.current?.closest('dialog')||document.body)}</>;
}
