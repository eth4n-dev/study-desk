import {openDB} from './storage.mjs';

const stateKey='admin-sandbox';
const fileKey=id=>`sandbox:${id}`;

export async function readSandboxState(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction('state').objectStore('state').get(stateKey);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function writeSandboxState(state){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,stateKey);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
export async function putSandboxFiles(files){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('files','readwrite');for(const f of files)tx.objectStore('files').put(f.blob,fileKey(f.id));tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
export async function readSandboxFile(id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction('files').objectStore('files').get(fileKey(id));r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function deleteSandboxFile(id,state){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(['state','files'],'readwrite');tx.objectStore('files').delete(fileKey(id));tx.objectStore('state').put(state,stateKey);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
export async function restoreSandboxBackup(state,files){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(['state','files'],'readwrite');tx.objectStore('state').put(state,stateKey);for(const f of files)tx.objectStore('files').put(f.blob,fileKey(f.id));tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
export async function resetSandbox(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(['state','files'],'readwrite');tx.objectStore('state').delete(stateKey);const cursorRequest=tx.objectStore('files').openKeyCursor();cursorRequest.onsuccess=()=>{const cursor=cursorRequest.result;if(!cursor)return;if(typeof cursor.key==='string'&&cursor.key.startsWith('sandbox:'))cursor.delete();cursor.continue();};tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
