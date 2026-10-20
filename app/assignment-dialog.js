'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowUpRight,CalendarDays,ChevronDown,Clock3,File,Pencil,Play,Check,Trash2,X} from 'lucide-react';
import {fmt,wallTime,zurichISO,nextNumber,taskType,supportsUploads,plainDashes,repeatRuleForTask,repeatRelease,addDays,moodleSectionForTask,codeExpertUrlForTask,assignmentKindLabel,timeLabel} from '../lib/model.mjs';
import {useSubjects,useSubjectLookup} from './workspace-context';
import ProgressSelect from './progress-select';
import DateTimeField from './date-time-field';
import RepeatSelect from './repeat-select';
import RepeatAvailabilityField from './repeat-availability-field';
import ChoiceSelect from './choice-select';

function AssignmentForm({task,defaultSubject,tasks,rules,startRepeating,onSave,onCancel}){
 const SUBJECTS=useSubjects();
 const [sub,setSub]=useState(task?.subject||defaultSubject||SUBJECTS[0]?.id||'');
 const [title,setTitle]=useState(task?.title||'');
 const [kind,setKind]=useState(task?taskType(task):'file');
 const [error,setError]=useState('');
 const existingRule=repeatRuleForTask({rules},task);
 const [repeatEvery,setRepeatEvery]=useState(existingRule?.every||(startRepeating?1:0));
 const [deadline,setDeadline]=useState(wallTime(task?.due));
 const [availability,setAvailability]=useState(()=>{
  if(!existingRule)return null;
  if(Number.isInteger(existingRule.availableDaysBefore)&&existingRule.availableTime)return {offset:existingRule.availableDaysBefore,time:existingRule.availableTime};
  const release=repeatRelease(existingRule,task||{});
  if(!release||!task?.due)return null;
  const dueDay=wallTime(task.due).slice(0,10),releaseDay=wallTime(release).slice(0,10);
  return {offset:Math.round((Date.parse(dueDay+'T12:00Z')-Date.parse(releaseDay+'T12:00Z'))/86400000),time:wallTime(release).slice(11,16)};
 });
 const deadlineDay=wallTime(task?.due).slice(0,10);
 const defaultUntil=addDays(deadlineDay||new Date().toISOString().slice(0,10),84);
 const titleInput=useRef(null);
 useEffect(()=>{titleInput.current?.focus({preventScroll:true});},[]);
 function submit(e){
  e.preventDefault();
  if(task?.kind==='personal'){if(!title.trim()){setError('Give this task a title.');return;}onSave({...task,title:plainDashes(title.trim())},{every:0});return;}
  const f=new FormData(e.currentTarget);
  try{
   if(!title.trim())throw new Error('Give this assignment a name.');
   if(!sub)throw new Error('Add a subject before saving this assignment.');
   const due=f.get('due')?zurichISO(f.get('due')):null;
   if(repeatEvery>0&&!due)throw new Error('Choose a deadline before repeating this assignment.');
   const release=task?.release||null;
   onSave({...task,id:task?.id||crypto.randomUUID(),subject:sub,title:plainDashes(title.trim()),kind,release,due,
    dateOnly:false,
    status:task?.status||'Not started',notes:plainDashes(f.get('notes')),files:task?.files||[],
    noFile:task?.noFile||false,source:'You'},{every:repeatEvery,availableOffset:repeatEvery&&kind==='file'?availability?.offset:null,availableTime:repeatEvery&&kind==='file'?availability?.time:null,until:f.get('repeatUntil')});
  }catch(err){setError(err.message);}
 }
 if(task?.kind==='personal')return <form className="assignment-form" onSubmit={submit}><label>Task title<input ref={titleInput} value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160}/></label>{error&&<p className="assignment-form-error" role="alert">{error}</p>}<div className="assignment-dialog-footer"><button type="button" className="button" onClick={onCancel}>Cancel</button><button className="button primary">Save task</button></div></form>;
 return <form className="assignment-form" onSubmit={submit}>
  <label>Assignment name<input ref={titleInput} name="title" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160}/></label>
  <div className="assignment-form-pair">
   <label>Subject<ChoiceSelect value={sub} onChange={e=>setSub(e.target.value)} required><option value="">Choose subject</option>{SUBJECTS.map(s=><option value={s.id} key={s.id}>{s.short}</option>)}</ChoiceSelect></label>
   <DateTimeField label="Deadline (optional)" name="due" value={deadline} onChange={setDeadline}/>
  </div>
  <div className="assignment-secondary-fields">
   <label>Task type<ChoiceSelect value={kind} onChange={e=>setKind(e.target.value)}><option value="file">Assignment with files</option><option value="online">Online assignment</option><option value="quiz">Quiz</option>{kind==='codeexpert'&&<option value="codeexpert">CodeExpert (existing)</option>}</ChoiceSelect></label>
   <label>Notes <span className="field-optional">Optional</span><textarea name="notes" defaultValue={task?.notes||''} rows={2} placeholder="Add a note…"/></label>
  </div>
  <div className="repeat-setting">
   <RepeatSelect value={repeatEvery} onChange={setRepeatEvery}/>
   {repeatEvery>0&&<div className="assignment-extra-fields repeat-fields">
     {kind==='file'&&<><RepeatAvailabilityField every={repeatEvery} deadline={deadline} value={availability} onChange={setAvailability}/><span className="field-hint">An upload reminder appears on the chosen day and time each cycle. Leave empty to keep reminders off.</span></>}
     <DateTimeField label="Repeat until" name="repeatUntil" dateOnly required defaultValue={existingRule?.endDate||defaultUntil}/>
     {existingRule?<p className="field-hint">Future repeats follow the selected interval. Existing deadlines stay unchanged.</p>:<p className="field-hint">This assignment starts the series. Future repeats get their own deadlines and files; a number at the end of the name advances automatically.</p>}
   </div>}
  </div>
  {error&&<p className="assignment-form-error" role="alert">{error}</p>}
  <div className="assignment-dialog-footer"><button type="button" className="button" onClick={onCancel}>Cancel</button><button className="button primary">{task?'Save changes':'Add assignment'}</button></div>
 </form>;
}

