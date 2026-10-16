import {todayKey,wallTime,zurichISO} from './model.mjs';

export function changeTaskStatus(state,id,status,at=new Date().toISOString(),eventId=globalThis.crypto?.randomUUID?.()){
 const task=state.tasks.find(item=>item.id===id);
 if(!task||task.status===status)return state;
 // Status corrections undo milestones that no longer happened. One assignment
 // has at most one start and one finish; moving it between states must not
 // manufacture extra study events or leave a completed event on an open task.
 const kept=(state.taskEvents||[]).filter(event=>event.taskId!==id||(
  status==='Done'||status==='In progress'&&event.type==='started'
 ));
 const type=status==='In progress'?'started':status==='Done'?'finished':null;
 const hasEvent=type&&kept.some(event=>event.taskId===id&&event.type===type);
 const event=type&&!hasEvent?{id:eventId||`${id}-${at}-${type}`,taskId:id,type,at,date:todayKey(new Date(at)),subject:task.subject,title:task.title}:null;
 return {...state,tasks:state.tasks.map(item=>item.id===id?{...item,status}:item),taskEvents:event?[...kept,event]:kept};
}

export function savePracticeEvent(state,{id,type,at,revisionId,eventId,activityId}){
 if(!['russian','revised','activity'].includes(type))throw new Error('Choose an activity or a lecture to revisit.');
 if(!Number.isFinite(+new Date(at)))throw new Error('Choose a valid date and time.');
 const logs=state.logs||[];
 const existing=id?logs.find(log=>log.id===id&&log.kind===type):null;
 if(id&&!existing)throw new Error('This study entry could not be found. Reload and try again.');
 const revision=type==='revised'&&!existing?(state.revisions||[]).find(item=>item.id===revisionId):null;
 if(type==='revised'&&!existing&&!revision)throw new Error('Choose a lecture from To revisit.');
 const activity=type==='activity'?(state.activityTypes||[]).find(item=>item.id===(existing?.activityId||activityId)):null;
 if(type==='activity'&&!activity)throw new Error('Choose an activity.');
 const entry={...(existing||{}),id:id||eventId||globalThis.crypto?.randomUUID?.()||`${type}-${at}`,kind:type,subject:existing?.subject??revision?.subject??activity?.subject??(type==='russian'?'russian':null),lecture:existing?.lecture||revision?.lecture||null,label:existing?.label||revision?.label||activity?.label||'Russian practice',activityId:existing?.activityId||activity?.id||null,date:todayKey(new Date(at)),at,minutes:null};
 return {...state,logs:id?logs.map(log=>log.id===id?entry:log):[entry,...logs],revisions:revision?(state.revisions||[]).filter(item=>item.id!==revision.id):state.revisions};
}

export function activityEntries(state){
 return [...(state.taskEvents||[]),...(state.logs||[]).map(log=>({...log,type:log.kind==='russian'?'russian':log.kind==='activity'?'activity':'revised',title:log.label||'Revision',at:log.at||null}))]
  .filter(entry=>entry.date||entry.at)
  .map(entry=>({...entry,date:entry.date||todayKey(new Date(entry.at))}))
  .sort((a,b)=>(b.at||`${b.date}T00:00:00`).localeCompare(a.at||`${a.date}T00:00:00`));
}

export function activityTimestamp(date,time,now=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw new Error('Choose a date and time.');
 const iso=zurichISO(`${date}T${time}`);
 if(wallTime(iso)!==`${date}T${time}`)throw new Error('That local date or time does not exist. Choose another time.');
 if(new Date(iso)>now)throw new Error('Study activity cannot be logged in the future.');
 return iso;
}

export function saveTaskEvent(state,{id,taskId,type,at,eventId}){
 const task=state.tasks.find(item=>item.id===taskId);
 if(!task)throw new Error('Choose an assignment.');
 if(!['started','finished'].includes(type))throw new Error('Choose Started or Finished.');
 if(!Number.isFinite(+new Date(at)))throw new Error('Choose a valid date and time.');
 const events=state.taskEvents||[];
 const existing=id?events.find(event=>event.id===id&&event.taskId===taskId&&event.type===type):null;
 if(id&&!existing)throw new Error('This study entry could not be found. Reload and try again.');
 if(!id&&events.some(event=>event.taskId===taskId&&event.type===type))throw new Error(`A ${type==='started'?'start':'finish'} time is already logged. Edit that entry instead.`);
 const counterpart=events.find(event=>event.taskId===taskId&&event.type===(type==='started'?'finished':'started'));
 if(counterpart&&((type==='started'&&new Date(at)>=new Date(counterpart.at))||(type==='finished'&&new Date(at)<=new Date(counterpart.at))))throw new Error(type==='started'?'Start must be before the recorded finish.':'Finish must be after the recorded start.');
 const event={id:id||eventId||globalThis.crypto?.randomUUID?.()||`${taskId}-${type}-${at}`,taskId,type,at,date:todayKey(new Date(at)),subject:task.subject,title:task.title};
 const taskEvents=id?events.map(item=>item.id===id?event:item):[...events,event];
 const status=type==='finished'?'Done':task.status==='Not started'?'In progress':task.status;
 return {...state,taskEvents,tasks:state.tasks.map(item=>item.id===taskId?{...item,status}:item)};
}

export function activitySummary(entries,month){
 const current=entries.filter(entry=>entry.date.startsWith(month));
 return {activeDays:new Set(current.map(entry=>entry.date)).size,started:current.filter(entry=>entry.type==='started').length,finished:current.filter(entry=>entry.type==='finished').length,russian:current.filter(entry=>entry.type==='russian'||entry.activityId==='russian-practice').length,revisited:current.filter(entry=>entry.type==='revised').length,activities:Object.fromEntries([...new Set(current.map(entry=>entry.activityId).filter(Boolean))].map(id=>[id,current.filter(entry=>entry.activityId===id).length]))};
}
