import {getDisplayLocale} from './i18n.mjs';

export const SUBJECTS = [
 {id:'analysis',name:'Analysis II',short:'Analysis II',color:'#f39787',code:'401-0213-16L',moodle:'https://moodle-app2.let.ethz.ch/course/view.php?id=28257',professors:'Laura Kobel-Keller',video:'https://video.ethz.ch/lectures/d-math/2026/autumn/401-0213-16L'},
 {id:'numerical',name:'Numerical Methods',short:'Numerical Methods',color:'#70d6ad',code:'401-0663-00L',moodle:'https://moodle-app2.let.ethz.ch/course/view.php?id=28728',professors:'Vasile Catrinel Gradinaru',video:'https://video.ethz.ch/lectures/d-math/2026/autumn/401-0663-00L'},
 {id:'theory',name:'Theoretical Computer Science',short:'Theoretical CS',color:'#b2a0ff',code:'252-0057-00L',moodle:'https://moodle-app2.let.ethz.ch/course/view.php?id=29077',professors:'Dennis Komm, Hans-Joachim Böckenhauer',video:'https://video.ethz.ch/lectures/d-infk/2026/autumn/252-0057-00L'},
 {id:'spca',name:'Systems Programming & Computer Architecture',short:'SPCA',color:'#77bbff',code:'252-0061-00L',moodle:'https://moodle-app2.let.ethz.ch/course/view.php?id=29124',professors:'Ana Klimovic, Timothy Roscoe',video:'https://video.ethz.ch/lectures/d-infk/2026/autumn/252-0061-00L'},
 {id:'hodl',name:'Hands-On Deep Learning',short:'HODL',color:'#cbdc7b',code:''},
 {id:'russian',name:'Russian',short:'Russian',color:'#ed9dd0',code:''}
];
export const subject = (id,subjects=SUBJECTS) => id==='personal'?{id:'personal',name:'Personal task',short:'Personal',color:'#d9c997'}:subjects.find(s=>s.id===id) || {id,name:'Unknown subject',short:'Unknown',color:'#a1aaa9'};
export const STATUSES=['Not started','In progress','Done'];
let workspaceTimeZone='Europe/Zurich';
export function setWorkspaceTimeZone(value){new Intl.DateTimeFormat('en',{timeZone:value});workspaceTimeZone=value;}
export const getWorkspaceTimeZone=()=>workspaceTimeZone;
export const todayKey=(now=new Date(),timeZone=workspaceTimeZone)=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function addDays(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function monday(day){const d=new Date(day+'T12:00:00Z');return addDays(day,-((d.getUTCDay()+6)%7));}
export function localISO(value,timeZone=workspaceTimeZone){
 if(!value)return null;
 // Interpret wall-clock input in Zurich, including daylight saving transitions.
 const raw=new Date(value+'Z');if(!Number.isFinite(+raw))throw new Error('Choose a valid date and time.');
 let result=raw;
 for(let i=0;i<3;i++){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(result);
  const o=Object.fromEntries(p.map(v=>[v.type,v.value]));
  const local=Date.UTC(+o.year,+o.month-1,+o.day,+o.hour,+o.minute,+o.second);
  result=new Date(+result+(+raw-local));
 }
 return result.toISOString();
}
export const zurichISO=value=>localISO(value);
export function wallTime(iso,timeZone=workspaceTimeZone){if(!iso)return '';const p=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));const o=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}T${o.hour}:${o.minute}`;}
export function fmt(iso,opts={},timeZone=workspaceTimeZone){if(!iso)return 'Date not set';return new Intl.DateTimeFormat(getDisplayLocale(),{timeZone,day:'numeric',month:'short',...opts}).format(new Date(iso));}
export const timeLabel=mins=>`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
export const shortHodl = day => Math.abs(Math.round((new Date(monday(day)+'T12:00Z')-new Date('2026-10-12T12:00Z'))/604800000))%2===0;
const SLOTS=[
 ['numerical',0,495,600,'Lecture','HG F 1'],['numerical',0,615,720,'Exercise','ML F 40'],['analysis',0,855,960,'Exercise','LFW C 1'],
 ['theory',1,495,600,'Lecture','HG E 7'],['spca',1,615,720,'Lecture','HG E 7'],
 ['spca',2,615,720,'Lecture','ETA F 5'],['russian',2,735,840,'Class','HG E19'],['spca',2,855,960,'Exercise','CHN F42'],
 ['numerical',3,615,720,'Lecture','HG F 1'],['analysis',3,855,960,'Lecture','HG E 7'],
 ['theory',4,495,600,'Lecture','HG E 7']
];
export function weekSlots(week){const short=shortHodl(week);const rows=[...SLOTS,short?['theory',1,855,960,'Exercise','CAB G57']:['theory',3,975,1080,'Exercise','CHN D42'],['hodl',1,short?810:735,short?825:960,short?'Check-in':'Practical','HG G 1']];return rows.map(([sub,day,start,end,type,room])=>({id:`${addDays(week,day)}-${sub}-${start}`,subject:sub,day,date:addDays(week,day),start,end,type,room})).sort((a,b)=>a.day-b.day||a.start-b.start);}
export const attendanceKey=slot=>slot.seriesId?`series:${slot.seriesId}`:slot.subject==='theory'&&slot.type==='Exercise'?'theory:3:975':`${slot.subject}:${slot.day}:${slot.subject==='hodl'?'alternating':slot.start}`;
export const isUnattended=(slot,unattendedSlots=[])=>unattendedSlots.includes(attendanceKey(slot))||unattendedSlots.includes(slot.id);
export function lectureOptions(now){const list=[];const end=addDays(todayKey(now),7);for(let day='2026-09-14';day<=end;day=addDays(day,7)){list.push(...weekSlots(day).filter(x=>x.type!=='Exercise'&&x.date<=todayKey(now)));}return list.reverse();}
const mk=(id,sub,title,day,status='Not started',extra={})=>({id,subject:sub,title,due:day?zurichISO(day+'T23:59'):null,release:null,status,files:[],noFile:false,source:'Notion screenshot',dateOnly:true,...extra});
export function seedState(){return migrateState({version:1,tasks:[
 mk('analysis-serie-2','analysis','Serie 2','2026-10-02','In progress'),mk('analysis-serie-3','analysis','Serie 3','2026-10-09'),
 mk('russian-wortschatz','russian','Wortschatz 13-End…','2026-10-14','Not started',{notes:'Full title is cropped in the screenshot.'}),
 mk('spca-assignment-2','spca','Assignment 2','2026-10-14','In progress'),mk('theory-sheet-4','theory','Sheet 4','2026-10-16'),
 mk('numerical-codeexpert-4','numerical','CodeExpert 04','2026-10-19'),
 mk('theory-quiz-4','theory','Moodle Quiz Woche 4','2026-10-13','Done'),mk('russian-arbeit','russian','Arbeit…','2026-10-14','Done',{notes:'Full title is cropped in the screenshot.'}),
 mk('numerical-codeexpert-3','numerical','CodeExpert 03','2026-10-12','Done'),mk('hodl-challenge-2','hodl','Challenge','2026-10-12','Done'),mk('hodl-notebook-2','hodl','Notebook','2026-10-12','Done'),
 mk('russian-week-3','russian','Week 3','2026-10-07','Done'),mk('theory-quiz-3','theory','Moodle Quiz Woche 3','2026-10-06','Done'),mk('theory-sheet-3','theory','Sheet 3','2026-10-10','Done'),
 mk('numerical-quiz-3','numerical','Quiz 03: Trigonometrische Interpolation','2026-10-12','Done'),mk('spca-codeexpert-2','spca','CodeExpert 02','2026-10-06','Done'),
 mk('numerical-quiz-2','numerical','Quiz 02','2026-10-05','Done'),mk('theory-sheet-2','theory','Sheet 2','2026-10-02','Done'),mk('theory-quiz-2','theory','Quiz','2026-09-28','Done'),
 mk('numerical-quiz-1','numerical','Quiz','2026-09-28','Done'),mk('russian-week-2','russian','Week 2','2026-09-30','Done'),mk('russian-portfolio-1','russian','Portfolio 1','2026-09-30','Done'),
 mk('numerical-codeexpert-1','numerical','CodeExpert 01','2026-09-28','Done'),mk('spca-codeexpert-1','spca','CodeExpert 01','2026-09-29','Done'),mk('hodl-challenge-1','hodl','Challenge','2026-09-28','Done'),
 mk('analysis-serie-1','analysis','Serie 1','2026-09-25','Done'),mk('theory-sheet-1','theory','Sheet 1','2026-09-25','Done'),mk('theory-quiz-1','theory','Quiz Woche 1','2026-09-22','Done')
 ],studyBlocks:[],unattendedSlots:[],files:[],revisions:[{id:'rev-spca',subject:'spca',lecture:'2026-10-06-spca-615',label:'SPCA · 6 Oct, 10:15',date:'2026-10-06'},{id:'rev-theory',subject:'theory',lecture:'2026-10-09-theory-495',label:'Theoretical CS · 9 Oct, 08:15',date:'2026-10-09'}],taskEvents:[],logs:[...['2026-09-30','2026-10-01','2026-10-04'].map(date=>({id:'russian-'+date,kind:'russian',subject:'russian',date,minutes:null,label:'Russian practice'})),...['2026-10-02','2026-10-03','2026-10-04'].map(date=>({id:'revision-'+date,kind:'revised',date,minutes:null,label:'Revision · lecture not specified'}))],rules:[],importedAt:'2026-10-13',calendarEvents:11});}