export default function AssignmentDialog({task,defaultSubject,tasks,rules,files,blocks=[],plannedBlockId,onRemovePlan,taskEvents=[],startEditing=false,startRepeating=false,onClose,onSave,onDelete,onProgress,onOpenFile,onPlanTask,renderUpload}){
 const subject=useSubjectLookup();
 const [editing,setEditing]=useState(startEditing||!task);
 const dialog=useRef(null),heading=useRef(null),editButton=useRef(null),didEdit=useRef(false);
 const titleId=useId();
 useEffect(()=>{
  const previous=document.activeElement;
  dialog.current.showModal();
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  if(task)heading.current?.focus({preventScroll:true});
  return()=>{document.body.style.overflow=previousOverflow;const target=previous?.isConnected?previous:document.querySelector('.page-actions .segmented button.selected, .page-actions .primary');target?.focus({preventScroll:true});};
 },[]);
 useEffect(()=>{if(!editing&&didEdit.current)editButton.current?.focus({preventScroll:true});didEdit.current=editing;},[editing]);
 function cancelEdit(){if(task)setEditing(false);else onClose();}
 const attached=files.filter(f=>task?.files?.includes(f.id));
 const planned=blocks.filter(block=>block.taskId===task?.id).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);
 const started=taskEvents.find(event=>event.taskId===task?.id&&event.type==='started');
 const finished=taskEvents.find(event=>event.taskId===task?.id&&event.type==='finished');
 const online=task&&taskType(task)!=='file';
 const moodle=task&&moodleSectionForTask(task),codeExpert=task&&codeExpertUrlForTask(task);
 return <dialog ref={dialog} className={`assignment-dialog ${editing&&task?.kind!=='personal'?'is-editing':''}`} aria-labelledby={titleId}
  onCancel={e=>{e.preventDefault();editing&&task?cancelEdit():onClose();}}
  onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
  <div className="assignment-dialog-body">
   <header className="assignment-dialog-heading"><h2 ref={heading} tabIndex={-1} id={titleId}>{editing?(task?'Edit assignment':'Add assignment'):task.title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close assignment"><X size={19}/></button></header>
   {editing?<AssignmentForm task={task} defaultSubject={defaultSubject} tasks={tasks} rules={rules} startRepeating={startRepeating} onSave={(value,repeatOptions)=>{onSave(value,repeatOptions);setEditing(false);}} onCancel={cancelEdit}/>:<div className="assignment-overview">
    <p className="assignment-subject"><span className="dot" style={{background:subject(task.subject).color}}/>{subject(task.subject).short}<span className="assignment-kind">{assignmentKindLabel(task)}</span></p>
    <div className="assignment-due"><CalendarDays size={17}/><span>{task.due?<>Due {fmt(task.due,{weekday:'short'})}{task.due&&` · ${fmt(task.due,{day:undefined,month:undefined,hour:'2-digit',minute:'2-digit'})}`}</>:'No deadline'}</span></div>
    {(!online||attached.length>0)&&<section className="assignment-files" aria-label="Assignment files">
     <div className="assignment-files-heading"><h3>Files</h3>{attached.length>0&&<span>{attached.length} attached</span>}</div>
     {attached.length>0&&<div className="assignment-file-list">{attached.map(f=><button type="button" className="assignment-file" onClick={()=>onOpenFile(f)} aria-label={`Open ${f.name}`} key={f.id}><File size={17}/><span>{f.name}</span><span className="assignment-file-action">Open<ArrowUpRight size={14}/></span></button>)}</div>}
     {!online&&supportsUploads(task)&&renderUpload(task,attached.length>0)}
    </section>}
    <div className="assignment-lifecycle"><div><span>Progress</span><ProgressSelect label={`Status for ${task.title}`} value={task.status} onChange={onProgress}/>{started&&<small>Started {fmt(started.at,{weekday:'short'})} · {wallTime(started.at).slice(11,16)}</small>}{finished&&<small>Finished {fmt(finished.at,{weekday:'short'})} · {wallTime(finished.at).slice(11,16)}</small>}</div><button className={`button ${task.status==='In progress'?'primary':''}`} onClick={()=>onProgress(task.status==='Not started'?'In progress':task.status==='In progress'?'Done':'In progress')}>{task.status==='Not started'?<><Play size={15}/>Start now</>:task.status==='In progress'?<><Check size={15}/>Finish now</>:'Reopen assignment'}</button></div>
    <div className="assignment-planned"><div className="assignment-files-heading"><h3>Study plan</h3><button className="text-button" onClick={()=>onPlanTask(task.id)}>{planned.length?'Add time':'Plan time'}<ArrowUpRight size={14}/></button></div>{planned.length?<div className="assignment-planned-list">{planned.map(block=><div className={`assignment-plan-row ${block.id===plannedBlockId?'is-current':''}`} key={block.id}><span><Clock3 size={14}/>{fmt(block.date+'T12:00Z',{weekday:'short'})} · {timeLabel(block.start)}–{timeLabel(block.start+block.duration)}</span>{onRemovePlan&&<button type="button" className="icon-button" aria-label={`Remove planned time ${fmt(block.date+'T12:00Z')} at ${timeLabel(block.start)}`} title="Remove planned time" onClick={()=>onRemovePlan(block.id)}><Trash2 size={15}/></button>}</div>)}</div>:<p className="muted">No time planned yet.</p>}</div>
    {(moodle||codeExpert)&&<div className="assignment-resource-links">
     {codeExpert&&<a className="moodle-section-link" href={codeExpert} target="_blank" rel="noopener noreferrer" aria-label={`Open ${task.title} in CodeExpert`}>Open CodeExpert<ArrowUpRight size={15}/></a>}
     {moodle&&<a className="moodle-section-link" href={moodle} target="_blank" rel="noopener noreferrer" aria-label={`Find ${task.title} on Moodle`}>Find on Moodle<ArrowUpRight size={15}/></a>}
    </div>}
    {online&&taskType(task)!=='personal'&&<details className="assignment-more optional-attachment"><summary>More actions<ChevronDown size={15}/></summary><div className="optional-attachment-body"><p>Attach a file (optional)</p>{renderUpload(task,true)}</div></details>}
    {task.notes&&<details className="assignment-more"><summary>Notes<ChevronDown size={15}/></summary><p className="assignment-notes">{task.notes}</p></details>}
    {task.exercises?.length>0&&<details className="assignment-more"><summary>Exercises<span className="subtle-label">{task.exercises.length}</span><ChevronDown size={15}/></summary><ul className="assignment-exercises">{task.exercises.map(name=><li key={name}>{name}</li>)}</ul></details>}
    <footer className="assignment-dialog-footer"><button ref={editButton} className="text-button" onClick={()=>setEditing(true)}><Pencil size={14}/>Edit details</button>{task.kind==='personal'&&<button className="text-button personal-delete" onClick={()=>{if(window.confirm('Delete this personal task and its planned time?'))onDelete(task.id);}}>Delete task</button>}<button className="button" onClick={onClose}>Close</button></footer>
   </div>}
  </div>
 </dialog>;
}
