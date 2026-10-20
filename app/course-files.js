'use client';
import {useRef,useState} from 'react';
import {ArrowDown,ArrowUp,Check,Download,File,FolderOpen,GripVertical,Search,Trash2,Upload,X} from 'lucide-react';
import {fmt} from '../lib/model.mjs';
import {useSubjects,useSubjectLookup} from './workspace-context';
import {directTheoryDestination,uploadProposal} from '../lib/file-upload-routing.mjs';
import {firstPageText} from './pdf-classification';
import {moveFileInOrder,sortedFiles} from '../lib/file-order.mjs';
import ChoiceSelect from './choice-select';
import DateTimeField from './date-time-field';

const bytes=n=>n<1048576?`${Math.max(1,Math.round(n/1024))} KB`:`${(n/1048576).toFixed(1)} MB`;

export default function CourseFiles({state,fileKind,setFileKind,selectedSubject,setSelectedSubject,query,setQuery,onUpload,onUploadBatch,onLink,onOpen,onDownload,onDelete,onSortChange,onError}){
 const SUBJECTS=useSubjects(),subject=useSubjectLookup();
 const picker=useRef(null);
 const [dragging,setDragging]=useState(false),[pending,setPending]=useState([]),[analyzing,setAnalyzing]=useState(false),[saving,setSaving]=useState(false),[deletingId,setDeletingId]=useState(null);
 const preference=state.fileSorting?.[fileKind]||{mode:'newest',order:[]};
 const kindFiles=state.files.filter(file=>file.kind===fileKind);
 const fileList=sortedFiles(kindFiles.filter(file=>(selectedSubject==='all'||file.subject===selectedSubject)&&file.name.toLowerCase().includes(query.toLowerCase())),preference);
 function changeSort(mode){onSortChange(fileKind,{...preference,mode,order:mode==='custom'&&!preference.order?.length?sortedFiles(kindFiles).map(file=>file.id):preference.order||[]});}
 function reorder(sourceId,targetId){
  if(preference.mode!=='custom'||sourceId===targetId)return;
  const order=sortedFiles(kindFiles,{mode:'custom',order:preference.order}).map(file=>file.id);
  onSortChange(fileKind,{mode:'custom',order:moveFileInOrder(order,sourceId,targetId)});
 }
 function moveVisible(index,offset){const target=fileList[index+offset];if(!target)return;const source=fileList[index];if(offset<0)reorder(source.id,target.id);else reorder(target.id,source.id);}
 async function add(files){
  if(!files?.length||analyzing||saving)return;
  const selected=[...files];
  const large=selected.find(file=>file.size>50*1024*1024);
  if(large){onError(`${large.name} is over 50 MB. Choose a smaller file.`);return;}
  if(directTheoryDestination(selectedSubject,fileKind)){
   setSaving(true);
   try{await onUpload(selected,selectedSubject,'theory');}finally{setSaving(false);}
   return;
  }
  setAnalyzing(true);
  try{
   const rows=[];
   for(let index=0;index<selected.length;index+=3){
    const group=await Promise.all(selected.slice(index,index+3).map(async file=>{
     let pageText='';
     try{pageText=await firstPageText(file);}catch{ /* Filename matching remains available for unreadable PDFs. */ }
     return {id:crypto.randomUUID(),...uploadProposal(file,pageText,{subjects:state.subjects,tasks:state.tasks,timeZone:state.timeZone,selectedSubject,fileKind})};
    }));
    rows.push(...group);
   }
   const automatic=rows.filter(row=>row.autoReady),review=rows.filter(row=>!row.autoReady);
   if(automatic.length){setSaving(true);try{if(!await onUploadBatch(automatic))review.push(...automatic);}finally{setSaving(false);}}
   if(review.length)setPending(current=>[...current,...review]);
  }finally{setAnalyzing(false);}
 }
 function updatePending(id,patch){setPending(current=>current.map(row=>row.id===id?{...row,...patch}:row));}
 async function savePending(){if(!pending.length||saving||analyzing)return;setSaving(true);try{if(await onUploadBatch(pending))setPending([]);}finally{setSaving(false);}}
 async function remove(file){if(deletingId)return;setDeletingId(file.id);try{await onDelete(file);}finally{setDeletingId(null);}}
  const ready=pending.length>0&&pending.every(row=>row.subject&&(row.kind==='theory'||(row.taskId&&state.tasks.some(task=>task.id===row.taskId&&task.subject===row.subject))||(row.title.trim()&&(row.dueLocal||row.noDeadline))));
 return <div className="course-files-page">
  <div className="page-heading"><div><h1>Course files</h1><p>Find course material and files attached to assignments.</p></div><span className="subtle-label">{`${state.files.length} ${state.files.length===1?'file':'files'} saved`}</span></div>
  <div className="list-toolbar files-toolbar"><div className="segmented">{[['theory','Theory & notes'],['assignment','Assignment files']].map(([kind,label])=><button key={kind} className={fileKind===kind?'selected':''} onClick={()=>setFileKind(kind)}>{label}</button>)}</div><div className="list-filters"><ChoiceSelect aria-label="Filter files by subject" value={selectedSubject} onChange={event=>setSelectedSubject(event.target.value)}><option value="all">All subjects</option>{SUBJECTS.map(item=><option key={item.id} value={item.id}>{item.short}</option>)}</ChoiceSelect><label className="search"><Search size={16}/><input aria-label="Search files" placeholder="Find a file…" value={query} onChange={event=>setQuery(event.target.value)}/></label></div></div>
  <div className={`library-drop ${dragging?'dragging':''}`} onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);add(event.dataTransfer.files);}}><Upload size={22}/><div className="library-drop-copy"><h2>{selectedSubject==='all'?'Batch import':fileKind==='theory'?`Add to ${subject(selectedSubject).short} notes`:`Add ${subject(selectedSubject).short} assignment files`}</h2><p>{selectedSubject==='all'?'Add files from different subjects together. Clear matches save automatically; only unclear files need review.':fileKind==='theory'?'Files save to this subject’s Theory & notes immediately.':'Matching assignment files save automatically. You’ll only be asked for missing details.'}</p>{selectedSubject!=='all'&&<button className="text-button" type="button" onClick={()=>setSelectedSubject('all')}>Import across subjects</button>}</div><div className="library-upload-controls"><button className="button" disabled={analyzing||saving} onClick={()=>picker.current?.click()}>{analyzing?'Reading PDFs…':saving?'Saving files…':'Browse files'}</button></div><input ref={picker} hidden multiple type="file" onChange={event=>{add(event.target.files);event.target.value='';}}/></div>
  {pending.length>0&&<section className="bulk-file-review" aria-label="Review uploaded files"><div className="bulk-file-head"><div><h2>Review {pending.length} {pending.length===1?'file':'files'}</h2><p>Check the details we found. A new assignment needs a subject and title; choose a deadline or mark it as undated.</p></div><button className="icon-button" aria-label="Clear files awaiting review" onClick={()=>setPending([])} disabled={saving}><X size={18}/></button></div><div className="bulk-file-rows">{pending.map(row=>{const choices=state.tasks.filter(task=>task.subject===row.subject).sort((a,b)=>new Date(b.due||0)-new Date(a.due||0));return <div className="bulk-file-row" key={row.id}><div className="bulk-file-name"><File size={17}/><span><strong>{row.file.name}</strong><small>{row.reason}</small></span></div><div className="bulk-file-fields"><label>What is this?<ChoiceSelect value={row.kind} onChange={event=>updatePending(row.id,{kind:event.target.value,taskId:''})}><option value="assignment">Assignment</option><option value="theory">Class material or notes</option></ChoiceSelect></label><label>Subject<ChoiceSelect value={row.subject} onChange={event=>updatePending(row.id,{subject:event.target.value,taskId:''})}><option value="">Choose subject…</option>{SUBJECTS.map(item=><option key={item.id} value={item.id}>{item.short}</option>)}</ChoiceSelect></label>{row.kind==='assignment'&&<><label>Attach to<ChoiceSelect value={row.taskId} onChange={event=>{const task=state.tasks.find(item=>item.id===event.target.value);updatePending(row.id,{taskId:event.target.value,updateDue:Boolean(task&&!task.due&&row.dueLocal)});}}><option value="">Create new assignment</option>{choices.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</ChoiceSelect></label>{row.taskId&&row.dueLocal&&<label className="bulk-no-deadline"><input type="checkbox" checked={Boolean(row.updateDue)} onChange={event=>updatePending(row.id,{updateDue:event.target.checked})}/>Use PDF deadline: {row.dueLocal.replace("T"," ")}</label>}{!row.taskId&&<><label>Assignment title<input value={row.title} onChange={event=>updatePending(row.id,{title:event.target.value})} placeholder="Assignment title"/></label><DateTimeField label="Due date and time" value={row.dueLocal} disabled={row.noDeadline} onChange={value=>updatePending(row.id,{dueLocal:value})}/><label className="bulk-no-deadline"><input type="checkbox" checked={row.noDeadline} onChange={event=>updatePending(row.id,{noDeadline:event.target.checked})}/>No deadline</label></>}</>}</div><button className="icon-button" aria-label={`Remove ${row.file.name} from upload`} onClick={()=>setPending(current=>current.filter(item=>item.id!==row.id))} disabled={saving}><X size={16}/></button></div>;})}</div><div className="bulk-file-footer"><span>{pending.filter(row=>row.subject&&(row.kind==='theory'||row.taskId||row.title&&(row.dueLocal||row.noDeadline))).length} of {pending.length} ready</span><button className="button primary" disabled={!ready||saving||analyzing} onClick={savePending}><Check size={16}/>{saving?'Saving…':`Save ${pending.length} ${pending.length===1?'file':'files'}`}</button></div><p className="bulk-file-privacy">PDF first pages are read in this browser. Files are saved after the details are complete.</p></section>}
  <div className="section-heading files-heading"><div className="files-title"><h2>{fileKind==='theory'?'Reference library':'Assignment files'}</h2><span className="subtle-label">{`${fileList.length} ${fileList.length===1?'file':'files'}`}</span></div><ChoiceSelect label="Sort files" value={preference.mode} onChange={changeSort} options={[{value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'},{value:'custom',label:'Custom order'}]} className="file-sort-select"/></div>
  {fileList.length?<div className="file-list">{fileList.map((file,index)=>{const linked=state.tasks.find(task=>task.id===file.taskId);return <div className={`library-file ${preference.mode==='custom'?'custom-order':''}`} key={file.id} onDragOver={event=>{if(preference.mode==='custom')event.preventDefault();}} onDrop={event=>{event.preventDefault();const sourceId=event.dataTransfer.getData('text/plain');if(kindFiles.some(item=>item.id===sourceId))reorder(sourceId,file.id);}}>{preference.mode==='custom'&&<div className="library-reorder"><button className="icon-button library-grip" type="button" draggable aria-label={`Drag ${file.name} to reorder`} title="Drag to reorder files" onDragStart={event=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',file.id);}}><GripVertical size={17}/></button><div className="library-move-buttons"><button className="icon-button" type="button" aria-label={`Move ${file.name} up`} title="Move up" disabled={index===0} onClick={()=>moveVisible(index,-1)}><ArrowUp size={15}/></button><button className="icon-button" type="button" aria-label={`Move ${file.name} down`} title="Move down" disabled={index===fileList.length-1} onClick={()=>moveVisible(index,1)}><ArrowDown size={15}/></button></div></div>}<File size={23}/><button className="library-file-open" type="button" onClick={()=>onOpen(file)} aria-label={`Open ${file.name}`}><strong>{file.name}</strong><span>{subject(file.subject).short}{linked?` · ${linked.title}`:file.lectureDate?` · Class ${fmt(file.lectureDate+'T12:00Z')}`:''} · {bytes(file.size)} · {fmt(file.added)}</span></button>{file.kind==='assignment'&&!linked&&<ChoiceSelect className="file-link-select" aria-label={`Attach ${file.name} to an assignment`} defaultValue="" onChange={event=>{if(event.target.value)onLink(file.id,event.target.value);}}><option value="">Attach to assignment…</option>{state.tasks.filter(task=>task.subject===file.subject).map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</ChoiceSelect>}<button className="icon-button" aria-label={`Download ${file.name}`} onClick={()=>onDownload(file)}><Download size={18}/></button><button className="icon-button library-file-delete" aria-label={`Delete ${file.name}`} title={`Delete ${file.name}`} disabled={deletingId===file.id} onClick={()=>remove(file)}><Trash2 size={18}/></button></div>;})}</div>:<div className="library-empty"><FolderOpen size={28}/><h3>{query?'No matching files':fileKind==='theory'?'No notes yet':'No assignment files yet'}</h3><p>{query?'Try another name or subject.':'Choose a subject and add files above.'}</p></div>}
 </div>;
}
