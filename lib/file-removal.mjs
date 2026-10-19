export function withoutFile(state,fileId){
 return {...state,
  files:state.files.filter(file=>file.id!==fileId),
  tasks:state.tasks.map(task=>({...task,files:(task.files||[]).filter(id=>id!==fileId)}))
 };
}
