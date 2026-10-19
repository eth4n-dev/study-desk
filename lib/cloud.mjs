import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
export const cloudConfigured=Boolean(url&&key);
export const localDemo=process.env.NODE_ENV==='development'&&!cloudConfigured;
export const FILE_BUCKET='study-files';

let client;
export function cloudClient(){
 if(!cloudConfigured)return null;
 if(!client)client=createClient(url,key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true,experimental:{passkey:true}}});
 return client;
}

export async function readCloudDocument(api){
 const {data,error}=await api.from('study_documents').select('state,revision').maybeSingle();
 if(error)throw error;
 return data;
}

export async function saveCloudDocument(api,expectedRevision,state){
 const {data,error}=await api.rpc('save_study_document',{p_expected_revision:expectedRevision,p_state:state});
 if(error){
  if(error.message?.includes('STUDY_CONFLICT'))throw new Error('Another device changed this workspace. Your changes are still on this screen. Export them before reloading.');
  throw error;
 }
 if(!Number.isSafeInteger(Number(data)))throw new Error('The cloud did not confirm this save.');
 return Number(data);
}

export function cloudFilePath(userId,fileId){
 if(!/^[0-9a-f-]{36}$/i.test(userId)||!/^[0-9a-f-]{36}$/i.test(fileId))throw new Error('Invalid file identity.');
 return `${userId}/${fileId}`;
}

export async function uploadCloudFile(api,userId,fileId,blob){
 const {error}=await api.storage.from(FILE_BUCKET).upload(cloudFilePath(userId,fileId),blob,{contentType:blob.type||'application/octet-stream',upsert:true});
 if(error)throw error;
}

export async function readCloudFile(api,userId,fileId){
 const {data,error}=await api.storage.from(FILE_BUCKET).download(cloudFilePath(userId,fileId));
 if(error)throw error;
 return data;
}

export async function deleteCloudFile(api,userId,fileId){
 const {error}=await api.storage.from(FILE_BUCKET).remove([cloudFilePath(userId,fileId)]);
 if(error){
  if(String(error.statusCode)==='403'||/permission|policy|unauthorized|not allowed/i.test(error.message||''))throw new Error('File deletion is not enabled for this workspace yet. Ask its owner to update storage permissions.');
  throw error;
 }
}