export function eventTask(event,subjects=SUBJECTS){
 const source=`${event.course||''} ${event.title||''}`.toLowerCase();
 const matches=subjects.filter(s=>[s.code,s.name,s.short,...(s.aliases||[])].filter(Boolean).some(name=>source.includes(String(name).toLowerCase())));
 const sub=matches.length===1?matches[0]:null;if(!sub)return null;
 const number=(event.title.match(/(?:Quiz|Woche|Serie|Sheet|Blatt)\s*0*(\d+)/i)||[])[1];let type=/Serie/i.test(event.title)?'serie':/Sheet|Blatt/i.test(event.title)?'sheet':'quiz';
 const id=`${sub.id}-${type}-${Number(number)||event.uid}`;const title=plainDashes(event.title).replace(/\s+(opens|closes|is due|ist fällig\.)$/i,'').replace(/^Abgabe: Blatt \d+ \/ /,'');
 return {id,subject:sub.id,title,field:/ opens$/i.test(event.title)?'release':'due',at:event.at};
}
export function mergeCalendar(state,events){const tasks=state.tasks.map(t=>({...t}));let matched=0;for(const e of events){const p=eventTask(e,state.subjects||SUBJECTS);if(!p)continue;matched++;let t=tasks.find(t=>t.id===p.id);if(!t){t=mk(p.id,p.subject,p.title,null);tasks.push(t);}t[p.field]=p.at;t.source='Calendar import';if(p.field==='due')t.dateOnly=false;}return {...state,tasks,calendarEvents:matched,importedAt:todayKey()};}
export function parseICS(text){if(!text.includes('BEGIN:VCALENDAR'))throw new Error('Choose a Moodle calendar (.ics) file.');const unfolded=text.replace(/\r?\n[ \t]/g,'');return unfolded.split('BEGIN:VEVENT').slice(1).map(block=>{const props={};for(const line of block.split('END:VEVENT')[0].split(/\r?\n/)){const i=line.indexOf(':');if(i>0)props[line.slice(0,i)]=line.slice(i+1);}const dateKey=Object.keys(props).find(k=>k.startsWith('DTSTART'));const v=props[dateKey]||'';const m=v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);if(!m)return null;const wall=`${m[1]}-${m[2]}-${m[3]}T${m[4]||'00'}:${m[5]||'00'}:${m[6]||'00'}`;const zone=dateKey.match(/TZID=([^;]+)/)?.[1]||workspaceTimeZone;return {uid:props.UID,title:(props.SUMMARY||'').replace(/\\n/g,' ').replace(/\\,/g,','),course:props.CATEGORIES||'',at:m[7]?wall+'Z':localISO(wall,zone)};}).filter(Boolean);}
export function taskType(task){
 if(task.kind==='personal'||task.subject==='personal')return 'personal';
 if(['file','simple','quiz','online','codeexpert'].includes(task.kind))return task.kind;
 if(/quiz/i.test(task.title))return 'quiz';
 if(task.kind==='codeexpert'||/codeexpert/i.test(task.id)||/code\s?expert/i.test(task.title)||(task.subject==='numerical'&&/^serie\s?\d+/i.test(task.title))||(task.subject==='hodl'&&/notebook|challenge/i.test(task.title)))return 'codeexpert';
 return task.kind||'file';
}
export function assignmentKindLabel(task){
 const kind=taskType(task);
 if(kind==='personal')return 'Personal task';
 if(kind==='simple')return 'Simple assignment';
 if(kind==='codeexpert')return 'CodeExpert';
 if(kind==='online')return 'Online assignment';
 if(kind==='quiz')return SUBJECTS.some(item=>item.id===task.subject)?'Moodle quiz':'Quiz';
 return /\b(sheet|blatt|serie)\b/i.test(task.title)?'Sheet':'Assignment';
}
const CODEEXPERT_URLS={
 numerical:'https://expert.ethz.ch/enrolled/AS26/NumINFK/exercises',
 spca:'https://expert.ethz.ch/enrolled/AS26/spca/exercises'
};
export function codeExpertUrlForTask(task){
 return task&&taskType(task)==='codeexpert'?CODEEXPERT_URLS[task.subject]||null:null;
}
const MOODLE_SECTIONS={
 analysis:'https://moodle-app2.let.ethz.ch/course/section.php?id=264166',
 theory:'https://moodle-app2.let.ethz.ch/course/section.php?id=262863',
 numericalQuiz:'https://moodle-app2.let.ethz.ch/course/section.php?id=258513',
 spca:'https://moodle-app2.let.ethz.ch/course/section.php?id=263372'
};
export function moodleSectionForTask(task){
 if(!task)return null;
 if(task.subject==='numerical')return taskType(task)==='quiz'?MOODLE_SECTIONS.numericalQuiz:null;
 return MOODLE_SECTIONS[task.subject]||null;
}
export function supportsUploads(task){return Boolean(task&&!['personal','simple'].includes(taskType(task)));}
export function expectsAssignmentFile(task){return taskType(task)==='file';}
export const DEFAULT_RULES=[
 {id:'numcs-series',subject:'numerical',prefix:'serie',startNumber:1,every:1,firstDate:'2026-09-28',endDate:'2026-12-14',scheduleBased:'deadline',dueTime:'08:00',kind:'codeexpert',taskIdPrefix:'numerical-codeexpert-',pad:2,join:'',active:true},
 ...['Notebook','Challenge'].map(prefix=>({id:'hodl-'+prefix.toLowerCase(),subject:'hodl',prefix,startNumber:1,every:2,firstDate:'2026-09-28',endDate:'2026-12-07',scheduleBased:'deadline',dueTime:'23:59',kind:'codeexpert',taskIdPrefix:'hodl-'+prefix.toLowerCase()+'-',pad:2,join:' ',active:true}))
];
function migrateLegacyState(state){
 if(state.schemaVersion>=2)return state;
 const tasks=state.tasks.map(t=>({...t,files:[...t.files]}));
 for(const t of tasks){
  if(t.id.startsWith('numerical-codeexpert-')){const n=Number(t.id.split('-').at(-1));if(n){t.title='serie'+String(n).padStart(2,'0');t.due=zurichISO(addDays('2026-09-28',(n-1)*7)+'T08:00');t.dateOnly=false;t.kind='codeexpert';}}
  if(/^hodl-(notebook|challenge)-\d+$/.test(t.id)){const n=Number(t.id.split('-').at(-1));const prefix=t.id.includes('notebook')?'Notebook':'Challenge';t.title=prefix+' '+String(n).padStart(2,'0');t.due=zurichISO(addDays('2026-09-28',(n-1)*14)+'T23:59');t.dateOnly=false;t.kind='codeexpert';}
  if(t.id==='spca-assignment-2'){t.title='Assignment 02: C Programming';t.due=zurichISO('2026-10-13T23:59');t.dateOnly=false;t.kind='codeexpert';t.source='CodeExpert screenshot';t.exercises=['Reversing an Array','First Whitespace Separated Word','Complex Numbers','Binary Search Tree','Word Count','File IO','Function Pointer Basics','Function Pointer Continued'];}
  if(t.id==='spca-codeexpert-1'||t.id==='spca-codeexpert-2'){const first=t.id.endsWith('-1');t.title=first?'Chapter 2: Intro to C':'Chapter 3: C Integers';t.exercises=[first?'rot13':'maxint'];t.due=null;t.dateOnly=true;t.kind='codeexpert';t.status='Done';t.source='CodeExpert screenshot';t.notes='Completed in the supplied screenshot. Exact deadline not shown.';}
  if(taskType(t)!=='file'){t.noFile=true;t.kind=taskType(t);}
 }
 // Backfill only the history confirmed by the user on 13 October. Never mark later overdue tasks done automatically.
 const additions=[mk('numerical-codeexpert-2','numerical','serie02',null,'Done',{kind:'codeexpert',noFile:true,due:zurichISO('2026-10-05T08:00'),dateOnly:false,source:'Inferred completed history · user requested'}),mk('hodl-notebook-1','hodl','Notebook 01',null,'Done',{kind:'codeexpert',noFile:true,due:zurichISO('2026-09-28T23:59'),dateOnly:false,source:'Inferred completed history · user requested'}),mk('spca-assignment-1','spca','Assignment 01','2026-09-30','Done',{kind:'codeexpert',noFile:true,source:'Notion screenshot date · completed history requested'})];
 for(const t of additions)if(!tasks.some(x=>x.id===t.id))tasks.push(t);
 return {...state,schemaVersion:2,tasks,subjectInfo:state.subjectInfo||{},rules:[...state.rules,...DEFAULT_RULES.filter(r=>!state.rules.some(x=>x.id===r.id))]};
}
export const THEORY_RULES=[
 {id:'theory-quizzes',subject:'theory',prefix:'Moodle Quiz Woche',startNumber:1,every:1,firstDate:'2026-09-22',endDate:'2026-12-15',scheduleBased:'deadline',dueTime:'08:00',kind:'quiz',taskIdPrefix:'theory-quiz-',active:true},
 {id:'theory-sheets',subject:'theory',prefix:'Sheet',startNumber:1,every:1,firstDate:'2026-09-25',endDate:'2026-12-18',scheduleBased:'deadline',dueTime:'11:00',kind:'file',taskIdPrefix:'theory-sheet-',active:true}
];
function migrateTheoryState(state){
 const current=migrateLegacyState(state);if(current.schemaVersion>=3)return current;
 const tasks=current.tasks.map(t=>{
  const match=t.id.match(/^theory-(quiz|sheet)-(\d+)$/);if(!match)return t;
  const rule=THEORY_RULES[match[1]==='quiz'?0:1];const number=Number(match[2]);
  return {...t,kind:rule.kind,noFile:rule.kind==='quiz'?true:t.noFile,...(t.source==='You'?{}:{due:zurichISO(addDays(rule.firstDate,(number-1)*7)+'T'+rule.dueTime),dateOnly:false})};
 });
 return {...current,schemaVersion:3,tasks,rules:[...current.rules,...THEORY_RULES.filter(r=>!current.rules.some(x=>x.id===r.id))]};
}
// Keep long dashes out of interface copy and assignment names.
export const plainDashes=value=>String(value??'').replace(/[\u2013\u2014]/g,'-');
function migrateOldState(state){
 const current=migrateTheoryState(state);
 if(current.schemaVersion>=4){
  const pending=current.tasks.some(t=>['spca-codeexpert-1','spca-codeexpert-2'].includes(t.id)&&t.source==='Inferred CodeExpert deadline');
  return pending?{...current,tasks:current.tasks.map(t=>['spca-codeexpert-1','spca-codeexpert-2'].includes(t.id)&&t.source==='Inferred CodeExpert deadline'?{...t,source:'Confirmed by you',notes:'Completed in the supplied CodeExpert screenshot.'}:t)}:current;
 }
 const tasks=current.tasks.map(task=>{
  let due=task.due;
  const missingSpca=!due&&['spca-codeexpert-1','spca-codeexpert-2'].includes(task.id);
  if(missingSpca)due=zurichISO('2026-09-30T23:59');
  if(due&&task.subject==='russian')due=zurichISO(wallTime(due).slice(0,10)+'T12:15');
  if(task.id==='analysis-serie-2'&&due)due=zurichISO(wallTime(due).slice(0,10)+'T23:59');
  return {...task,due,dateOnly:false,title:plainDashes(task.title),
   ...(task.notes!=null?{notes:plainDashes(task.notes)}:{}),
   ...(task.exercises?{exercises:task.exercises.map(plainDashes)}:{}),
   ...(missingSpca?{source:'Confirmed by you',notes:'Completed in the supplied CodeExpert screenshot.'}:{})};
 });
 return {...current,schemaVersion:4,tasks,
  rules:current.rules.map(rule=>({...rule,prefix:plainDashes(rule.prefix)}))};
}
export function emptyWorkspace(timeZone='Europe/Zurich'){
 return {schemaVersion:5,version:1,timeZone,subjects:[],scheduleRules:[],scheduleEvents:[],calendarSources:[],activityTypes:[],tasks:[],studyBlocks:[],unattendedSlots:[],files:[],fileSorting:{theory:{mode:'newest',order:[]},assignment:{mode:'newest',order:[]}},revisions:[],logs:[],taskEvents:[],rules:[],subjectInfo:{},importedAt:null,calendarEvents:0};
}
const legacyRule=(row,index)=>({id:`legacy-${index}`,subject:row[0],weekday:row[1],start:row[2],end:row[3],type:row[4],room:row[5],everyWeeks:1,anchorWeek:'2026-10-12',startDate:'2026-09-14',endDate:'2027-01-31',legacyId:true});
export const LEGACY_SCHEDULE_RULES=[
 ...SLOTS.map(legacyRule),
 {id:'legacy-theory-short',subject:'theory',weekday:1,start:855,end:960,type:'Exercise',room:'CAB G57',everyWeeks:2,anchorWeek:'2026-10-12',startDate:'2026-09-14',endDate:'2027-01-31',legacyId:true,attendanceGroupId:'legacy-theory-exercise'},
 {id:'legacy-theory-long',subject:'theory',weekday:3,start:975,end:1080,type:'Exercise',room:'CHN D42',everyWeeks:2,anchorWeek:'2026-10-19',startDate:'2026-09-14',endDate:'2027-01-31',legacyId:true,attendanceGroupId:'legacy-theory-exercise'},
 {id:'legacy-hodl-short',subject:'hodl',weekday:1,start:810,end:825,type:'Check-in',room:'HG G 1',everyWeeks:2,anchorWeek:'2026-10-12',startDate:'2026-09-14',endDate:'2027-01-31',legacyId:true,attendanceGroupId:'legacy-hodl'},
 {id:'legacy-hodl-long',subject:'hodl',weekday:1,start:735,end:960,type:'Practical',room:'HG G 1',everyWeeks:2,anchorWeek:'2026-10-19',startDate:'2026-09-14',endDate:'2027-01-31',legacyId:true,attendanceGroupId:'legacy-hodl'}
];
export function migrateState(state){
 if(state.schemaVersion>=5)return state.subjects&&state.scheduleRules&&state.scheduleEvents&&state.calendarSources&&state.activityTypes&&state.timeZone?state:{...state,subjects:state.subjects||[],scheduleRules:state.scheduleRules||[],scheduleEvents:state.scheduleEvents||[],calendarSources:state.calendarSources||[],activityTypes:state.activityTypes||[],timeZone:state.timeZone||'Europe/Zurich'};
 const old=migrateOldState(state);
 const unattendedSlots=(old.unattendedSlots||[]).map(key=>{
  if(key==='theory:3:975')return 'series:legacy-theory-exercise';
  if(key==='hodl:1:alternating')return 'series:legacy-hodl';
  const rule=LEGACY_SCHEDULE_RULES.find(item=>`${item.subject}:${item.weekday}:${item.start}`===key);
  return rule?`series:${rule.id}`:key;
 });
 return {...old,schemaVersion:5,timeZone:'Europe/Zurich',subjects:SUBJECTS.map(item=>({...item})),scheduleRules:LEGACY_SCHEDULE_RULES.map(item=>({...item})),scheduleEvents:[],calendarSources:[],activityTypes:[{id:'russian-practice',label:'Studied Russian',subject:'russian',color:'#ed9dd0'}],unattendedSlots};
}
export function scheduleSlots(state,week){
 const mondayDate=monday(week),rules=state.scheduleRules||[],events=state.scheduleEvents||[];
 const recurring=rules.flatMap(rule=>{
  const date=addDays(mondayDate,rule.weekday);
  if(rule.active===false||date<(rule.startDate||'0000-01-01')||date>(rule.endDate||'9999-12-31'))return [];
  const anchor=monday(rule.anchorWeek||rule.startDate||mondayDate);
  const index=Math.round((Date.parse(mondayDate+'T12:00:00Z')-Date.parse(anchor+'T12:00:00Z'))/604800000);
  if(((index%(rule.everyWeeks||1))+(rule.everyWeeks||1))%(rule.everyWeeks||1)!==0)return [];
  const id=rule.legacyId?`${date}-${rule.subject}-${rule.start}`:`${date}-${rule.id}`;
  return [{id,seriesId:rule.attendanceGroupId||rule.id,subject:rule.subject,day:rule.weekday,date,start:rule.start,end:rule.end,type:rule.type,room:rule.room||''}];
 });
 const oneOff=events.filter(event=>monday(event.date)===mondayDate&&event.active!==false).map(event=>({...event,day:(new Date(event.date+'T12:00:00Z').getUTCDay()+6)%7,seriesId:event.seriesId||null}));
 return [...recurring,...oneOff].sort((a,b)=>a.day-b.day||a.start-b.start);
}
export function repeatRuleForTask(state,task){
 if(!task)return null;
 return state.rules.find(r=>r.id===task.repeatRuleId)||state.rules.find(r=>{
  if(r.subject!==task.subject)return false;
  if(r.anchorTaskId===task.id)return true;
  if(r.taskIdPrefix&&task.id.startsWith(r.taskIdPrefix)){
   const number=task.id.slice(r.taskIdPrefix.length);
   return /^\d+$/.test(number)&&Number(number)>=(r.historicalStartNumber??r.startNumber);
  }
  return task.id.startsWith(`rule-${r.id}-`)&&/^\d+$/.test(task.id.slice(`rule-${r.id}-`.length));
 })||null;
}
export function repeatRelease(rule,task){
 if(!rule||!task.due)return null;
 const due=wallTime(task.due);
 if(Number.isInteger(rule.availableDaysBefore)&&rule.availableTime)
  return zurichISO(addDays(due.slice(0,10),-rule.availableDaysBefore)+'T'+rule.availableTime);
 // Earlier user-created release-based schedules keep their explicit opening times.
 if(!rule.availabilityConfigured&&rule.scheduleBased!=='deadline'&&rule.releaseTime&&Number.isInteger(rule.dueDays))
  return zurichISO(addDays(due.slice(0,10),-rule.dueDays)+'T'+rule.releaseTime);
 return null;
}
export function createRepeatRule(task,options,existing=null){
 if(!task.due)throw new Error('Choose a deadline before setting up repeats.');
 const every=Number(options.every);
 if(![1,2,3,4].includes(every))throw new Error('Choose how often the assignment repeats.');
 const due=wallTime(task.due),until=options.until;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(until)||until<due.slice(0,10))throw new Error('Repeat until must include this assignment’s deadline.');
 let availableDaysBefore=null,availableTime=null;
 if(expectsAssignmentFile(task)&&options.availableOffset!=null){
  if(!Number.isInteger(options.availableOffset)||options.availableOffset<0||options.availableOffset>every*7||!/^([01]\d|2[0-3]):[0-5]\d$/.test(options.availableTime||''))throw new Error('Choose a valid day and time in the repeating cycle.');
  const release=zurichISO(addDays(due.slice(0,10),-options.availableOffset)+'T'+options.availableTime);
  if(new Date(release)>new Date(task.due))throw new Error('Available from must be before the deadline.');
  availableDaysBefore=options.availableOffset;availableTime=options.availableTime;
 }else if(expectsAssignmentFile(task)&&options.availableFrom){
  const release=zurichISO(options.availableFrom);
  if(new Date(release)>new Date(task.due))throw new Error('Available from must be before the deadline.');
  availableDaysBefore=Math.round((Date.parse(due.slice(0,10)+'T12:00Z')-Date.parse(options.availableFrom.slice(0,10)+'T12:00Z'))/86400000);
  availableTime=options.availableFrom.slice(11,16);
 }
 if(existing){
  const cadenceChanged=existing.every!==every;
  if(!cadenceChanged)return {...existing,subject:task.subject,kind:taskType(task),endDate:until,availableDaysBefore,availableTime,availabilityConfigured:true};
  const prefixNumber=existing.taskIdPrefix&&task.id.startsWith(existing.taskIdPrefix)?Number(task.id.slice(existing.taskIdPrefix.length)):null;
  const legacyIndex=task.id.match(new RegExp(`^rule-${existing.id}-(\\d+)$`));
  const titleNumber=Number(task.title.match(/(\d+)$/)?.[1]);
  const startNumber=prefixNumber||legacyIndex?prefixNumber||existing.startNumber+Number(legacyIndex?.[1]||0):titleNumber||existing.startNumber;
  const usedOffsets=existing.taskIdPrefix?[]:options.tasks?.flatMap(t=>{const match=t.id.match(new RegExp(`^rule-${existing.id}-(\\d+)$`));return match?[Number(match[1])]:[];})||[];
  return {...existing,every,firstDate:due.slice(0,10),dueTime:due.slice(11,16),startNumber,
   historicalStartNumber:existing.historicalStartNumber??existing.startNumber,anchorTaskId:task.id,
   ...(usedOffsets.length?{idOffset:Math.max(...usedOffsets)+1}:{}),
   subject:task.subject,kind:taskType(task),endDate:until,availableDaysBefore,availableTime,availabilityConfigured:true};
 }
 const match=task.title.match(/^(.*?)(\d+)$/);
 const prefix=match?match[1].trimEnd():task.title;
 const standard=task.id.match(/^(analysis-serie-|theory-(?:sheet|quiz)-|numerical-(?:quiz|codeexpert)-|hodl-(?:notebook|challenge)-)(\d+)$/);
 return {id:`repeat-${task.id}`,anchorTaskId:task.id,subject:task.subject,kind:taskType(task),prefix,
  ...(!match?{fixedTitle:task.title}:{}),startNumber:standard?Number(standard[2]):match?Number(match[2]):1,
  pad:match?.[2].startsWith('0')?match[2].length:0,join:match&&/\s$/.test(match[1])?' ':'',
  ...(standard?{taskIdPrefix:standard[1]}:{}),every,firstDate:due.slice(0,10),dueTime:due.slice(11,16),
  scheduleBased:'deadline',endDate:until,availableDaysBefore,availableTime,availabilityConfigured:true,active:true};
}
export function saveAssignment(state,task,repeatOptions,now=new Date()){
 const existing=repeatRuleForTask(state,task);
 const turnedOff=existing&&repeatOptions?.every===0;
 let rule=turnedOff?null:existing,rules=turnedOff?state.rules.filter(r=>r.id!==existing.id):state.rules;
 if(repeatOptions?.every){
  rule=createRepeatRule(task,{...repeatOptions,tasks:state.tasks},existing);
  rules=existing?rules.map(r=>r.id===rule.id?rule:r):[...rules,rule];
 }
 const saved={...task,repeatRuleId:rule?.id||null,release:rule?repeatRelease(rule,task):null};
 const cadenceChanged=existing&&rule&&existing.every!==rule.every;
 const tasksBeforeSave=turnedOff||cadenceChanged?state.tasks.filter(t=>{
  if(t.id===task.id||repeatRuleForTask(state,t)?.id!==existing.id||!t.due||new Date(t.due)<now)return true;
  // Retain completed, edited, imported, and attached assignments when a schedule changes.
  return !['Repeat rule','Confirmed deadline schedule'].includes(t.source)||t.status!=='Not started'||t.files.length>0||Boolean(t.notes);
 }):state.tasks;
 let tasks=tasksBeforeSave.some(t=>t.id===saved.id)?tasksBeforeSave.map(t=>t.id===saved.id?saved:t):[...tasksBeforeSave,saved];
 if(existing&&rule&&(existing.subject!==rule.subject||existing.kind!==rule.kind)){
  const noFile=['simple','quiz','codeexpert'].includes(rule.kind);
  tasks=tasks.map(t=>{
   const linked=t.repeatRuleId===existing.id||repeatRuleForTask(state,t)?.id===existing.id;
   if(t.id===saved.id||!linked||!['Repeat rule','Confirmed deadline schedule','Calendar import'].includes(t.source)||t.status!=='Not started'||(t.files||[]).length>0||t.notes)return t;
   return {...t,subject:rule.subject,kind:rule.kind,...(noFile?{noFile:true}:{})};
  });
 }
 return generateRecurring({...state,tasks,rules},now);
}
export function generateRecurring(state,now=new Date()){
 const tasks=[...state.tasks];let changed=false;const horizon=addDays(todayKey(now),28);
 for(const r of state.rules.filter(r=>r.active!==false)){
  for(let i=0;i<520;i++){
   const date=addDays(r.firstDate,i*7*r.every);if(date>horizon||date>r.endDate)break;
   const number=r.startNumber+i;
   const id=i===0&&r.anchorTaskId?r.anchorTaskId:r.taskIdPrefix?`${r.taskIdPrefix}${number}`:`rule-${r.id}-${(r.idOffset||0)+i}`;
   if(tasks.some(t=>t.id===id))continue;
   const dueOnly=r.scheduleBased==='deadline';
   const due=zurichISO((dueOnly?date:addDays(date,r.dueDays))+'T'+r.dueTime);
   const title=r.fixedTitle||`${r.prefix}${r.join??' '}${String(number).padStart(r.pad||0,'0')}`;
   // Adopt matching existing work, keeping its files, status and edited deadline.
   const found=tasks.findIndex(t=>t.subject===r.subject&&t.title===title&&t.due&&todayKey(new Date(t.due))===todayKey(new Date(due)));
   if(found>=0){if(!tasks[found].repeatRuleId){tasks[found]={...tasks[found],repeatRuleId:r.id};changed=true;}continue;}
   const task=mk(id,r.subject,title,null,'Not started',{kind:r.kind||'file',noFile:['simple','quiz','codeexpert'].includes(r.kind),due,repeatRuleId:r.id,source:dueOnly?'Confirmed deadline schedule':'Repeat rule',dateOnly:false});
   task.release=repeatRelease(r,task);
   tasks.push(task);changed=true;
  }
 }
 return changed?{...state,tasks}:state;
}
export const pendingUploads=(state,now)=>state.tasks.flatMap(task=>{
 const rule=repeatRuleForTask(state,task);
 if(!rule||rule.active===false||!expectsAssignmentFile(task)||task.status==='Done'||task.noFile||task.files.length)return [];
 const release=repeatRelease(rule,task);
 return release&&new Date(release)<=now?[{...task,release}]:[];
}).sort((a,b)=>new Date(a.due||'2099-01-01')-new Date(b.due||'2099-01-01'));
export function courseInfo(state,id){const base=subject(id,state.subjects||SUBJECTS);return {...base,...state.subjectInfo?.[id]};}
export function courseSummary(state,id,now){const tasks=state.tasks.filter(t=>t.subject===id);const active=tasks.filter(t=>t.status!=='Done');return {done:tasks.length-active.length,total:tasks.length,open:active.length,overdue:active.filter(t=>t.due&&new Date(t.due)<now).length,next:[...active].filter(t=>t.due).sort((a,b)=>new Date(a.due)-new Date(b.due)).slice(0,3)};}
export function nextNumber(tasks,sub,prefix){const ns=tasks.filter(t=>t.subject===sub&&t.title.toLowerCase().startsWith(prefix.toLowerCase())).map(t=>Number((t.title.match(/(\d+)\s*$/)||[])[1])||0);return Math.max(0,...ns)+1;}

export function shiftMonth(month,amount){const [year,index]=month.split('-').map(Number);return new Date(Date.UTC(year,index-1+amount,1,12)).toISOString().slice(0,7);}
export function monthDays(month){const first=month+'-01',next=shiftMonth(month,1)+'-01',start=monday(first),last=addDays(next,-1),end=addDays(monday(last),6);const days=[];for(let date=start;date<=end;date=addDays(date,1))days.push(date);return days;}
