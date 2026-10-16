import {SUBJECTS,STATUSES} from './model.mjs';

export async function parseBackup(file){
 let data;
 try{data=JSON.parse(await file.text());}catch{throw new Error('This file is not a readable JSON backup.');}
 if(data.app!=='eth-study'||data.version!==1||!Array.isArray(data.state?.tasks)||!Array.isArray(data.files)||!Array.isArray(data.state?.files)||!Array.isArray(data.state?.logs)||!Array.isArray(data.state?.revisions)||!Array.isArray(data.state?.rules))throw new Error('This is not a valid Study desk backup.');
 const subjects=Array.isArray(data.state.subjects)?data.state.subjects:SUBJECTS;
 if(subjects.some(subject=>!subject||typeof subject.id!=='string'||typeof subject.name!=='string'))throw new Error('This backup contains invalid subjects.');
 if(data.state.timeZone){try{new Intl.DateTimeFormat('en',{timeZone:data.state.timeZone});}catch{throw new Error('This backup contains an invalid time zone.');}}
 for(const field of ['scheduleRules','scheduleEvents','calendarSources','activityTypes'])if(data.state[field]!==undefined&&!Array.isArray(data.state[field]))throw new Error(`This backup contains invalid ${field}.`);
 const knownSubject=id=>id==='personal'||subjects.some(subject=>subject.id===id);
 for(const item of [...(data.state.scheduleRules||[]),...(data.state.scheduleEvents||[])])if(!item||typeof item.id!=='string'||!knownSubject(item.subject)||!Number.isInteger(item.start)||!Number.isInteger(item.end)||item.start<0||item.end>1440||item.end<=item.start)throw new Error('This backup contains invalid classes.');
 for(const item of data.state.activityTypes||[])if(!item||typeof item.id!=='string'||typeof item.label!=='string'||item.subject&&!knownSubject(item.subject))throw new Error('This backup contains invalid activity buttons.');
 for(const t of data.state.tasks){
  if(typeof t.id!=='string'||typeof t.title!=='string'||!(t.subject==='personal'||subjects.some(s=>s.id===t.subject))||!STATUSES.includes(t.status)||!Array.isArray(t.files)||[t.due,t.release].some(d=>d&&!Number.isFinite(+new Date(d))))throw new Error('This backup contains invalid assignments.');
 }
 for(const f of data.state.files)if(typeof f.id!=='string'||typeof f.name!=='string'||!subjects.some(s=>s.id===f.subject))throw new Error('This backup contains invalid files.');
 for(const r of data.state.rules)if(!r.id||!subjects.some(s=>s.id===r.subject)||![1,2,3,4].includes(r.every)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(r.firstDate)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(r.endDate))throw new Error('This backup contains invalid repeat rules.');
 if(data.state.unattendedSlots!==undefined&&(!Array.isArray(data.state.unattendedSlots)||data.state.unattendedSlots.some(key=>typeof key!=='string'||key.length>240)))throw new Error('This backup contains invalid attendance settings.');
 if(data.state.studyBlocks!==undefined&&(!Array.isArray(data.state.studyBlocks)||data.state.studyBlocks.some(b=>!b||typeof b.id!=='string'||typeof b.taskId!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(b.date)||!Number.isInteger(b.start)||!Number.isInteger(b.duration)||b.start<0||b.duration<15||b.start+b.duration>1440)))throw new Error('This backup contains invalid study plans.');
 const files=await Promise.all(data.files.map(async f=>{
  if(typeof f.data!=='string'||!/^data:[^,]*;base64,/.test(f.data))throw new Error('Invalid file data in backup.');
  return {id:f.id,blob:await(await fetch(f.data)).blob()};
 }));
 if(data.state.files.some(f=>!files.some(x=>x.id===f.id)))throw new Error('The backup is missing file contents.');
 return {state:data.state,files};
}
