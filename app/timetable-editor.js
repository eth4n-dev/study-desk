'use client';
import {useEffect,useRef,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,Plus,X} from 'lucide-react';
import {addDays,fmt,monday,scheduleSlots,timeLabel,todayKey} from '../lib/model.mjs';
import {normalizeTime} from '../lib/date-input.mjs';
import {SESSION_START,SESSION_END,selectSessionRange,sessionRecord} from '../lib/timetable-editor.mjs';
import DateTimeField from './date-time-field';
import ChoiceSelect from './choice-select';
const dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const label=date=>fmt(date+'T12:00Z',{weekday:'short',day:'numeric',month:'short'});
const toMinutes=value=>{if(value==='24:00')return 1440;const normalized=normalizeTime(value);if(!normalized)return NaN;const [h,m]=normalized.split(':').map(Number);return h*60+m;};

export default function TimetableEditor({state,initial,onSave,onClose}){
 const today=todayKey();
 const initialDate=initial?.date||addDays(monday(today),initial?.weekday??((new Date(today+'T12:00Z').getUTCDay()+6)%7));
 const [form,setForm]=useState(()=>({original:initial,subject:initial?.subject||state.subjects[0]?.id||'',type:initial?.type||'Lecture',date:initialDate,start:initial?.start??540,end:initial?.end??600,room:initial?.room||'',repeat:initial?.date?'once':String(initial?.everyWeeks||1),startDate:initial?.startDate||today,endDate:initial?.endDate||addDays(today,112)}));
 const [week,setWeek]=useState(monday(initialDate)),[error,setError]=useState(''),[startText,setStartText]=useState(timeLabel(form.start)),[endText,setEndText]=useState(timeLabel(form.end));
 const [range,setRange]=useState(null),drag=useRef(null),ignoreClick=useRef(false),scroll=useRef(null),subjectField=useRef(null);
 const dates=Array.from({length:7},(_,i)=>addDays(week,i)),slots=scheduleSlots({...state,scheduleRules:(state.scheduleRules||[]).filter(item=>item.id!==initial?.id),scheduleEvents:(state.scheduleEvents||[]).filter(item=>item.id!==initial?.id)},week),hours=Array.from({length:(SESSION_END-SESSION_START)/60},(_,i)=>SESSION_START+i*60);
 const visibleDate=dates.includes(form.date)?form.date:dates[0];
 useEffect(()=>{subjectField.current?.focus({preventScroll:true});scroll.current?.scrollTo({top:Math.max(0,(form.start-SESSION_START-60)*.65)});},[]);
 function update(patch){setForm(current=>({...current,...patch}));setError('');if(patch.start!==undefined)setStartText(timeLabel(patch.start));if(patch.end!==undefined)setEndText(timeLabel(patch.end));}
 function choose(date,start,end=Math.min(SESSION_END,start+(form.end-form.start||60))){update({date,start,end,...(!initial?{startDate:date,endDate:form.endDate<date?addDays(date,112):form.endDate}:{})});}
 function minuteAt(event,element){return SESSION_START+(event.clientY-element.getBoundingClientRect().top)/.65;}
 function begin(event,date){if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('.session-existing'))return;event.preventDefault();const element=event.currentTarget,anchor=minuteAt(event,element);drag.current={element,date,anchor,x:event.clientX,y:event.clientY,moved:false};element.setPointerCapture(event.pointerId);}
 function move(event){const current=drag.current;if(!current)return;if(Math.hypot(event.clientX-current.x,event.clientY-current.y)>5)current.moved=true;if(current.moved)setRange({date:current.date,...selectSessionRange(current.anchor,minuteAt(event,current.element))});}
 function finish(event){const current=drag.current;if(!current)return;drag.current=null;if(current.moved){const selection=selectSessionRange(current.anchor,minuteAt(event,current.element));choose(current.date,selection.start,selection.end);ignoreClick.current=true;setTimeout(()=>{ignoreClick.current=false;},0);}setRange(null);}
 function tap(event,date){if(ignoreClick.current||event.target.closest('.session-existing'))return;const start=Math.max(SESSION_START,Math.min(SESSION_END-15,Math.floor(minuteAt(event,event.currentTarget)/15)*15));choose(date,start);}
 function shiftWeek(amount){const next=addDays(week,amount*7);setWeek(next);choose(addDays(visibleDate,amount*7),form.start,form.end);}
 function submit(event){event.preventDefault();try{const next={...form,start:toMinutes(startText),end:toMinutes(endText)};const {value,mode}=sessionRecord(next,initial?.id||crypto.randomUUID());onSave(value,mode);}catch(caught){setError(caught.message);}}
 const selection=range||form;
 return <div className="session-editor">
  <header className="session-editor-heading"><div><h3>{initial?'Edit lecture or exercise':'Add a lecture or exercise'}</h3><p>Pick a time in the week. On desktop, drag to choose a longer session.</p></div><button type="button" className="icon-button" aria-label="Close timetable editor" onClick={onClose}><X size={19}/></button></header>
  <div className="session-editor-layout"><div className="session-week">
   <div className="session-week-nav"><div><button type="button" className="icon-button" aria-label="Previous week" onClick={()=>shiftWeek(-1)}><ChevronLeft size={17}/></button><strong>{label(dates[0])} – {label(dates[6])}</strong><button type="button" className="icon-button" aria-label="Next week" onClick={()=>shiftWeek(1)}><ChevronRight size={17}/></button></div><button type="button" className="text-button" onClick={()=>{setWeek(monday(today));choose(today,form.start,form.end);}}>This week</button></div>
   <div className="session-week-days"><span/>{dates.map((date,index)=><button type="button" key={date} aria-pressed={date===visibleDate} onClick={()=>choose(date,form.start,form.end)}><span>{dayNames[index].slice(0,3)}</span><strong>{Number(date.slice(-2))}</strong></button>)}</div>
   <div className="session-week-scroll" ref={scroll}><div className="session-week-grid" style={{height:(SESSION_END-SESSION_START)*.65}}><div className="session-ruler">{hours.map(minute=><span key={minute} style={{top:(minute-SESSION_START)*.65}}>{timeLabel(minute)}</span>)}</div>{dates.map((date,index)=><div key={date} className={`session-lane ${date===visibleDate?'is-active':''}`} aria-label={dayNames[index]} onPointerDown={event=>begin(event,date)} onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{drag.current=null;setRange(null);}} onClick={event=>tap(event,date)}>
    {hours.map(minute=><button key={minute} type="button" className="session-hour" tabIndex={minute===Math.floor(form.start/60)*60?0:-1} style={{top:(minute-SESSION_START)*.65,height:39}} aria-label={`Choose ${dayNames[index]} ${timeLabel(minute)}`} onClick={event=>{if(event.detail===0){event.stopPropagation();choose(date,minute);}}}/>)}
    {slots.filter(slot=>slot.date===date&&slot.end>SESSION_START&&slot.start<SESSION_END).map(slot=><div className="session-existing" key={slot.id} style={{top:(Math.max(SESSION_START,slot.start)-SESSION_START)*.65,height:(Math.min(SESSION_END,slot.end)-Math.max(SESSION_START,slot.start))*.65,'--session-color':state.subjects.find(subject=>subject.id===slot.subject)?.color||'#accbbe'}} title={`${state.subjects.find(subject=>subject.id===slot.subject)?.name} · ${slot.type} · ${timeLabel(slot.start)}–${timeLabel(slot.end)}`}><strong>{state.subjects.find(subject=>subject.id===slot.subject)?.short}</strong><span>{slot.type}</span></div>)}
    {selection.date===date&&<div className="session-selection" style={{top:(selection.start-SESSION_START)*.65,height:Math.max(16,(selection.end-selection.start)*.65)}}><strong>{timeLabel(selection.start)}–{timeLabel(selection.end)}</strong><span>{state.subjects.find(subject=>subject.id===form.subject)?.short||'New session'}</span></div>}
   </div>)}</div></div>
  </div><form className="session-details" onSubmit={submit}>
   <p className="session-chosen-time"><CalendarDays size={17}/>{label(form.date)} · {timeLabel(form.start)}–{timeLabel(form.end)}</p>
   <label>Subject<ChoiceSelect ref={subjectField} value={form.subject} onChange={event=>update({subject:event.target.value})} required><option value="">Choose subject</option>{state.subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</ChoiceSelect></label>
   <label>Session type<ChoiceSelect value={form.type} onChange={event=>update({type:event.target.value})}>{[...new Set(['Lecture','Exercise','Practical','Seminar','Class','Other',form.type])].map(type=><option key={type} value={type}>{type==='Exercise'?'Exercise session':type}</option>)}</ChoiceSelect></label>
   <div className="session-time-fields"><label>Start · 24h<input aria-label="Session start time" type="text" inputMode="numeric" value={startText} maxLength={5} required onChange={event=>setStartText(event.target.value)} onBlur={()=>{const start=toMinutes(startText);if(Number.isFinite(start)){const duration=form.end-form.start;update({start,end:Math.min(1440,start+duration)});}}}/></label><label>End · 24h<input aria-label="Session end time" type="text" inputMode="numeric" value={endText} maxLength={5} required onChange={event=>setEndText(event.target.value)} onBlur={()=>{const end=toMinutes(endText);if(Number.isFinite(end)&&end>form.start)update({end});}}/></label></div>
   <div className="session-durations" role="group" aria-label="Session duration">{[45,60,90,105,120].map(duration=><button type="button" key={duration} aria-pressed={form.end-form.start===duration} onClick={()=>update({end:Math.min(1440,form.start+duration)})}>{duration}m</button>)}</div>
   <label>Room <span className="optional-label">Optional</span><input value={form.room} onChange={event=>update({room:event.target.value})} placeholder="e.g. CHN F42" maxLength={100}/></label>
   <label>Repeat<ChoiceSelect value={form.repeat} onChange={event=>update({repeat:event.target.value})}><option value="1">Every week</option><option value="2">Every two weeks</option><option value="once">Just this date</option></ChoiceSelect></label>
   {form.repeat!=='once'&&<details className="session-repeat-dates"><summary>First & last date <span>{label(form.startDate)} – {label(form.endDate)}</span></summary><DateTimeField label="First date" dateOnly required value={form.startDate} onChange={startDate=>update({startDate})}/><DateTimeField label="Last date" dateOnly required value={form.endDate} onChange={endDate=>update({endDate})}/></details>}
   {error&&<p className="assignment-form-error" role="alert">{error}</p>}
   <div className="session-save-actions"><button type="submit" className="button primary"><Plus size={15}/>{initial?'Save changes':'Add to timetable'}</button><button type="button" className="text-button quiet" onClick={onClose}>Cancel</button></div>
  </form></div>
 </div>;
}
