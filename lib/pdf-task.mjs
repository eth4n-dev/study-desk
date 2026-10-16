import {wallToISO} from './calendar-import.mjs';

const months={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
const pad=value=>String(value).padStart(2,'0');
const canon=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const dateValue=value=>{
 let match=value.match(/\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/);
 if(match)return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
 match=value.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d\d)\b/);
 if(match)return `${match[3]}-${pad(match[2])}-${pad(match[1])}`;
 match=value.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?\s+(20\d\d)\b/i);
 if(match&&months[match[2].toLowerCase()])return `${match[3]}-${pad(months[match[2].toLowerCase()])}-${pad(match[1])}`;
 match=value.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d\d)\b/i);
 if(match&&months[match[1].toLowerCase()])return `${match[3]}-${pad(months[match[1].toLowerCase()])}-${pad(match[2])}`;
 return null;
};
function validDate(date){
 if(!date)return false;
 const [year,month,day]=date.split('-').map(Number);
 const parsed=new Date(Date.UTC(year,month-1,day));
 return parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===day;
}
export function inferPdfAssignment(filename,pageText,subjects=[],tasks=[],timeZone='Europe/Zurich'){
 const lines=String(pageText||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).slice(0,35);
 const stem=String(filename||'').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim();
 const titleLine=lines.find(line=>/^(?:assignment|sheet|serie|series|problem set|homework|exercise set|blatt|aufgabe)\s*#?\s*\d{1,3}(?:\s*[:.\-–—]\s*.+)?$/i.test(line));
 const title=titleLine||stem;
 const searchText=canon([stem,...lines.slice(0,12)].join(' '));
 const hits=subjects.filter(subject=>[subject.name,subject.short,subject.code,...(subject.aliases||[])].filter(Boolean).some(alias=>{
  const name=canon(alias);return name.length>=3&&(` ${searchText} `).includes(` ${name} `);
 }));
 const subjectId=hits.length===1?hits[0].id:null;
 const dueLine=lines.find(line=>/^(?:due(?:\s+(?:by|date))?|deadline|submission(?:\s+deadline)?|abgabe(?:\s+bis)?|einreichung(?:\s+bis)?)\s*[:\-]?\s*/i.test(line));
 const rawDue=dueLine?.replace(/^(?:due(?:\s+(?:by|date))?|deadline|submission(?:\s+deadline)?|abgabe(?:\s+bis)?|einreichung(?:\s+bis)?)\s*[:\-]?\s*/i,'').trim()||'';
 const dueDate=dateValue(rawDue),timeMatch=rawDue.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
 const dueTime=timeMatch?`${pad(timeMatch[1])}:${timeMatch[2]}`:null;
 const due=validDate(dueDate)&&dueTime?wallToISO(`${dueDate}T${dueTime}:00`,timeZone):null;
 const role=/^(?:lecture|slides?|notes?|course material|script|theory|vorlesung|folien|skript)\b/i.test(title)?'theory':dueLine||/^(?:assignment|sheet|serie|series|problem set|homework|exercise set|blatt|aufgabe)\b/i.test(title)?'assignment':null;
 const numbered=title.match(/\b(?:assignment|sheet|serie|series|problem set|homework|blatt)\s*#?\s*0*(\d{1,3})\b/i);
 const matches=subjectId?tasks.filter(task=>task.subject===subjectId&&(canon(task.title)===canon(title)||numbered&&Number((task.title.match(/\b(?:assignment|sheet|serie|series|problem set|homework|blatt)\s*#?\s*0*(\d{1,3})\b/i)||[])[1])===Number(numbered[1]))).filter(task=>!due||!task.due||Math.abs(new Date(task.due)-new Date(due))<30*86400000):[];
 return {title,subjectId,due,dueDate:validDate(dueDate)?dueDate:null,dueTime,role,taskId:matches.length===1?matches[0].id:null,evidence:{title:titleLine?'First-page title':'Filename',subject:subjectId?'Subject name or code':'Not found',due:dueLine||'Not found'}};
}
