import { database } from './supabase';

export async function identity() {
  const {data:{user},error}=await database().auth.getUser();
  if(error) throw error;
  if(!user) throw new Error('Sign in to save your reading.');
  return user.id;
}
export async function shelfFor(bookId:string, personal=false) {
  const user_id=await identity();
  const key=personal ? 'personal_book_id' : 'book_id';
  const db=database();
  const {error}=await db.from('bookshelf').upsert({user_id,[key]:bookId},{onConflict:`user_id,${key}`,ignoreDuplicates:true});
  if(error) throw error;
  const result=await db.from('bookshelf').select('id,user_id').eq('user_id',user_id).eq(key,bookId).single();
  if(result.error) throw result.error;
  return result.data;
}
export async function storageRequest(path:string,init:RequestInit={}) {
  const base=import.meta.env.VITE_STORAGE_API_URL;
  if(!base) throw new Error('Storage API is not configured. Set VITE_STORAGE_API_URL after deploying the R2 Worker.');
  const {data:{session}}=await database().auth.getSession();
  const headers=new Headers(init.headers);
  if(session) headers.set('Authorization',`Bearer ${session.access_token}`);
  const response=await fetch(`${base}${path}`,{...init,headers});
  if(!response.ok) throw new Error((await response.text()).slice(0,300) || `Storage error ${response.status}`);
  return response;
}
