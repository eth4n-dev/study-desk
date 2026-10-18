import {addDays,monday} from './model.mjs';
export const SESSION_START=7*60,SESSION_END=22*60,SESSION_STEP=15;
export function selectSessionRange(anchor,position){
 const first=Math.max(SESSION_START,Math.min(SESSION_END-SESSION_STEP,Math.floor(anchor/SESSION_STEP)*SESSION_STEP));
 const last=Math.max(SESSION_START,Math.min(SESSION_END-SESSION_STEP,Math.floor(position/SESSION_STEP)*SESSION_STEP));
 return {start:Math.min(first,last),end:Math.max(first,last)+SESSION_STEP};
}
export function sessionRecord(form,id){
 if(!form.subject)throw new Error('Choose a subject first.');
 if(!Number.isFinite(form.start)||!Number.isFinite(form.end)||form.start<0||form.start>=1440||form.end>1440||form.end<=form.start)throw new Error('Enter an end time after the start time.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(form.date)||Number.isNaN(Date.parse(form.date+'T12:00Z')))throw new Error('Choose a day in the timetable.');
 const common={...form.original,id,subject:form.subject,start:form.start,end:form.end,type:form.type,room:form.room.trim(),active:true};
 // A converted session must not retain fields from its previous recurrence mode.
 delete common.date;
 if(form.repeat==='once')return {value:{...common,date:form.date},mode:'once'};
 if(!form.startDate||!form.endDate||form.endDate<form.startDate)throw new Error('The last date must be on or after the first date.');
 const weekday=(new Date(form.date+'T12:00Z').getUTCDay()+6)%7;
 const firstDate=addDays(monday(form.startDate),weekday);
 if((firstDate<form.startDate?addDays(firstDate,7):firstDate)>form.endDate)throw new Error('The date range does not include this weekday.');
 return {value:{...common,weekday,everyWeeks:Number(form.repeat),anchorWeek:form.original&&form.original.startDate===form.startDate&&form.original.everyWeeks===Number(form.repeat)?form.original.anchorWeek||form.startDate:form.original&&form.original.everyWeeks!==Number(form.repeat)?form.date:form.startDate,startDate:form.startDate,endDate:form.endDate},mode:'repeat'};
}
