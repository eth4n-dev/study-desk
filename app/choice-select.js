'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Check,ChevronDown} from 'lucide-react';

export default function ChoiceSelect({label,value,options,onChange,className=''}){
 const [open,setOpen]=useState(false),[active,setActive]=useState(0);
 const root=useRef(null),trigger=useRef(null),id=useId();
 const selected=options.findIndex(option=>option.value===value);
 useEffect(()=>{
  if(!open)return;
  function outside(event){if(!root.current?.contains(event.target))setOpen(false);}
  function escape(event){if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 function show(){setActive(Math.max(0,selected));setOpen(true);}
 function choose(index){onChange(options[index].value);setOpen(false);trigger.current?.focus();}
 function keydown(event){
  if(['ArrowDown','ArrowUp'].includes(event.key)){
   event.preventDefault();
   if(!open){show();return;}
   setActive(index=>(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length);
  }else if(event.key==='Home'&&open){event.preventDefault();setActive(0);}
  else if(event.key==='End'&&open){event.preventDefault();setActive(options.length-1);}
  else if(['Enter',' '].includes(event.key)){event.preventDefault();if(open)choose(active);else show();}
 }
 return <div className={`choice-select ${className}`} ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
  <button ref={trigger} type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} className="choice-trigger" onClick={()=>open?setOpen(false):show()} onKeyDown={keydown}><span>{options[selected]?.label||options[0]?.label}</span><ChevronDown size={16}/></button>
  {open&&<div id={id} role="listbox" aria-label={label} className="choice-menu">{options.map((option,index)=><button key={option.value} type="button" role="option" tabIndex={-1} id={`${id}-${index}`} aria-selected={index===selected} className={`choice-option ${active===index?'highlighted':''}`} onPointerMove={()=>setActive(index)} onClick={()=>choose(index)}><span>{option.label}</span>{index===selected&&<Check size={16}/>}</button>)}</div>}
 </div>;
}
