'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,CalendarClock,Check,ChevronLeft,ChevronRight,File,Plus,Trash2,X} from 'lucide-react';
import {addDays,fmt,monday,timeLabel,todayKey,wallTime,scheduleSlots,isUnattended} from '../lib/model.mjs';
import {useSubjectLookup} from './workspace-context';
import {PLAN_START,PLAN_END,PLAN_STEP,PLAN_DEFAULT,planDates,clampPlanStart,canPlacePlan,firstPlanOpening,resizePlanBlock} from '../lib/planner.mjs';
import {groupWork} from '../lib/work-queue.mjs';

const dateLabel=date=>fmt(date+'T12:00:00Z',{weekday:'short',day:'numeric',month:'short'});
const durationLabel=minutes=>minutes<60?`${minutes} min`:`${Math.floor(minutes/60)}h${minutes%60?` ${minutes%60}m`:''}`;
const dueLabel=iso=>fmt(iso,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});

export default function StudyPlanner({tasks,blocks,files=[],onOpenFile,unattendedSlots=[],scheduleState,now,onAdd,onChange,onRemove,onOpenTask,onOpenClass,onAddPersonalTask,focusTask}){
 const subject=useSubjectLookup();
 const currentWeek=monday(todayKey(now));
 const [weekOffset,setWeekOffset]=useState(0);
 const [mobile,setMobile]=useState(false);
 const [selectedDay,setSelectedDay]=useState(todayKey(now));
 const [selectedTask,setSelectedTask]=useState(null);
 const [selectedBlockId,setSelectedBlockId]=useState(null);
 const [openDueDay,setOpenDueDay]=useState(null);
 const [preview,setPreview]=useState(null);
 const [showOverdue,setShowOverdue]=useState(false);
 const [notice,setNotice]=useState('');
 const [quickAdd,setQuickAdd]=useState(null);
 const [liftedId,setLiftedId]=useState(null);
 const [queueEdges,setQueueEdges]=useState({atStart:true,atEnd:false});
 const dragRef=useRef(null);
 const pendingTouchRef=useRef(null);
 const suppressClickRef=useRef(false);
 const gridRef=useRef(null);
 const queueListRef=useRef(null);
 const lastPointerType=useRef('mouse');
 const quickTitleRef=useRef(null);
 const pxPerMinute=mobile?1:42/60;
 const week=addDays(currentWeek,weekOffset*7);
 const days=planDates(week);
 const visibleDays=mobile?[days.includes(selectedDay)?selectedDay:days[0]]:days;
 const scheduled=useMemo(()=>blocks.filter(b=>days.includes(b.date)&&tasks.some(t=>t.id===b.taskId)),[blocks,days.join(','),tasks]);
 const classes=useMemo(()=>scheduleSlots(scheduleState,week),[scheduleState,week]);
 const latestDate=addDays(currentWeek,13);
 const groups=useMemo(()=>groupWork(tasks,now),[tasks,now]);
 const currentQueue=[...groups.inProgress,...groups.upcoming.filter(task=>!task.due||wallTime(task.due).slice(0,10)<=latestDate)];
 const queue=showOverdue?[...currentQueue,...groups.overdue]:currentQueue;
 const today=todayKey(now);
 const hours=Array.from({length:PLAN_END/60-PLAN_START/60+1},(_,i)=>PLAN_START/60+i);
 function syncQueueEdges(){const list=queueListRef.current;if(!list)return;const atStart=list.scrollLeft<=1,atEnd=list.scrollLeft+list.clientWidth>=list.scrollWidth-1;setQueueEdges(current=>current.atStart===atStart&&current.atEnd===atEnd?current:{atStart,atEnd});}

 useEffect(()=>{const media=window.matchMedia('(max-width: 760px)');const update=()=>setMobile(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{if(focusTask?.id)setSelectedTask(focusTask.id);},[focusTask]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(timer);},[notice]);
 useEffect(()=>{if(!quickAdd)return;quickTitleRef.current?.focus();const escape=event=>{if(event.key==='Escape')setQuickAdd(null);};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[quickAdd]);
 useEffect(()=>{if(!openDueDay)return;const close=event=>{if(!event.target.closest('.plan-due-wrap'))setOpenDueDay(null);};const escape=event=>{if(event.key==='Escape'){setOpenDueDay(null);if(document.activeElement?.classList.contains('plan-due-trigger'))document.activeElement.blur();}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};},[openDueDay]);
 useEffect(()=>{const list=queueListRef.current;if(!list)return;syncQueueEdges();const observer=new ResizeObserver(syncQueueEdges);observer.observe(list);return()=>observer.disconnect();},[mobile,queue.length]);

 function startDrag(event,kind,taskId,block=null){
  lastPointerType.current=event.pointerType;
  if(event.button!==0||(!kind.startsWith('resize')&&event.target.closest('[data-plan-control]')))return;
  if(kind==='new'&&event.pointerType==='touch')return;
  const element=event.currentTarget,rect=element.getBoundingClientRect();
  const makeDrag=()=>({kind,taskId,block,x:event.clientX,y:event.clientY,offset:kind==='move'?event.clientY-rect.top:0,moved:false,candidate:null,valid:false});
  if(event.pointerType==='touch'&&kind==='move'){
   const pending={block,x:event.clientX,y:event.clientY,lastY:event.clientY,pointerId:event.pointerId,mode:'pending',scrollElement:element.closest('.plan-timeline-scroll')};
   pending.timer=setTimeout(()=>{if(pendingTouchRef.current!==pending||pending.mode!=='pending')return;pendingTouchRef.current=null;dragRef.current=makeDrag();setLiftedId(block?.id||taskId);},380);
   pendingTouchRef.current=pending;
   return;
  }
  event.preventDefault();
  dragRef.current=makeDrag();
 }
 function locate(event,drag){
  if(drag.kind.startsWith('resize'))return resizePlanBlock(drag.block,drag.kind==='resize-start'?'start':'end',(event.clientY-drag.y)/pxPerMinute);
  const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-plan-date]');
  if(!target)return null;
  const date=target.dataset.planDate;
  const duration=drag.block?.duration||PLAN_DEFAULT;
  const start=clampPlanStart(PLAN_START+(event.clientY-target.getBoundingClientRect().top-drag.offset)/pxPerMinute,duration);
  return {id:drag.block?.id||null,taskId:drag.taskId,date,start,duration};
 }
 useEffect(()=>{
  const move=event=>{
   const pending=pendingTouchRef.current;
   if(pending&&event.pointerId===pending.pointerId){
    if(pending.mode==='pending'&&Math.hypot(event.clientX-pending.x,event.clientY-pending.y)>7){clearTimeout(pending.timer);pending.mode='scroll';suppressClickRef.current=true;}
    if(pending.mode==='scroll'){
     const dy=event.clientY-pending.lastY;
     pending.scrollElement?.scrollBy(0,-dy);
     pending.lastY=event.clientY;event.preventDefault();
    }
    return;
   }
   const drag=dragRef.current;if(!drag)return;
   if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5)return;
   drag.moved=true;
   suppressClickRef.current=true;
   const candidate=locate(event,drag);
   drag.candidate=candidate;
   drag.valid=Boolean(candidate&&canPlacePlan(candidate,blocks,week,drag.block?.id,unattendedSlots,scheduleState));
   setPreview(candidate?{...candidate,valid:drag.valid,kind:drag.kind}:null);
   if(event.pointerType==='touch')event.preventDefault();
  };
  const end=()=>{
   const pending=pendingTouchRef.current;
   if(pending){clearTimeout(pending.timer);pendingTouchRef.current=null;if(pending.mode==='scroll')setTimeout(()=>{suppressClickRef.current=false;},250);return;}
   const drag=dragRef.current;if(!drag)return;
   dragRef.current=null;setPreview(null);setLiftedId(null);
   if(!drag.moved){
    if(drag.kind==='new'){setSelectedTask(drag.taskId);if(window.matchMedia('(max-width: 1050px)').matches)gridRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}
    return;
   }
   setTimeout(()=>{suppressClickRef.current=false;},250);
   if(!drag.valid){setNotice('That time is occupied. Try an open part of the week.');return;}
   if(drag.kind==='new'){onAdd({...drag.candidate,id:crypto.randomUUID()});setSelectedTask(null);}
   else {onChange(drag.candidate);setSelectedBlockId(drag.block?.id||null);}
  };
  const cancel=()=>{if(pendingTouchRef.current)clearTimeout(pendingTouchRef.current.timer);pendingTouchRef.current=null;dragRef.current=null;setPreview(null);setLiftedId(null);};
  window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancel);
  return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);};
 },[blocks,week,onAdd,onChange,tasks,unattendedSlots,pxPerMinute]);

 function placeByTap(event,date){
  if(suppressClickRef.current){suppressClickRef.current=false;return;}
  if(event.target.closest('.plan-block,.plan-class'))return;
  setSelectedBlockId(null);
  const lane=event.currentTarget;
  const start=clampPlanStart(PLAN_START+(event.clientY-lane.getBoundingClientRect().top)/pxPerMinute,PLAN_DEFAULT);
  if(!selectedTask){const opening=firstPlanOpening(date,blocks,week,PLAN_DEFAULT,start,unattendedSlots,scheduleState);if(opening===null){setNotice('No free hour remains here. Choose another day.');return;}setQuickAdd({date,start:opening});return;}
  const candidate={id:crypto.randomUUID(),taskId:selectedTask,date,start,duration:PLAN_DEFAULT};
  const opening=canPlacePlan(candidate,blocks,week,null,unattendedSlots,scheduleState)?start:firstPlanOpening(date,blocks,week,PLAN_DEFAULT,start,unattendedSlots,scheduleState);
  if(opening===null){setNotice('No free hour remains here. Choose another day.');return;}
  onAdd({...candidate,start:opening});setSelectedTask(null);
 }
 function keyboardPlace(date){
  setSelectedBlockId(null);
  const opening=firstPlanOpening(date,blocks,week,PLAN_DEFAULT,9*60,unattendedSlots,scheduleState);
  if(opening===null){setNotice('No free hour remains here. Choose another day.');return;}
  if(!selectedTask){setQuickAdd({date,start:opening});return;}
  onAdd({id:crypto.randomUUID(),taskId:selectedTask,date,start:opening,duration:PLAN_DEFAULT});setSelectedTask(null);
 }
 function keyboardMove(event,block){
  if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onOpenTask(tasks.find(task=>task.id===block.taskId),block);return;}
  if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();event.stopPropagation();onRemove(block.id);return;}
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();
  const delta=event.key==='ArrowDown'?PLAN_STEP:event.key==='ArrowUp'?-PLAN_STEP:0;
  const dayDelta=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
  const candidate=event.shiftKey&&delta?{...block,duration:block.duration+delta}:{...block,date:addDays(block.date,dayDelta),start:block.start+delta};
  if(canPlacePlan(candidate,blocks,week,block.id,unattendedSlots,scheduleState))onChange(candidate);
  else setNotice('That time is occupied or outside this week.');
 }
 function changeWeek(offset){const targetWeek=addDays(currentWeek,offset*7);setWeekOffset(offset);setSelectedTask(null);setSelectedBlockId(null);setOpenDueDay(null);setSelectedDay(offset===0?today:targetWeek);gridRef.current?.scrollTo({top:0});}
 function submitQuickAdd(event){event.preventDefault();const title=new FormData(event.currentTarget).get('title')?.trim();if(!title||!quickAdd)return;const id=onAddPersonalTask?.(title);if(!id)return;onAdd({id:crypto.randomUUID(),taskId:id,date:quickAdd.date,start:quickAdd.start,duration:PLAN_DEFAULT});setQuickAdd(null);setNotice('Task added to your plan.');}
 const totalMinutes=scheduled.reduce((sum,b)=>sum+b.duration,0);
 const skippedToday=classes.filter(slot=>slot.date===visibleDays[0]&&isUnattended(slot,unattendedSlots));

 return <section className="study-plan-page" aria-label="Two-week assignment planner">
  <div className="plan-heading"><h1>Study plan</h1><div className="plan-week-switch" role="group" aria-label="Choose planning week"><button className={weekOffset===0?'active':''} onClick={()=>changeWeek(0)}>This week</button><button className={weekOffset===1?'active':''} onClick={()=>changeWeek(1)}>Next week</button></div></div>
  <div className="plan-frame">
   <div className="plan-calendar" ref={gridRef}>
    <div className="plan-calendar-head"><div><h2>{dateLabel(days[0])} - {dateLabel(days[6])}</h2><span>{durationLabel(totalMinutes)} planned</span></div><span className="plan-key"><i/>Classes <i/>Study time</span></div>
    <div className="plan-mobile-days" role="group" aria-label="Choose planning day">{days.map(date=><button key={date} className={visibleDays[0]===date?'active':''} onClick={()=>{setSelectedDay(date);setOpenDueDay(null);}}><span>{fmt(date+'T12:00Z',{weekday:'short',day:undefined,month:undefined})}</span><strong>{Number(date.slice(-2))}</strong>{queue.some(t=>wallTime(t.due).slice(0,10)===date)&&<i/>}</button>)}</div>
    {mobile&&skippedToday.length>0&&<div className="plan-skipped-strip"><span>Not attending</span>{skippedToday.map(slot=><button key={slot.id} onClick={()=>onOpenClass(slot)}>{subject(slot.subject).short} · {timeLabel(slot.start)}</button>)}</div>}
    <div className="plan-timeline-scroll"><div className="plan-timeline" style={{'--plan-days':visibleDays.length,'--plan-height':`${(PLAN_END-PLAN_START)*pxPerMinute}px`}}>
     <div className="plan-time-head"/>{visibleDays.map(date=>{const due=queue.filter(t=>wallTime(t.due).slice(0,10)===date),dayIndex=days.indexOf(date);return <div className={`plan-day-head ${date===today?'is-today':''} ${dayIndex>=3?'due-align-end':''} ${openDueDay===date?'due-open':''}`} key={date}><span>{dateLabel(date)}</span>{due.length?<div className="plan-due-wrap"><button type="button" className="plan-due-trigger" onClick={()=>setOpenDueDay(openDueDay===date?null:date)} aria-label={`${due.length} ${due.length===1?'assignment':'assignments'} due ${dateLabel(date)}. ${due.map(task=>`${subject(task.subject).short}: ${task.title}, ${wallTime(task.due).slice(11)}`).join('; ')}`}>{due.length} due</button><div className="plan-due-popover" role="tooltip"><strong>Due {dateLabel(date)}</strong>{due.map(task=><div className="plan-due-item" key={task.id}><i style={{background:subject(task.subject).color}}/><span><b>{subject(task.subject).short}</b><span>{task.title}</span></span><time dateTime={task.due}>{wallTime(task.due).slice(11)}</time></div>)}</div></div>:<small>Open day</small>}</div>;})}
     <div className="plan-time-ruler">{hours.map(hour=><span key={hour} style={{top:`${(hour*60-PLAN_START)*pxPerMinute}px`}}>{timeLabel(hour*60)}</span>)}</div>
     {visibleDays.map(date=><div key={date} className={`plan-day-lane ${selectedTask?'is-placing':''}`} data-plan-date={date} role="button" tabIndex={0} aria-label={`${dateLabel(date)}. ${selectedTask?'Press Enter to place selected task.':'Press Enter to add a task here.'}`} onClick={event=>placeByTap(event,date)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();keyboardPlace(date);}}}>
      {hours.slice(0,-1).map(hour=><div className="plan-hour-line" key={hour} style={{top:`${(hour*60-PLAN_START)*pxPerMinute}px`}}/>)}
      {classes.filter(s=>s.date===date).map(slot=>{const skipped=isUnattended(slot,unattendedSlots);return <button type="button" className={`plan-class ${slot.end-slot.start<30?'is-short':''} ${skipped?'is-unattended':''}`} key={slot.id} style={{top:`${(slot.start-PLAN_START)*pxPerMinute}px`,height:`${(slot.end-slot.start)*pxPerMinute}px`,'--class-color':subject(slot.subject).color}} aria-label={`${subject(slot.subject).short} ${slot.type}, ${timeLabel(slot.start)} to ${timeLabel(slot.end)}. ${skipped?'Not attending. Open to restore.':'Open attendance options.'}`} onClick={event=>{event.stopPropagation();onOpenClass(slot);}}><strong>{subject(slot.subject).short}</strong><small>{skipped?'Not attending':slot.end-slot.start>=45?`${slot.type} · ${timeLabel(slot.start)}`:timeLabel(slot.start)}</small></button>;})}
      {scheduled.filter(b=>b.date===date).map(block=>{const task=tasks.find(t=>t.id===block.taskId);return <div className={`plan-block ${block.duration<=60?'is-condensed':''} ${block.duration<=30?'is-compact':''} ${selectedBlockId===block.id?'is-selected':''} ${preview?.id===block.id?'is-dragging':''} ${liftedId===block.id?'is-lifted':''} ${task?.status==='Done'?'is-done':''}`} key={block.id} style={{top:`${(block.start-PLAN_START)*pxPerMinute}px`,height:`${block.duration*pxPerMinute}px`,'--block-color':subject(task?.subject).color}} role="button" tabIndex={0} aria-label={`${task?.title}, ${timeLabel(block.start)} to ${timeLabel(block.start+block.duration)}. Hold and drag to move. ${mobile?'Tap to select, then tap again for files and details.':'Click for files and details.'}`} onPointerDown={event=>startDrag(event,'move',block.taskId,block)} onClick={event=>{event.stopPropagation();if(suppressClickRef.current){suppressClickRef.current=false;return;}if(lastPointerType.current!=='touch'||selectedBlockId===block.id||event.detail>=2)onOpenTask(task,block);else {setSelectedBlockId(block.id);setSelectedTask(null);}}} onDoubleClick={event=>{event.stopPropagation();onOpenTask(task,block);}} onKeyDown={event=>keyboardMove(event,block)}>
       <button type="button" className="plan-edge plan-edge-start" data-plan-control aria-label={`Move the start of ${task?.title}`} onPointerDown={event=>{event.stopPropagation();startDrag(event,'resize-start',block.taskId,block);}} onClick={event=>event.stopPropagation()}><span/></button>
       <div className="plan-block-body"><div className="plan-block-top"><strong>{subject(task?.subject).short}</strong><button data-plan-control type="button" aria-label={`Remove planned time for ${task?.title}`} onClick={event=>{event.stopPropagation();onRemove(block.id);setSelectedBlockId(null);}}><Trash2 size={12}/></button></div><span className="plan-block-title">{task?.title}</span><small className="plan-block-time">{timeLabel(block.start)}-{timeLabel(block.start+block.duration)}<span className="plan-block-duration"> · {durationLabel(block.duration)}</span></small></div>
       <button type="button" className="plan-edge plan-edge-end" data-plan-control aria-label={`Move the end of ${task?.title}`} onPointerDown={event=>{event.stopPropagation();startDrag(event,'resize-end',block.taskId,block);}} onClick={event=>event.stopPropagation()}><span/></button>
      </div>;})}
      {preview?.date===date&&<div className={`plan-preview ${preview.valid?'is-valid':'is-invalid'}`} style={{top:`${(preview.start-PLAN_START)*pxPerMinute}px`,height:`${preview.duration*pxPerMinute}px`}}>{preview.valid?`${timeLabel(preview.start)} · ${durationLabel(preview.duration)}`:'Occupied'}</div>}
     </div>)}
    </div></div>
   </div>
   <aside className="plan-queue"><div className="plan-queue-head"><div><h2>Choose a task</h2><p>{mobile?'Tap a task, then tap a time':'Drag or select a task'}</p></div><CalendarClock className="plan-queue-heading-icon" size={18}/><div className="plan-queue-pager"><button type="button" aria-label="Previous tasks" disabled={queueEdges.atStart} onClick={()=>queueListRef.current?.scrollBy({left:-186,behavior:'smooth'})}><ChevronLeft size={17}/></button><button type="button" aria-label="More tasks" disabled={queueEdges.atEnd} onClick={()=>queueListRef.current?.scrollBy({left:186,behavior:'smooth'})}><ChevronRight size={17}/></button></div></div>
    <div className="plan-queue-list" ref={queueListRef} onScroll={syncQueueEdges}>{queue.length?queue.map(task=>{const attached=files.filter(file=>task.files?.includes(file.id));const planned=blocks.filter(b=>b.taskId===task.id).reduce((sum,b)=>sum+b.duration,0),late=Boolean(task.due)&&new Date(task.due)<now,due=task.due?dueLabel(task.due):'No deadline';return <div className={`plan-queue-item ${selectedTask===task.id?'is-selected':''}`} key={task.id} style={{'--block-color':subject(task.subject).color}} role="button" tabIndex={0} aria-label={`${task.title}, ${due}${planned?`, ${durationLabel(planned)} planned`:''}. ${mobile?'Tap to select, then tap a time in the calendar.':'Drag into the calendar or select.'}`} onPointerDown={event=>startDrag(event,'new',task.id)} onClick={()=>{if(suppressClickRef.current){suppressClickRef.current=false;return;}setSelectedTask(task.id);setSelectedBlockId(null);}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedTask(task.id);setSelectedBlockId(null);gridRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}}}><div className="plan-queue-subject"><i/>{subject(task.subject).short}<button data-plan-control aria-label={`Open ${task.title}`} title="Open task" onClick={event=>{event.stopPropagation();onOpenTask(task);}} onKeyDown={event=>event.stopPropagation()}><span>Details</span><ArrowUpRight size={13}/></button></div><strong>{task.title}</strong>{task.kind!=='personal'&&<div className="plan-queue-files">{attached.length>0?<button type="button" data-plan-control onClick={event=>{event.stopPropagation();attached.length===1?onOpenFile(attached[0]):onOpenTask(task);}} onKeyDown={event=>event.stopPropagation()} aria-label={attached.length===1?`Open ${attached[0].name}`:`Open ${attached.length} files for ${task.title}`}><File size={14}/>{attached.length===1?'Open file':`${attached.length} files`}</button>:<button type="button" data-plan-control onClick={event=>{event.stopPropagation();onOpenTask(task);}} onKeyDown={event=>event.stopPropagation()}><Plus size={14}/>Add file</button>}</div>}<div className="plan-queue-bottom"><span className={late?'is-overdue':''}>{late?'Overdue · ':''}{due}</span>{planned>0&&<small>{durationLabel(planned)} planned</small>}</div></div>;}):<div className="plan-queue-empty"><Check size={20}/><strong>Nothing queued</strong><p>Tap an empty time to add a task.</p></div>}</div>
    {selectedTask&&<div className="plan-selection"><Check size={15}/><span>{tasks.find(task=>task.id===selectedTask)?.title} · tap a free time</span><button onClick={()=>setSelectedTask(null)}>Cancel</button></div>}
    {groups.overdue.length>0&&<button className="plan-overdue-toggle" onClick={()=>setShowOverdue(value=>!value)}>{showOverdue?'Hide':`Show ${groups.overdue.length}`} older overdue task{groups.overdue.length===1?'':'s'}</button>}
   </aside>
  </div>
  {quickAdd&&<div className="plan-quick-backdrop" onClick={()=>setQuickAdd(null)}><section className="plan-quick-dialog" role="dialog" aria-modal="true" aria-label="Add a task here" onClick={event=>event.stopPropagation()}><div className="plan-dialog-top"><div><span>New study time</span><h2>{dateLabel(quickAdd.date)} · {timeLabel(quickAdd.start)}-{timeLabel(quickAdd.start+PLAN_DEFAULT)}</h2></div><button className="icon-button" aria-label="Close new task" onClick={()=>setQuickAdd(null)}><X size={19}/></button></div><form onSubmit={submitQuickAdd}><label htmlFor="plan-new-title">Task title</label><input ref={quickTitleRef} id="plan-new-title" name="title" placeholder="Name this task" maxLength={160} required/><div className="plan-dialog-actions"><button className="button" type="button" onClick={()=>setQuickAdd(null)}>Cancel</button><button className="button primary" type="submit"><Plus size={16}/>Add to plan</button></div></form></section></div>}
  {notice&&<div className="plan-notice" role="status">{notice}</div>}
 </section>;
}
