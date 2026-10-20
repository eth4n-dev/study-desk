'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Clock3} from 'lucide-react';
import {translate} from '../lib/i18n.mjs';

const pad=value=>String(value).padStart(2,'0');
const valid=value=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export default function ActivityTimeField({value,onChange}){
 const tr=value=>translate(value,typeof document==='undefined'?'en':document.documentElement.lang.slice(0,2));
 const [open,setOpen]=useState(false),[hour,setHour]=useState(value.slice(0,2)),[typed,setTyped]=useState(value),[error,setError]=useState(''),[position,setPosition]=useState({});
 const trigger=useRef(null),panel=useRef(null),entry=useRef(null);
 function place(){
  if(!trigger.current)return;
  const box=trigger.current.getBoundingClientRect(),width=Math.min(280,window.innerWidth-24),height=320;
  const below=window.innerHeight-box.bottom-12,above=box.top-12,placeBelow=below>=height||below>=above;
  const maxHeight=Math.max(160,Math.min(height,(placeBelow?below:above)-6));
  setPosition({width,left:Math.max(12,Math.min(box.left,window.innerWidth-width-12)),top:placeBelow?box.bottom+6:box.top-maxHeight-6,maxHeight});
 }
 function show(){setHour(value.slice(0,2)||'12');setTyped(value);setError('');place();setOpen(true);}
 function choose(next){onChange(next);setOpen(false);trigger.current?.focus({preventScroll:true});}
 function useTyped(){if(valid(typed))choose(typed);else setError('Enter a time as HH:MM.');}
 useEffect(()=>{
  if(!open)return;
  let lastTouchY=null;
  function scrollableColumn(target){return target instanceof Element?target.closest('.activity-time-columns > div'):null;}
  function containWheel(event){
   const column=scrollableColumn(event.target);
   if(!column||!event.deltaY){event.preventDefault();return;}
   const atStart=column.scrollTop<=0,atEnd=column.scrollTop+column.clientHeight>=column.scrollHeight-1;
   if((event.deltaY<0&&atStart)||(event.deltaY>0&&atEnd))event.preventDefault();
  }
  function touchStart(event){lastTouchY=event.touches[0]?.clientY??null;}
  function containTouch(event){
   const touch=event.touches[0];if(!touch)return;
   const column=scrollableColumn(event.target),nextY=touch.clientY,delta=lastTouchY===null?0:lastTouchY-nextY;lastTouchY=nextY;
   if(!column){event.preventDefault();return;}
   const atStart=column.scrollTop<=0,atEnd=column.scrollTop+column.clientHeight>=column.scrollHeight-1;
   if((delta<0&&atStart)||(delta>0&&atEnd))event.preventDefault();
  }
  function outside(event){if(!trigger.current?.contains(event.target)&&!panel.current?.contains(event.target))setOpen(false);}
  function escape(event){if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus({preventScroll:true});}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  panel.current?.addEventListener('wheel',containWheel,{passive:false});
  panel.current?.addEventListener('touchstart',touchStart,{passive:true});
  panel.current?.addEventListener('touchmove',containTouch,{passive:false});
  entry.current?.focus({preventScroll:true});
  const [hours,minutes]=panel.current?.querySelectorAll('.activity-time-columns > div')||[];
  if(hours)hours.scrollTop=Math.max(0,(Number(value.slice(0,2))-3)*36);
  if(minutes)minutes.scrollTop=Math.max(0,(Math.floor(Number(value.slice(3,5))/5)-3)*36);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);panel.current?.removeEventListener('wheel',containWheel);panel.current?.removeEventListener('touchstart',touchStart);panel.current?.removeEventListener('touchmove',containTouch);};
 },[open]);
 return <div className="activity-time-field"><span className="date-field-label">{tr('Time')}</span><button ref={trigger} type="button" className="activity-time-trigger" aria-label={`${tr('Time')}: ${value}`} aria-haspopup="dialog" aria-expanded={open} onClick={()=>open?setOpen(false):show()}><Clock3 size={16}/><span>{value}</span></button>
  {open&&createPortal(<div ref={panel} className="activity-time-panel" role="dialog" aria-label={tr('Choose time')} style={position}>
   <div className="activity-time-exact"><input ref={entry} aria-label={tr('Exact time, 24-hour')} inputMode="numeric" value={typed} maxLength={5} onChange={event=>{setTyped(event.target.value);setError('');}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();useTyped();}}}/><button type="button" className="button small" onClick={useTyped}>{tr('Select time')}</button></div>
   {error&&<p className="activity-time-error" role="alert">{tr(error)}</p>}
   <p className="activity-time-hint">{tr('Or choose an hour and minute')}</p>
   <div className="activity-time-columns"><div aria-label={tr('Hour')}>{Array.from({length:24},(_,index)=>pad(index)).map(item=><button type="button" key={item} className={item===hour?'selected':''} onClick={()=>{setHour(item);setTyped(`${item}:${typed.slice(3,5)||'00'}`);}}>{item}</button>)}</div><div aria-label={tr('Minute')}>{Array.from({length:12},(_,index)=>pad(index*5)).map(item=><button type="button" key={item} className={item===value.slice(3,5)&&hour===value.slice(0,2)?'selected':''} onClick={()=>choose(`${hour}:${item}`)}>{item}</button>)}</div></div>
  </div>,document.body)}
 </div>;
}
