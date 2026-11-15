// Drive access tokens are memory-only and are cleared on account changes.
let accessToken='',expiresAt=0;
export function clearDrive(){accessToken='';expiresAt=0;}
function script(src:string){return new Promise<void>((resolve,reject)=>{const existing=document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);if(existing?.dataset.loaded==='true'){resolve();return;}const tag=existing||document.createElement('script');tag.src=src;tag.onload=()=>{tag.dataset.loaded='true';resolve();};tag.onerror=()=>reject(new Error('Google authorization scripts could not load.'));if(!existing)document.head.append(tag);});}
// Google SDKs are loaded by their official browser scripts.
declare global {interface Window {google:any;gapi:any;}}
export async function connectDrive(){
 if(!import.meta.env.VITE_GOOGLE_CLIENT_ID)throw new Error('Set VITE_GOOGLE_CLIENT_ID. Enable Drive API and consent for drive.file in Google Cloud.');
 await script('https://accounts.google.com/gsi/client');
 await new Promise<void>((resolve,reject)=>{const client=window.google.accounts.oauth2.initTokenClient({client_id:import.meta.env.VITE_GOOGLE_CLIENT_ID,scope:'https://www.googleapis.com/auth/drive.file',callback:(result:{error?:string;access_token:string;expires_in:number})=>{if(result.error){reject(new Error(result.error));return;}accessToken=result.access_token;expiresAt=Date.now()+(Number(result.expires_in)-60)*1000;resolve();},error_callback:()=>reject(new Error('Google authorization was cancelled or blocked.'))});client.requestAccessToken({prompt:'select_account'});});
}
async function drive(url:string,init:RequestInit={}){if(!accessToken||Date.now()>=expiresAt)throw new Error('Reconnect Google Drive using the Connect Drive button.');const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${accessToken}`);const r=await fetch(url,{...init,headers});if(r.status===401){clearDrive();throw new Error('Drive authorization expired. Reconnect Google Drive.');}if(r.status===403||r.status===404)throw new Error('Drive file was deleted, belongs to another Google account, or is inaccessible. Reconnect the original account.');if(!r.ok)throw new Error(`Google Drive request failed (${r.status}).`);return r;}
export async function driveFile(id:string){return drive(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`);}
export async function uploadDrive(file:File){if(!file.name.toLowerCase().endsWith('.epub')||file.size>50*1024*1024)throw new Error('Choose an EPUB under 50 MB.');const body=new FormData();body.append('metadata',new Blob([JSON.stringify({name:file.name,mimeType:'application/epub+zip'})],{type:'application/json'}));body.append('file',file);const response=await drive('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{method:'POST',body});return response.json() as Promise<{id:string;name:string}>;}
export async function pickDrive():Promise<{id:string;name:string}|null>{
 if(!accessToken||Date.now()>=expiresAt)throw new Error('Connect Google Drive first.');
 if(!import.meta.env.VITE_GOOGLE_API_KEY||!import.meta.env.VITE_GOOGLE_APP_ID)throw new Error('Set VITE_GOOGLE_API_KEY and VITE_GOOGLE_APP_ID (Google project number), and enable Google Picker API.');
 await script('https://apis.google.com/js/api.js');await new Promise<void>((resolve,reject)=>window.gapi.load('picker',{callback:resolve,onerror:()=>reject(new Error('Picker failed to load.'))}));
 return new Promise(resolve=>{const picker=new window.google.picker.PickerBuilder().addView(new window.google.picker.DocsView().setMimeTypes('application/epub+zip')).setOAuthToken(accessToken).setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY).setAppId(import.meta.env.VITE_GOOGLE_APP_ID).setOrigin(location.origin).setCallback((data:{action:string;docs:{id:string;name:string}[]})=>{if(data.action==='picked')resolve(data.docs[0]);else if(data.action==='cancel')resolve(null);}).build();picker.setVisible(true);});
}
