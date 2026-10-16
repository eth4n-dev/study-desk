import {SUBJECTS,taskType} from './model.mjs';

const canonical=value=>String(value||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const extraAliases=[{id:'theory',alias:'ti'},{id:'theory',alias:'tcs'},{id:'numerical',alias:'numcs'}];

function family(title){
 const match=String(title||'').trim().match(/^([^\d]{3,}?)(\s*)(\d{1,3})(?!\d)/u);
 if(!match)return null;
 const prefix=match[1].trim();
 if(prefix.length<3)return null;
 return `${canonical(prefix)}${match[2]?' ':''}`;
}

function explicitSubject(title,subjects=SUBJECTS){
 const text=canonical(title);
 const aliases=[...subjects.flatMap(item=>[item.short,item.name,item.id,item.code,...(item.aliases||[])].filter(Boolean).map(alias=>({id:item.id,alias:canonical(alias)}))),...extraAliases.filter(item=>subjects.some(subject=>subject.id===item.id))];
 const hits=new Set(aliases.filter(({alias})=>new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}($|[^a-z0-9])`,'u').test(text)).map(item=>item.id));
 return hits.size===1?[...hits][0]:null;
}

export function suggestTaskDetails(title,tasks=[],subjects=SUBJECTS){
 const explicit=explicitSubject(title,subjects);
 const key=family(title);
 const examples=key?tasks.filter(task=>family(task.title)===key):[];
 const exampleSubjects=new Set(examples.map(task=>task.subject));
 const matched=explicit?examples.filter(task=>task.subject===explicit):examples;
 const subject=explicit||(exampleSubjects.size===1?[...exampleSubjects][0]:null);
 if(!subject)return null;
 const kinds=new Set(matched.map(task=>taskType(task)));
 return {subject,kind:kinds.size===1?[...kinds][0]:'file',reason:explicit?'Subject named in title':`Like ${matched[0].title}`};
}

export function suggestFileTask(filename,tasks=[],pageText='',subjects=SUBJECTS){
 const stem=String(filename||'').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim();
 const named=suggestTaskDetails(stem,tasks,subjects),contentSubject=explicitSubject(pageText,subjects);
 if(named?.subject&&contentSubject&&named.subject!==contentSubject)return null;
 const subject=named?.subject||contentSubject;
 if(!subject)return null;
 const normalized=(stem+' '+pageText).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const matches=tasks.filter(task=>task.subject===subject).filter(task=>{
  const title=task.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  return title.length>=5&&new RegExp(`(^| )${escapeRegex(title)}($| )`,'u').test(normalized);
 });
 if(matches.length===1)return {subject,taskId:matches[0].id,reason:`Matches ${matches[0].title}`};
 const aliases=[...subjects.filter(item=>item.id===subject).flatMap(item=>[item.short,item.name,item.id,item.code,...(item.aliases||[])]),...extraAliases.filter(item=>item.id===subject).map(item=>item.alias)].filter(Boolean);
 let stripped=stem;
 for(const alias of aliases){const pattern=new RegExp(`^${escapeRegex(alias)}(?:\\s*[-:–—]\\s*|\\s+)`,'iu');stripped=stripped.replace(pattern,'');}
 const key=family(stripped),number=stripped.match(/\d{1,3}/)?.[0];
 const candidates=key&&number?tasks.filter(task=>task.subject===subject&&family(task.title)===key&&Number(task.title.match(/\d{1,3}/)?.[0])===Number(number)):[];
 return candidates.length===1?{subject,taskId:candidates[0].id,reason:`Matches ${candidates[0].title}`}:{subject,taskId:null,reason:named?.reason||'Subject found in PDF'};
}
