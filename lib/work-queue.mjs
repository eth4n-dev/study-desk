export function groupWork(tasks,now=new Date()){
 const active=tasks.filter(task=>task.status!=='Done');
 const byDeadline=(a,b)=>new Date(a.due||'2099-01-01')-new Date(b.due||'2099-01-01');
 const olderThanWeek=new Date(now.getTime()-7*86400000);
 return {
  inProgress:active.filter(task=>task.status==='In progress').sort(byDeadline),
  upcoming:active.filter(task=>task.status!=='In progress'&&(!task.due||new Date(task.due)>=olderThanWeek)).sort(byDeadline),
  overdue:active.filter(task=>task.status!=='In progress'&&task.due&&new Date(task.due)<olderThanWeek).sort((a,b)=>new Date(b.due)-new Date(a.due)),
 };
}
