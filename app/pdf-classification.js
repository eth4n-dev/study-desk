export async function firstPageText(file){
 if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf')return '';
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
 const loading=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true});
 try{
  const document=await loading.promise;
  const page=await document.getPage(1);
  const content=await page.getTextContent();
  return content.items.map(item=>(item.str||'')+(item.hasEOL?'\n':'')).join('').slice(0,5000);
 }finally{await loading.destroy();}
}
