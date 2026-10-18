'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Check,ChevronDown,X} from 'lucide-react';

const colors=[['Blue','#77bbff'],['Lavender','#b29aff'],['Mint','#68d7af'],['Coral','#ff9685'],['Gold','#e2c477'],['Rose','#d9a2c6'],['Teal','#68c7cf'],['Orange','#e9ac73'],['Sage','#a8c49d'],['Silver','#b4bfcc']];
export default function SubjectColorPicker({value,onChange}){
 const [open,setOpen]=useState(false),[hex,setHex]=useState(value),root=useRef(null),trigger=useRef(null),id=useId();
 useEffect(()=>setHex(value),[value]);
 useEffect(()=>{if(!open)return;const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);};document.addEventListener('pointerdown',outside);root.current?.querySelector('[aria-pressed="true"]')?.focus();return()=>document.removeEventListener('pointerdown',outside);},[open]);
 function close(){setOpen(false);trigger.current?.focus();}
 return <div className="subject-color-control" ref={root} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
  <span id={`${id}-label`} className="setup-field-label">Color</span>
  <button ref={trigger} type="button" className="subject-color-trigger" aria-labelledby={`${id}-label`} aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(current=>!current)}><i style={{background:value}}/><span>{colors.find(([,color])=>color.toLowerCase()===value.toLowerCase())?.[0]||'Custom'}</span><ChevronDown size={14}/></button>
  {open&&<div id={id} className="subject-color-panel" role="group" aria-label="Subject colors"><div className="subject-color-heading"><strong>Subject color</strong><button type="button" className="icon-button" aria-label="Close colors" onClick={close}><X size={16}/></button></div><div className="subject-color-swatches">{colors.map(([name,color])=><button key={color} type="button" aria-label={name} aria-pressed={value.toLowerCase()===color.toLowerCase()} style={{background:color}} onClick={()=>{onChange(color);close();}}>{value.toLowerCase()===color.toLowerCase()&&<Check size={18}/>}</button>)}</div><label>Custom color<input aria-label="Custom color hex code" value={hex} maxLength={7} placeholder="#77bbff" spellCheck={false} onChange={event=>{setHex(event.target.value);if(/^#[0-9a-f]{6}$/i.test(event.target.value))onChange(event.target.value);}} onBlur={()=>setHex(value)}/></label></div>}
 </div>;
}
