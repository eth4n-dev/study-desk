export const FILE_SORT_MODES=['newest','oldest','custom'];

const timestamp=file=>Date.parse(file.added||'')||0;

export function sortedFiles(files,preference={}){
 const mode=FILE_SORT_MODES.includes(preference.mode)?preference.mode:'newest';
 const order=new Map((preference.order||[]).map((id,index)=>[id,index]));
 return [...files].sort((a,b)=>{
  if(mode==='custom'){
   const aIndex=order.get(a.id),bIndex=order.get(b.id);
   if(aIndex!==undefined&&bIndex!==undefined)return aIndex-bIndex;
   if(aIndex!==undefined)return -1;
   if(bIndex!==undefined)return 1;
  }
  return (mode==='oldest'?timestamp(a)-timestamp(b):timestamp(b)-timestamp(a))||a.id.localeCompare(b.id);
 });
}

export function moveFileInOrder(order,sourceId,targetId){
 const next=[...order],from=next.indexOf(sourceId),to=next.indexOf(targetId);
 if(from<0||to<0||from===to)return next;
 next.splice(from,1);
 next.splice(to,0,sourceId);
 return next;
}
