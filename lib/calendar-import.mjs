import {addDays,monday} from './model.mjs';

const dayIndex={MO:0,TU:1,WE:2,TH:3,FR:4,SA:5,SU:6};
const textValue=value=>String(value||'').replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\');
const dateOnly=value=>`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;
const weekday=date=>(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
const dateTime=value=>`${dateOnly(value)}T${value.slice(9,11)||'00'}:${value.slice(11,13)||'00'}:${value.slice(13,15)||'00'}`;

export function wallToISO(value,timeZone='Europe/Zurich'){
 const raw=new Date(value+'Z');
 if(!Number.isFinite(+raw))throw new Error('Invalid calendar date.');
 let result=raw;
 for(let i=0;i<4;i++){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(result);
  const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  const shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
  result=new Date(+result+(+raw-shown));
 }
 return result.toISOString();
}
function readProperty(lines,name){return lines.find(line=>line.name===name)||null;}
function parseDate(prop,defaultZone){
 if(!prop)return null;
 const value=prop.value;
 if(!/^\d{8}(T\d{6}Z?)?$/.test(value))return null;
 if(value.length===8)return {date:dateOnly(value),time:'00:00',iso:null,allDay:true,zone:null};
 const wall=dateTime(value),zone=prop.params.TZID||defaultZone;
 const iso=value.endsWith('Z')?new Date(wall+'Z').toISOString():wallToISO(wall,zone);
 return {date:dateOnly(value),time:wall.slice(11,16),iso,allDay:false,zone:value.endsWith('Z')?'UTC':zone};
}
function minutes(value){return Number(value.slice(0,2))*60+Number(value.slice(3,5));}
function displayPosition(date,time,sourceZone,targetZone){
 const iso=sourceZone==='UTC'?`${date}T${time}:00Z`:wallToISO(`${date}T${time}:00`,sourceZone);
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:targetZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
 const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
 return {date:`${value.year}-${value.month}-${value.day}`,start:Number(value.hour)*60+Number(value.minute)};
}
function rawEvents(text){
 if(!/BEGIN:VCALENDAR/i.test(text))throw new Error('Choose a calendar (.ics) file.');
 const unfolded=text.replace(/\r?\n[ \t]/g,'');
 return [...unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/gi)].map(([,body])=>body.split(/\r?\n/).filter(Boolean).map(row=>{
  const colon=row.indexOf(':');if(colon<0)return null;
  const [name,...params]=row.slice(0,colon).split(';');
  return {name:name.toUpperCase(),params:Object.fromEntries(params.map(item=>{const i=item.indexOf('=');return i<0?[item.toUpperCase(),'']:[item.slice(0,i).toUpperCase(),item.slice(i+1).replace(/^"|"$/g,'')];})),value:row.slice(colon+1)};
 }).filter(Boolean));
}
function expandEvent(lines,defaultZone){
 const start=parseDate(readProperty(lines,'DTSTART'),defaultZone),end=parseDate(readProperty(lines,'DTEND'),defaultZone);
 if(!start||!end||start.allDay||end.allDay)return [];
 const title=textValue(readProperty(lines,'SUMMARY')?.value),room=textValue(readProperty(lines,'LOCATION')?.value);
 const description=textValue(readProperty(lines,'DESCRIPTION')?.value),category=textValue(readProperty(lines,'CATEGORIES')?.value);
 const uid=readProperty(lines,'UID')?.value||`${title}-${start.date}-${start.time}`;
 const recurrence=readProperty(lines,'RECURRENCE-ID');
 const rule=readProperty(lines,'RRULE')?.value;
 const exclusion=new Set(lines.filter(item=>item.name==='EXDATE').flatMap(item=>item.value.split(',').map(value=>dateOnly(value))));
 const duration=Math.round((new Date(end.iso)-new Date(start.iso))/60000);
 if(duration<=0||duration>24*60)return [];
 const base={uid,title,room,description,category,duration,recurrenceId:recurrence?.value||null};
 if(!rule){const position=displayPosition(start.date,start.time,start.zone,defaultZone);return position.start+duration<=1440?[{...base,...position,end:position.start+duration}]:[];}
 const parts=Object.fromEntries(rule.split(';').map(piece=>piece.split('=')));
 if(parts.FREQ!=='WEEKLY'){const position=displayPosition(start.date,start.time,start.zone,defaultZone);return position.start+duration<=1440?[{...base,...position,end:position.start+duration}]:[];}
 const interval=Math.max(1,Number(parts.INTERVAL)||1),byDays=(parts.BYDAY||Object.keys(dayIndex)[weekday(start.date)]).split(',').map(day=>dayIndex[day]).filter(day=>day!==undefined);
 const until=parts.UNTIL?.slice(0,8),last=until?dateOnly(until):addDays(start.date,365);
 const maxCount=Math.min(500,Number(parts.COUNT)||500);
 const result=[];
 for(let date=start.date;date<=last&&result.length<maxCount;date=addDays(date,1)){
  const weeks=Math.floor((Date.parse(monday(date)+'T12:00:00Z')-Date.parse(monday(start.date)+'T12:00:00Z'))/604800000);
  if(weeks%interval||!byDays.includes(weekday(date))||exclusion.has(date))continue;
  const position=displayPosition(date,start.time,start.zone,defaultZone);
  if(position.start+duration>1440)continue;
  result.push({...base,...position,end:position.start+duration,recurrenceId:date});
 }
 return result;
}
export function parseTimetableICS(text,{timeZone='Europe/Zurich'}={}){
 const raw=rawEvents(text);
 const cancellations=new Set(raw.filter(lines=>readProperty(lines,'STATUS')?.value?.toUpperCase()==='CANCELLED').map(lines=>`${readProperty(lines,'UID')?.value}:${dateOnly(readProperty(lines,'RECURRENCE-ID')?.value||readProperty(lines,'DTSTART')?.value||'')}`));
 const events=raw.filter(lines=>readProperty(lines,'STATUS')?.value?.toUpperCase()!=='CANCELLED').flatMap(lines=>expandEvent(lines,timeZone));
 const overrides=events.filter(item=>item.recurrenceId&&/^\d{8}T/.test(item.recurrenceId));
 const replaced=new Set(overrides.map(item=>`${item.uid}:${dateOnly(item.recurrenceId)}`));
 return events.filter(item=>!cancellations.has(`${item.uid}:${item.recurrenceId&&/^\d{8}T/.test(item.recurrenceId)?dateOnly(item.recurrenceId):item.recurrenceId||item.date}`))
  .filter(item=>!item.recurrenceId||/^\d{8}T/.test(item.recurrenceId)||!replaced.has(`${item.uid}:${item.recurrenceId}`))
  .map(item=>({...item,externalKey:`${item.uid}:${item.recurrenceId&&/^\d{8}T/.test(item.recurrenceId)?dateOnly(item.recurrenceId):item.date}`}));
}
export function classifyClass(event){
 const value=`${event.title} ${event.category}`.toLowerCase();
 if(/exercise|tutorial|übung|uebung|exercises/.test(value))return 'Exercise';
 if(/practical|lab|labor|workshop/.test(value))return 'Practical';
 if(/seminar/.test(value))return 'Seminar';
 return 'Lecture';
}
export function inferCourseName(event){
 const text=event.title.replace(/\b(lecture|exercise|tutorial|übung|uebung|practical|seminar|gruppe|group)\b.*$/i,'').trim();
 return text||event.title||'Untitled class';
}
export function timetablePreview(events,subjects=[]){
 const courses=new Map(),rows=[];
 for(const event of events){
  const code=(event.title+' '+event.description).match(/\b\d{3}-\d{4}-\d{2}[A-Z]\b/)?.[0]||'';
  const inferred=inferCourseName(event);
  const matched=subjects.filter(subject=>subject.code&&subject.code===code||[subject.name,subject.short,...(subject.aliases||[])].some(name=>name&&event.title.toLowerCase().includes(name.toLowerCase())));
  const subjectId=matched.length===1?matched[0].id:null;
  const courseKey=code||inferred.toLowerCase();
  if(!courses.has(courseKey))courses.set(courseKey,{key:courseKey,name:subjectId?matched[0].name:inferred,code,subjectId});
  rows.push({...event,courseKey,type:classifyClass(event),subjectId});
 }
 const conflicts=new Map();
 for(const row of rows.filter(item=>item.type==='Exercise')){
  const key=`${row.courseKey}:${weekday(row.date)}:${row.start}:${row.end}`;
  if(!conflicts.has(key))conflicts.set(key,{courseKey:row.courseKey,options:new Map()});
  const option=`${row.title}|${row.room}`;
  if(!conflicts.get(key).options.has(option))conflicts.get(key).options.set(option,[]);
  conflicts.get(key).options.get(option).push(row.externalKey);
 }
 const choices=[...conflicts].filter(([,group])=>group.options.size>1).map(([id,group])=>({id,courseKey:group.courseKey,options:[...group.options].map(([label,keys])=>({id:label,label:label.replace('|',' · ')||'Exercise group',keys}))}));
 return {courses:[...courses.values()],rows,choices};
}
export function mergeTimetable(state,preview,{subjectsByCourse={},groupChoices={}}={}){
 const selected=new Set(preview.rows.map(row=>row.externalKey));
 for(const choice of preview.choices){
  const all=choice.options.flatMap(option=>option.keys);
  all.forEach(key=>selected.delete(key));
  const picked=choice.options.find(option=>option.id===groupChoices[choice.id]);
  picked?.keys.forEach(key=>selected.add(key));
 }
 const subjects=[...(state.subjects||[])];
 const ids={};
 for(const course of preview.courses){
  if(subjectsByCourse[course.key]==='skip')continue;
  let id=subjectsByCourse[course.key]||course.subjectId;
  if(!id){id=globalThis.crypto?.randomUUID?.()||`subject-${subjects.length+1}`;subjects.push({id,name:course.name,short:course.name,color:['#77bbff','#b2a0ff','#70d6ad','#f39787','#cbdc7b'][subjects.length%5],code:course.code,aliases:[]});}
  ids[course.key]=id;
 }
 const existing=new Map((state.scheduleEvents||[]).map(item=>[item.externalKey,item]));
 const imported=preview.rows.filter(row=>selected.has(row.externalKey)&&ids[row.courseKey]).map(row=>{
  const old=existing.get(row.externalKey),id=old?.id||`import-${encodeURIComponent(row.externalKey)}`;
  return {...old,id,externalKey:row.externalKey,sourceId:'timetable',subject:ids[row.courseKey],date:row.date,start:row.start,end:row.end,type:row.type,room:row.room,title:row.title,active:true};
 });
 const deactivated=(state.scheduleEvents||[]).map(item=>item.sourceId==='timetable'&&!imported.some(next=>next.externalKey===item.externalKey)?{...item,active:false}:item);
 const untouched=deactivated.filter(item=>item.sourceId!=='timetable'||!imported.some(next=>next.externalKey===item.externalKey));
 const calendarSources=[...(state.calendarSources||[]).filter(item=>item.id!=='timetable'),{id:'timetable',label:'Timetable import',lastImported:new Date().toISOString(),subjectsByCourse:{...subjectsByCourse,...ids},groupChoices,pendingGroups:preview.choices.filter(choice=>!groupChoices[choice.id]||groupChoices[choice.id]==='none'),preview}];
 return {...state,subjects,scheduleEvents:[...untouched,...imported],calendarSources};
}
