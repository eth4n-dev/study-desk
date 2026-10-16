const pages=new Set(['home','plan','activity','stats','subject','tasks','files','settings']);

export function readRoute(hash,subjectIds){
 const [pagePart,subjectPart]=(hash||'').replace(/^#/,'').split('/');
 const validPage=pages.has(pagePart)?pagePart:'home';
 const page=validPage==='subject'&&!subjectIds.includes(subjectPart)?'home':validPage;
 const subject=['subject','files','tasks'].includes(page)&&subjectIds.includes(subjectPart)?subjectPart:'all';
 return {page,subject};
}

export function routeHash(page,subject='all'){
 if(!pages.has(page)||page==='home')return '';
 return `#${page}${['subject','files','tasks'].includes(page)&&subject!=='all'?`/${subject}`:''}`;
}
