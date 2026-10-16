'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Download,File,FileText,Maximize2,Minimize2,X} from 'lucide-react';

const IMAGE_TYPES={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',bmp:'image/bmp'};
const TEXT_EXTENSIONS=new Set(['txt','md','csv','tsv','json','xml','html','css','js','ts','py','c','h','cpp','java','tex','log']);

function previewType(meta,blob){
 const extension=meta.name.split('.').at(-1)?.toLowerCase();
 const mime=(meta.type||blob.type||'').toLowerCase();
 if(IMAGE_TYPES[extension]||mime.startsWith('image/')&&mime!=='image/svg+xml')return {kind:'image',mime:IMAGE_TYPES[extension]||mime};
 if(TEXT_EXTENSIONS.has(extension)||mime.startsWith('text/'))return {kind:'text'};
 if(mime.startsWith('audio/'))return {kind:'audio',mime};
 if(mime.startsWith('video/'))return {kind:'video',mime};
 return {kind:'unsupported'};
}

export default function FilePreviewDialog({file,onClose,onDownload,loadFile,cloud=false}){
 const dialog=useRef(null),titleId=useId();
 const [preview,setPreview]=useState({kind:'loading'});
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{
  const previous=document.activeElement,node=dialog.current;
  node?.showModal();
  return()=>{node?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 useEffect(()=>{
  let active=true,url;
  setPreview({kind:'loading'});
  (async()=>{
   try{
    const blob=await loadFile(file.id);
    if(!active)return;
    if(!blob)throw new Error('This file is missing. Please upload it again.');
    const type=previewType(file,blob);
    if(type.kind==='text'){
     if(blob.size>2*1024*1024){if(active)setPreview({kind:'unsupported',reason:'This text file is too large to preview here.'});return;}
     const content=await blob.text();
     if(active)setPreview({kind:'text',content});
    }else if(type.kind==='unsupported'){
     if(active)setPreview(type);
    }else{
     url=URL.createObjectURL(blob.type===type.mime?blob:new Blob([blob],{type:type.mime}));
     if(active)setPreview({kind:type.kind,url});
    }
   }catch(error){if(active)setPreview({kind:'error',message:error.message||'This file could not be opened.'});}
  })();
  return()=>{active=false;if(url)URL.revokeObjectURL(url);};
 },[file.id,loadFile]);
 return <dialog ref={dialog} className={`file-preview-dialog${expanded?' is-expanded':''}`} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(expanded)setExpanded(false);else onClose();}} onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
  <header className="file-preview-header"><File size={18}/><div><h2 id={titleId}>{file.name}</h2><span>{cloud?'Saved privately':'Saved in this browser'}</span></div><button className="icon-button" type="button" onClick={()=>setExpanded(value=>!value)} aria-label={expanded?'Restore preview size':'Expand preview to fill page'} title={expanded?'Restore preview size':'Expand preview to fill page'}>{expanded?<Minimize2 size={19}/>:<Maximize2 size={19}/>}</button><button className="icon-button" type="button" onClick={onClose} aria-label="Close file"><X size={19}/></button></header>
  <div className={`file-preview-content is-${preview.kind}`}>
   {preview.kind==='loading'&&<p className="file-preview-message" role="status">Opening file…</p>}
   {preview.kind==='image'&&<img src={preview.url} alt={file.name}/>}
   {preview.kind==='text'&&<pre>{preview.content}</pre>}
   {preview.kind==='audio'&&<audio src={preview.url} controls aria-label={file.name}/>}
   {preview.kind==='video'&&<video src={preview.url} controls aria-label={file.name}/>}
   {preview.kind==='unsupported'&&<div className="file-preview-empty"><FileText size={28}/><p>{preview.reason||'This file type cannot be previewed here.'}</p><span>Download it to open it in another app.</span></div>}
   {preview.kind==='error'&&<div className="file-preview-empty" role="alert"><FileText size={28}/><p>{preview.message}</p></div>}
  </div>
  <footer className="file-preview-footer"><button className="text-button quiet" type="button" onClick={()=>onDownload(file)}><Download size={15}/>Download</button><button className="button" type="button" onClick={onClose}>Close</button></footer>
 </dialog>;
}
