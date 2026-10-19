import {suggestFileTask} from './task-inference.mjs';
import {inferPdfAssignment} from './pdf-task.mjs';

export const directTheoryDestination=(selectedSubject,fileKind)=>selectedSubject!=='all'&&fileKind==='theory';

export function uploadProposal(file,pageText,{subjects,tasks,timeZone,selectedSubject,fileKind}){
 const inferred=inferPdfAssignment(file.name,pageText,subjects,tasks,timeZone);
 const match=suggestFileTask(file.name,tasks,pageText,subjects);
 const contextual=selectedSubject!=='all';
 const conflictingSubjects=Boolean(inferred.subjectId&&match?.subject&&inferred.subjectId!==match.subject);
 const subject=contextual?selectedSubject:conflictingSubjects?'':inferred.subjectId||match?.subject||'';
 const kind=inferred.role||fileKind;
 const fallbackTask=tasks.find(task=>task.id===match?.taskId);
 const usableFallback=!inferred.due||!fallbackTask?.due||Math.abs(new Date(fallbackTask.due)-new Date(inferred.due))<30*86400000;
 const candidateId=inferred.taskId||(usableFallback?match?.taskId:'')||'';
 const existing=tasks.find(task=>task.id===candidateId&&task.subject===subject);
 const taskId=existing?.id||'';
 const possibleMatch=tasks.find(task=>task.id===(match?.taskId||inferred.taskId)&&task.subject===subject);
 const dueConflict=Boolean(possibleMatch?.due&&inferred.due&&Math.abs(new Date(possibleMatch.due)-new Date(inferred.due))>60000);
 const contextConflict=contextual&&Boolean(inferred.subjectId&&inferred.subjectId!==selectedSubject);
 const roleConflict=contextual&&Boolean(inferred.role&&inferred.role!==fileKind);
 const dueLocal=inferred.dueDate?`${inferred.dueDate}T${inferred.dueTime||'23:59'}`:'';
 const autoReady=Boolean(subject&&!conflictingSubjects&&!contextConflict&&!roleConflict&&!dueConflict&&(
  kind==='theory'&&inferred.role==='theory'||
  kind==='assignment'&&existing&&inferred.role!=='theory'||
  kind==='assignment'&&inferred.role==='assignment'&&inferred.evidence.title==='First-page title'&&inferred.dueTime&&dueLocal
 ));
 const reason=conflictingSubjects||contextConflict?'Subject does not match this upload':roleConflict?'File type differs from this section':dueConflict?'PDF deadline differs from the existing assignment':!subject?'Choose a subject':!inferred.role&&!existing?'Choose assignment or class material':inferred.evidence.due!=='Not found'?`Found ${inferred.evidence.due}`:match?.reason||'Add missing details';
 return {file,kind,subject,taskId,title:inferred.title,dueLocal,noDeadline:false,updateDue:Boolean(existing&&!existing.due&&inferred.due),dueConflict,autoReady,reason};
}
