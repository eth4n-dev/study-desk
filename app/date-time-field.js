'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CalendarDays,ChevronLeft,ChevronRight,X} from 'lucide-react';
import {addDays,monthDays,shiftMonth,todayKey} from '../lib/model.mjs';
import {displayDate,parseDisplayDate,normalizeTime} from '../lib/date-input.mjs';
import {translate} from '../lib/i18n.mjs';
import ActivityTimeField from './activity-time-field';

export default function DateTimeField({label,name,defaultValue='',value,onChange,dateOnly=false,required=false,defaultTime='23:59',hint,maxDate,disabled=false}){
 const initial=value??defaultValue;
 const [day,setDay]=useState(initial.slice(0,10)),[time,setTime]=useState(initial.slice(11,16));
 const [open,setOpen]=useState(false),[month,setMonth]=useState((initial||todayKey()).slice(0,7));
 const [typed,setTyped]=useState(''),[error,setError]=useState(''),[position,setPosition]=useState({});
 const trigger=useRef(null),panel=useRef(null),focusDay=useRef(null),id=useId();
 const today=todayKey(),days=monthDays(month);
 const language=typeof document==='undefined'?'en':document.documentElement.lang.slice(0,2);
 const tr=value=>translate(value,language);
 const localFmt=(date,options)=>new Intl.DateTimeFormat({it:'it-IT',fr:'fr-FR',de:'de-DE'}[language]||'en-GB',{timeZone:'UTC',day:'numeric',month:'short',...options}).format(new Date(date+'T12:00Z'));
 useEffect(()=>{if(value!==undefined){setDay(value.slice(0,10));setTime(value.slice(11,16));}},[value]);
 function publish(nextDay,nextTime){setDay(nextDay);setTime(nextTime);onChange?.(nextDay?(dateOnly?nextDay:`${nextDay}T${nextTime}`):'');}
 function place(){const rect=trigger.current.getBoundingClientRect(),width=Math.min(308,window.innerWidth-32),height=panel.current?.offsetHeight||390;setPosition({width,left:Math.max(16,Math.min(rect.left,window.innerWidth-width-16)),top:rect.bottom+height+8<window.innerHeight?rect.bottom+8:Math.max(16,rect.top-height-8),maxHeight:window.innerHeight-32});}
 function show(){place();setMonth((day||today).slice(0,7));focusDay.current=day||today;setTyped(displayDate(day));setError('');setOpen(true);}
 function close(){setOpen(false);trigger.current?.focus({preventScroll:true});}
 function choose(date){publish(date,dateOnly?'':time||defaultTime);close();}
 useEffect(()=>{
  if(!open)return;
  function outside(e){if(!panel.current?.contains(e.target)&&!trigger.current?.contains(e.target))setOpen(false);}
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open]);
 useEffect(()=>{if(open&&focusDay.current)panel.current?.querySelector(`[data-date="${focusDay.current}"]`)?.focus({preventScroll:true});},[open,month]);
 function moveFocus(date){focusDay.current=date;if(!date.startsWith(month))setMonth(date.slice(0,7));else panel.current?.querySelector(`[data-date="${date}"]`)?.focus({preventScroll:true});}
 function dayKey(e,date){
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
  if(step){e.preventDefault();moveFocus(addDays(date,step));}
  if(e.key==='Home'||e.key==='End'){e.preventDefault();const weekday=(new Date(date+'T12:00Z').getUTCDay()+6)%7;moveFocus(addDays(date,e.key==='Home'?-weekday:6-weekday));}
  if(e.key==='PageUp'||e.key==='PageDown'){e.preventDefault();moveFocus(shiftMonth(date.slice(0,7),e.key==='PageUp'?-1:1)+'-01');}
 }
 const validTime=normalizeTime(time),submitted=day?(dateOnly?day:validTime?`${day}T${validTime}`:''):'';
 return <div className="date-time-field">
  <span className="date-field-label" id={`${id}-label`}>{label}{!required&&<span className="optional-label">Optional</span>}</span>
  <div className="date-time-control">
   <button ref={trigger} type="button" className={`date-trigger ${day?'':'empty-date'}`} aria-label={`${tr(label)}: ${day?displayDate(day):tr('Choose date')}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?`${id}-picker`:undefined} disabled={disabled} onClick={()=>open?close():show()}><CalendarDays size={16}/><span>{day?displayDate(day):tr('Choose date')}</span></button>
   {!dateOnly&&<ActivityTimeField value={time} onChange={next=>publish(day,next)} showLabel={false} embedded disabled={disabled||!day}/>}
   {!required&&day&&<button type="button" className="date-clear" aria-label={`Clear ${label.toLowerCase()}`} disabled={disabled} onClick={()=>publish('','')}><X size={13}/></button>}
  </div>
  {name&&<input type="hidden" name={name} value={submitted}/>}
  {hint&&<span className="field-hint">{hint}</span>}
  {open&&createPortal(<div ref={panel} className="date-picker" style={position} role="dialog" aria-label={tr(`Choose ${label.toLowerCase()}`)} id={`${id}-picker`} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}}>
   <div className="date-picker-heading"><button type="button" className="icon-button" aria-label={tr('Previous month')} onClick={()=>{focusDay.current=null;setMonth(shiftMonth(month,-1));}}><ChevronLeft size={17}/></button><strong aria-live="polite">{localFmt(month+'-01',{day:undefined,month:'long',year:'numeric'})}</strong><button type="button" className="icon-button" aria-label={tr('Next month')} onClick={()=>{focusDay.current=null;setMonth(shiftMonth(month,1));}}><ChevronRight size={17}/></button></div>
   <div className="date-picker-weekdays" aria-hidden="true">{Array.from({length:7},(_,index)=>localFmt(`2026-10-${19+index}`,{weekday:'short',day:undefined,month:undefined})).map((d,index)=><span key={index}>{d}</span>)}</div>
   <div className="date-picker-days">{days.map(date=><button type="button" data-date={date} key={date} disabled={Boolean(maxDate&&date>maxDate)} tabIndex={date===(focusDay.current?.startsWith(month)?focusDay.current:day.startsWith(month)?day:month+'-01')?0:-1} aria-label={localFmt(date,{weekday:'long',month:'long',year:'numeric'})} aria-pressed={date===day} aria-current={date===today?'date':undefined} className={`${date.startsWith(month)?'':'other-month'} ${date===day?'selected':''} ${date===today?'today':''}`} onKeyDown={e=>dayKey(e,date)} onClick={()=>choose(date)}>{Number(date.slice(-2))}</button>)}</div>
   <div className="date-picker-actions"><button type="button" className="text-button" onClick={()=>choose(today)}>{tr('Today')}</button><button type="button" className="text-button quiet" onClick={close}>{tr('Close')}</button></div>
   <div className="date-picker-typed"><input aria-label={`Type ${label.toLowerCase()} date as dd/mm/yy`} placeholder="dd/mm/yy" inputMode="numeric" value={typed} maxLength={10} onChange={e=>{setTyped(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const date=parseDisplayDate(typed);date&&(!maxDate||date<=maxDate)?choose(date):setError('Use a valid past date: dd/mm/yy.');}}}/><button type="button" className="button small" onClick={()=>{const date=parseDisplayDate(typed);date&&(!maxDate||date<=maxDate)?choose(date):setError('Use a valid past date: dd/mm/yy.');}}>{tr('Use date')}</button></div>
   {error&&<p role="alert" className="date-picker-error">{tr(error)}</p>}
  </div>,trigger.current?.closest('dialog')||document.body)}
 </div>;
}
