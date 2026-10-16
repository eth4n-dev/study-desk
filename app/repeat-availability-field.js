'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CalendarDays,Check,Clock3,X} from 'lucide-react';
import {normalizeTime} from '../lib/date-input.mjs';

const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const FULL_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function weekday(date){return (new Date(date+'T12:00Z').getUTCDay()+6)%7;}

export default function RepeatAvailabilityField({every,deadline,value,onChange}){
 const id=useId(),trigger=useRef(null),panel=useRef(null),dueDay=deadline?.slice(0,10);
 const dueWeekday=dueDay&&/^\d{4}-\d{2}-\d{2}$/.test(dueDay)?weekday(dueDay):null;
 const [open,setOpen]=useState(false),[position,setPosition]=useState({});
 const offset=value?.offset??null,time=value?.time||'';
 const selected=offset==null||dueWeekday==null?null:offset===0?{deadlineDay:true}:{week:every-1-Math.floor((offset-1)/7),dayIndex:(every*7-offset)%7};
 const selectedDay=selected&&!selected.deadlineDay?FULL_DAYS[(dueWeekday+selected.dayIndex)%7]:null;
 const label=selected?.deadlineDay?'Deadline day':selectedDay?`${every>1?`Week ${selected.week+1} · `:''}${selectedDay}`:'Choose a day';
 function place(){
  const rect=trigger.current.getBoundingClientRect(),width=Math.min(Math.max(300,rect.width),window.innerWidth-32),height=panel.current?.offsetHeight||Math.min(172+every*82,420);
  setPosition({width,left:Math.max(16,Math.min(rect.left,window.innerWidth-width-16)),top:rect.bottom+height+8<window.innerHeight?rect.bottom+8:Math.max(16,rect.top-height-8),maxHeight:window.innerHeight-32});
 }
 function show(){if(dueWeekday==null)return;place();setOpen(true);}
 function close(){setOpen(false);trigger.current?.focus({preventScroll:true});}
 function choose(week,dayIndex){onChange({offset:every*7-(week*7+dayIndex),time:time||'12:00'});close();}
 useEffect(()=>{if(offset!=null&&offset>every*7)onChange(null);},[every,offset]);
 useEffect(()=>{
  if(!open)return;
  function outside(e){if(!trigger.current?.contains(e.target)&&!panel.current?.contains(e.target))setOpen(false);}
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open]);
 return <div className="repeat-availability-field">
  <span className="date-field-label">Available from <span className="optional-label">Optional</span></span>
  <div className="date-time-control">
   <button ref={trigger} type="button" className={`date-trigger ${selected?'':'empty-date'}`} aria-label={`Available from: ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?`${id}-picker`:undefined} disabled={dueWeekday==null} onClick={()=>open?close():show()}><CalendarDays size={16}/><span>{label}</span></button>
   <label className="time-entry"><Clock3 size={15}/><input aria-label="Available from time, 24-hour" type="text" inputMode="numeric" placeholder="Time" value={time} maxLength={5} pattern="(?:[01]?[0-9]|2[0-3]):?[0-5][0-9]" required={offset!=null} disabled={offset==null} onChange={e=>onChange({...value,time:e.target.value})} onBlur={()=>{const normal=normalizeTime(time);if(normal&&normal!==time)onChange({...value,time:normal});}}/></label>
   {offset!=null&&<button type="button" className="date-clear" aria-label="Clear available from" onClick={()=>onChange(null)}><X size={13}/></button>}
  </div>
  {dueWeekday==null&&<span className="field-hint">Set the deadline first.</span>}
  {open&&createPortal(<div ref={panel} id={`${id}-picker`} className="repeat-week-picker" style={position} role="dialog" aria-label="Choose a day in the repeating cycle" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}}>
   <div className="repeat-week-head"><strong>{every===1?'Every week':`Every ${every} weeks`}</strong><span>From one deadline to the next</span></div>
   {Array.from({length:every},(_,week)=><div className="repeat-week" key={week}>
    {every>1&&<div className="repeat-week-label">Week {week+1}</div>}
    <div className="repeat-week-days">{Array.from({length:7},(_,dayIndex)=>{const day=(dueWeekday+dayIndex)%7,active=selected?.week===week&&selected?.dayIndex===dayIndex;return <button type="button" key={dayIndex} aria-label={`${every>1?`Week ${week+1}, `:''}${FULL_DAYS[day]}`} aria-pressed={active} className={active?'selected':''} onClick={()=>choose(week,dayIndex)}><span>{DAYS[day]}</span>{active&&<Check size={12}/>}</button>;})}</div>
   </div>)}
   <button type="button" className="text-button quiet repeat-week-close" onClick={close}>Close</button>
  </div>,trigger.current?.closest('dialog')||document.body)}
 </div>;
}
