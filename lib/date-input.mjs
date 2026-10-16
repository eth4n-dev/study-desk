export function displayDate(day){
 if(!day)return '';
 const [year,month,date]=day.slice(0,10).split('-');
 return `${date}/${month}/${year.slice(-2)}`;
}
export function parseDisplayDate(text){
 const match=String(text).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
 if(!match)return null;
 const day=Number(match[1]),month=Number(match[2]),year=Number(match[3])+(match[3].length===2?2000:0);
 if(year<1900||year>2099)return null;
 const candidate=new Date(Date.UTC(year,month-1,day,12));
 return candidate.getUTCFullYear()===year&&candidate.getUTCMonth()===month-1&&candidate.getUTCDate()===day?candidate.toISOString().slice(0,10):null;
}
export function normalizeTime(text){
 const match=String(text).trim().match(/^(\d{1,2}):?(\d{2})$/);
 if(!match||Number(match[1])>23||Number(match[2])>59)return null;
 return `${match[1].padStart(2,'0')}:${match[2]}`;
}
