'use client';
import {useRef,useState} from 'react';
import {Check,Download,File,FolderOpen,Search,Upload,X} from 'lucide-react';
import {fmt} from '../lib/model.mjs';
import {useSubjects,useSubjectLookup} from './workspace-context';
import {suggestFileTask} from '../lib/task-inference.mjs';
import {inferPdfAssignment} from '../lib/pdf-task.mjs';
import {firstPageText} from './pdf-classification';

const bytes=n=>n<1048576?`${Math.max(1,Math.round(n/1024))} KB`:`${(n/1048576).toFixed(1)} MB`;

export default function CourseFiles({state,fileKind,setFileKind,selectedSubject,setSelectedSubject,query,setQuery,onUpload,onUploadBatch,onLink,onOpen,onDownload,onError}){
 const SUBJECTS=useSubjects(),subject=useSubjectLookup();
 const picker=useRef(null);
 const [dragging,setDragging]=useState(false),[pending,setPending]=useState([]),[analyzing,setAnalyzing]=useState(false),[saving,setSaving]=useState(false);
 const fileList=state.files.filter(file=>(selectedSubject==='all'||file.subject===selectedSubject)&&file.kind===fileKind&&file.name.toLowerCase().includes(query.toLowerCase()));
 async function add(files){
  if(!files?.length||analyzing||saving)return;
  const selected=[...files];
  const large=selected.find(file=>file.size>50*1024*1024);
  if(large){onError(`${large.name} is over 50 MB. Choose a smaller file.`);return;}
  setAnalyzing(true);
  try{
   const rows=[];
   for(const file of selected){
    let pageText='';
    try{pageText=await firstPageText(file);}catch{ /* Filename matching remains available for unreadable PDFs. */ }
    const inferred=inferPdfAssignment(file.name,pageText,state.subjects,state.tasks,state.timeZone);
    const match=suggestFileTask(file.name,state.tasks,pageText,state.subjects);
    const subject=inferred.subjectId||match?.subject||((selectedSubject!=='all')?selectedSubject:'');
    const kind=inferred.role||fileKind;
    const fallbackTask=state.tasks.find(task=>task.id===match?.taskId);
    const usableFallback=!inferred.due||!fallbackTask?.due||Math.abs(new Date(fallbackTask.due)-new Date(inferred.due))<30*86400000;
    const taskId=inferred.taskId||(usableFallback?match?.taskId:'')||'';
    const existing=state.tasks.find(task=>task.id===taskId);
    const dueConflict=Boolean(existing?.due&&inferred.due&&Math.abs(new Date(existing.due)-new Date(inferred.due))>60000);
    rows.push({id:crypto.randomUUID(),file,kind,subject,taskId,title:inferred.title,dueLocal:inferred.dueDate?`${inferred.dueDate}T${inferred.dueTime||'23:59'}`:'',noDeadline:false,updateDue:Boolean(existing&&!existing.due&&inferred.due),dueConflict,autoReady:inferred.role==='assignment'&&inferred.evidence.title==='First-page title'&&Boolean(inferred.dueTime)&&!dueConflict,reason:dueConflict?'PDF deadline differs from the existing assignment':inferred.evidence.due!=='Not found'?`Found ${inferred.evidence.due}`:match?.reason||'Review this file'});
   }
   const automatic=rows.every(row=>row.autoReady&&row.subject&&row.title&&row.dueLocal);
   if(automatic&&pending.length===0){if(!await onUploadBatch(rows))setPending(rows);}
   else setPending(current=>[...current,...rows]);
  }finally{setAnalyzing(false);}
 }
 function updatePending(id,patch){setPending(current=>current.map(row=>row.id===id?{...row,...patch}:row));}
 async function savePending(){if(!pending.length||saving||analyzing)return;setSaving(true);try{if(await onUploadBatch(pending))setPending([]);}finally{setSaving(false);}}
  const ready=pending.length>0&&pending.every(row=>row.subject&&(row.kind==='theory'||(row.taskId&&state.tasks.some(task=>task.id===row.taskId&&task.subject===row.subject))||(row.title.trim()&&(row.dueLocal||row.noDeadline))));
 return <div className="course-files-page">
  <div className="page-heading"><div><h1>Course files</h1><p>Find course material and files attached to assignments.</p></div><span className="subtle-label">{state.files.length} {state.files.length===1?'file':'files'} saved</span></div>
  <div className="list-toolbar files-toolbar"><div className="segmented">{[['theory','Theory & notes'],['assignment','Assignment files']].map(([kind,label])=><button key={kind} className={fileKind===kind?'selected':''} onClick={()=>setFileKind(kind)}>{label}</button>)}</div><div className="list-filters"><select aria-label="Filter files by subject" value={selectedSubject} onChange={event=>setSelectedSubject(event.target.value)}><option value="all">All subjects</option>{SUBJECTS.map(item=><option key={item.id} value={item.id}>{item.short}</option>)}</select><label className="search"><Search size={16}/><input aria-label="Search files" placeholder="Find a file…" value={query} onChange={event=>setQuery(event.target.value)}/></label></div></div>
  <div className={`library-drop ${dragging?'dragging':''}`} onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);add(event.dataTransfer.files);}}><Upload size={22}/><div className="library-drop-copy"><h2>Add files</h2><p>Drop PDFs to detect their subject, assignment title and deadline. Missing details can be filled in before saving.</p></div><div className="library-upload-controls"><button className="button" disabled={analyzing||saving} onClick={()=>picker.current?.click()}>{analyzing?'Reading PDFs…':'Browse files'}</button></div><input ref={picker} hidden multiple type="file" onChange={event=>{add(event.target.files);event.target.value='';}}/></div>
  {pending.length>0&&<section className="bulk-file-review" aria-label="Review uploaded files"><div className="bulk-file-head"><div><h2>Review {pending.length} {pending.length===1?'file':'files'}</h2><p>Check the details we found. A new assignment needs a subject and title; choose a deadline or mark it as undated.</p></div><button className="icon-button" aria-label="Clear files awaiting review" onClick={()=>setPending([])} disabled={saving}><X size={18}/></button></div><div className="bulk-file-rows">{pending.map(row=>{const choices=state.tasks.filter(task=>task.subject===row.subject).sort((a,b)=>new Date(b.due||0)-new Date(a.due||0));return <div className="bulk-file-row" key={row.id}><div className="bulk-file-name"><File size={17}/><span><strong>{row.file.name}</strong><small>{row.reason}</small></span></div><div className="bulk-file-fields"><label>What is this?<select value={row.kind} onChange={event=>updatePending(row.id,{kind:event.target.value,taskId:''})}><option value="assignment">Assignment</option><option value="theory">Class material or notes</option></select></label><label>Subject<select value={row.subject} onChange={event=>updatePending(row.id,{subject:event.target.value,taskId:''})}><option value="">Choose subject…</option>{SUBJECTS.map(item=><option key={item.id} value={item.id}>{item.short}</option>)}</select></label>{row.kind==='assignment'&&<><label>Attach to<select value={row.taskId} onChange={event=>{const task=state.tasks.find(item=>item.id===event.target.value);updatePending(row.id,{taskId:event.target.value,updateDue:Boolean(task&&!task.due&&row.dueLocal)});}}><option value="">Create new assignment</option>{choices.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select></label>{row.taskId&&row.dueLocal&&<label className="bulk-no-deadline"><input type="checkbox" checked={Boolean(row.updateDue)} onChange={event=>updatePending(row.id,{updateDue:event.target.checked})}/>Use PDF deadline: {row.dueLocal.replace("T"," ")}</label>}{!row.taskId&&<><label>Assignment title<input value={row.title} onChange={event=>updatePending(row.id,{title:event.target.value})} placeholder="Assignment title"/></label><label>Due date and time<input type="datetime-local" value={row.dueLocal} disabled={row.noDeadline} onChange={event=>updatePending(row.id,{dueLocal:event.target.value})}/></label><label className="bulk-no-deadline"><input type="checkbox" checked={row.noDeadline} onChange={event=>updatePending(row.id,{noDeadline:event.target.checked})}/>No deadline</label></>}</>}</div><button className="icon-button" aria-label={`Remove ${row.file.name} from upload`} onClick={()=>setPending(current=>current.filter(item=>item.id!==row.id))} disabled={saving}><X size={16}/></button></div>;})}</div><div className="bulk-file-footer"><span>{pending.filter(row=>row.subject&&(row.kind==='theory'||row.taskId||row.title&&(row.dueLocal||row.noDeadline))).length} of {pending.length} ready</span><button className="button primary" disabled={!ready||saving||analyzing} onClick={savePending}><Check size={16}/>{saving?'Saving…':`Save ${pending.length} ${pending.length===1?'file':'files'}`}</button></div><p className="bulk-file-privacy">PDF first pages are read in this browser. Files are saved after the details are complete.</p></section>}
  <div className="section-heading files-heading"><h2>{fileKind==='theory'?'Reference library':'Assignment files'}</h2><span className="subtle-label">{fileList.length} {fileList.length===1?'file':'files'}</span></div>
  {fileList.length?<div className="file-list">{fileList.map(file=>{const linked=state.tasks.find(task=>task.id===file.taskId);return <div className="library-file" key={file.id}><File size={23}/><button className="library-file-open" type="button" onClick={()=>onOpen(file)} aria-label={`Open ${file.name}`}><strong>{file.name}</strong><span>{subject(file.subject).short}{linked?` · ${linked.title}`:file.lectureDate?` · Class ${fmt(file.lectureDate+'T12:00Z')}`:''} · {bytes(file.size)} · {fmt(file.added)}</span></button>{file.kind==='assignment'&&!linked&&<select className="file-link-select" aria-label={`Attach ${file.name} to an assignment`} defaultValue="" onChange={event=>{if(event.target.value)onLink(file.id,event.target.value);}}><option value="">Attach to assignment…</option>{state.tasks.filter(task=>task.subject===file.subject).map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select>}<button className="icon-button" aria-label={`Download ${file.name}`} onClick={()=>onDownload(file)}><Download size={18}/></button></div>;})}</div>:<div className="library-empty"><FolderOpen size={28}/><h3>{query?'No matching files':fileKind==='theory'?'No notes yet':'No assignment files yet'}</h3><p>{query?'Try another name or subject.':'Choose a subject and add files above.'}</p></div>}
 </div>;
}
