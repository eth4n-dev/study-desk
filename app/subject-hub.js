'use client';
import {ArrowRight,File,FolderOpen,Plus} from 'lucide-react';
import {fmt} from '../lib/model.mjs';
import {useSubjectLookup} from './workspace-context';
import {groupWork} from '../lib/work-queue.mjs';
import {CourseDetails,ToRevisit} from './study-tools';

export default function SubjectHub({state,id,now,onSaveCourse,onOpenFiles,onOpenTask,onOpenAssignments,onAddAssignment,onOpenRevision,onDoneRevision,onOpenFile}){
 const subject=useSubjectLookup();
 const course=subject(id);
 const taskGroups=groupWork(state.tasks.filter(task=>task.subject===id),now);
 const active=[...taskGroups.inProgress,...taskGroups.upcoming];
 const revisions=state.revisions.filter(item=>item.subject===id);
 const files=state.files.filter(file=>file.subject===id&&file.kind==='theory').sort((a,b)=>new Date(b.added)-new Date(a.added));
 return <div className="subject-hub">
  <div className="page-heading subject-hub-heading"><div><h1>{course.short}</h1><p>{course.name}</p></div><button className="button" onClick={onAddAssignment}><Plus size={16}/>Add assignment</button></div>
  <CourseDetails state={state} id={id} now={now} onSave={onSaveCourse} onOpenFiles={onOpenFiles} fileCount={files.length}/>
  <div className="subject-hub-grid">
   <section className="subject-hub-work"><div className="section-heading"><h2>Work to do</h2><button className="text-button" onClick={onOpenAssignments}>All assignments <ArrowRight size={14}/></button></div>
    {active.length?<div className="subject-hub-task-list">{active.slice(0,5).map(task=><button className="subject-hub-task" key={task.id} onClick={()=>onOpenTask(task.id)}><span><strong>{task.title}</strong><small>{task.status==='In progress'?'In progress':task.due?`${new Date(task.due)<now?'Overdue':'Due'} ${fmt(task.due,{weekday:'short'})}`:'No deadline'}</small></span><ArrowRight size={16}/></button>)}</div>:<p className="muted">No current assignments for this subject.</p>}
    {taskGroups.overdue.length>0&&<details className="subject-overdue"><summary>{taskGroups.overdue.length} overdue assignment{taskGroups.overdue.length===1?'':'s'}</summary><div>{taskGroups.overdue.map(task=><button className="subject-hub-task" key={task.id} onClick={()=>onOpenTask(task.id)}><span><strong>{task.title}</strong><small>Due {fmt(task.due)}</small></span><ArrowRight size={16}/></button>)}</div></details>}
   </section>
   <aside className="subject-hub-resources">
    <ToRevisit revisions={revisions} onOpen={onOpenRevision} onDone={onDoneRevision}/>
    <section className="subject-hub-files"><div className="section-heading"><h2>Course files</h2><button className="text-button" onClick={onOpenFiles}>All files <ArrowRight size={14}/></button></div>{files.length?<div className="subject-hub-file-list">{files.slice(0,4).map(file=><button key={file.id} onClick={()=>onOpenFile(file)}><File size={16}/><span>{file.name}</span></button>)}</div>:<p className="muted">No course notes or PDFs yet.</p>}</section>
   </aside>
  </div>
 </div>;
}
