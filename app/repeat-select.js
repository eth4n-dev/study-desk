'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown,Repeat2} from 'lucide-react';

const OPTIONS=[
 {value:0,label:'Off'},
 {value:1,label:'Every week'},
 {value:2,label:'Every 2 weeks'},
 {value:3,label:'Every 3 weeks'},
 {value:4,label:'Every 4 weeks'}
];

export default function RepeatSelect({value,onChange}){
 const id=useId(),trigger=useRef(null),menu=useRef(null);
 const [open,setOpen]=useState(false),[active,setActive]=useState(value),[position,setPosition]=useState({});
 function place(){
  const rect=trigger.current.getBoundingClientRect(),width=Math.min(rect.width,window.innerWidth-32),height=OPTIONS.length*39+10;
  setPosition({width,left:Math.max(16,Math.min(rect.left,window.innerWidth-width-16)),top:rect.bottom+height+6>window.innerHeight?Math.max(16,rect.top-height-6):rect.bottom+6,maxHeight:window.innerHeight-32});
 }
 function show(){place();setActive(value);setOpen(true);}
 function close(){setOpen(false);trigger.current?.focus({preventScroll:true});}
 function choose(option){onChange(option);close();}
 useEffect(()=>{
  if(!open)return;
  function outside(e){if(!trigger.current?.contains(e.target)&&!menu.current?.contains(e.target))setOpen(false);}
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open]);
 function keydown(e){
  if(e.key==='Tab'){setOpen(false);return;}
  if(e.key==='Escape'){if(open){e.preventDefault();e.stopPropagation();close();}return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   e.preventDefault();
   if(!open){show();return;}
   setActive(e.key==='Home'?0:e.key==='End'?OPTIONS.length-1:(active+(e.key==='ArrowDown'?1:-1)+OPTIONS.length)%OPTIONS.length);
  }
  if(e.key==='Enter'||e.key===' '){e.preventDefault();open?choose(active):show();}
 }
 return <>
  <button ref={trigger} type="button" className="repeat-trigger" role="combobox" aria-label="Repeating assignment" aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} onClick={()=>open?close():show()} onKeyDown={keydown}>
   <Repeat2 size={15}/><span className="repeat-trigger-label">Repeating assignment</span><span className="repeat-trigger-value">{OPTIONS[value].label}</span><ChevronDown size={15}/>
  </button>
  {open&&createPortal(<div ref={menu} className="repeat-menu" id={id} role="listbox" aria-label="Repeating assignment" style={position}>
   {OPTIONS.map(option=><button key={option.value} id={`${id}-${option.value}`} type="button" role="option" tabIndex={-1} aria-selected={value===option.value} className={`repeat-option ${active===option.value?'highlighted':''}`} onPointerDown={e=>e.preventDefault()} onPointerMove={()=>setActive(option.value)} onClick={()=>choose(option.value)}><span>{option.label}</span>{value===option.value&&<Check size={15}/>}</button>)}
  </div>,trigger.current?.closest('dialog')||document.body)}
 </>;
}
