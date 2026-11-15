import ePub from 'epubjs';
import { BookOpen } from 'lucide-react';
import type { Book } from '../../types';
import {connectDrive,pickDrive,uploadDrive} from '../../lib/drive';
import {identity,shelfFor} from '../../lib/reading';
import {useEffect,useState} from 'react';
import {database} from '../../lib/supabase';
import {useReading} from '../../context/ReadingContext';
import {userError} from '../../lib/user-error';
import {BookCard} from '../common/BookCard';
export function MyShelfView(){
 const {books,isAuthenticated,authLoading,openAuthModal,openReader}=useReading();
 const [entries,setEntries]=useState<{book_id:string;reading_progress:{percentage:number}|null}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [personal,setPersonal]=useState<{id:string;title:string;author:string;drive_file_id:string}[]>([]),[busy,setBusy]=useState(false);
 const loadPersonal=async()=>{const {data,error}=await database().from('personal_books').select('*');if(error)throw error;setPersonal(data||[]);};
 useEffect(()=>{if(isAuthenticated)void loadPersonal().catch(e=>setError(userError(e,'Your Drive books couldn’t be loaded. Try again.')));},[isAuthenticated]);
 const task=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action();}catch(e){setError(userError(e));}finally{setBusy(false);}};
 const remember=async(file:{id:string;name:string})=>{const user_id=await identity();const result=await database().from('personal_books').upsert({user_id,drive_file_id:file.id,title:file.name.replace(/\.epub$/i,'')},{onConflict:'user_id,drive_file_id'}).select().single();if(result.error)throw result.error;await shelfFor(result.data.id,true);await loadPersonal();};
 useEffect(()=>{let alive=true;if(!isAuthenticated)return;void(async()=>{const [shelf,progress]=await Promise.all([database().from('bookshelf').select('id,book_id'),database().from('reading_progress').select('shelf_id,percentage')]);if(!alive)return;const error=shelf.error||progress.error;if(error)setError(userError(error,'Your shelf couldn’t be loaded. Try again.'));else setEntries((shelf.data||[]).map(row=>({book_id:row.book_id,reading_progress:(progress.data||[]).find(p=>p.shelf_id===row.id)||null})));setLoading(false);})();return()=>{alive=false;};},[isAuthenticated]);
 return <div className="shelf-screen">
  <span className="eyebrow"><span className="little-dot"/>YOUR PERSONAL LIBRARY</span>
  <h1>My Shelf</h1>
  <p>Your saved books and reading positions, ready when you are.</p>
  {authLoading ? <p role="status">Checking your shelf…</p> : !isAuthenticated ? <div className="empty-state"><BookCardIcon/><h3>Your reading life, in one place.</h3><p>Sign in to keep your shelf and reading progress with you.</p><button className="os-button os-button-primary" onClick={openAuthModal}>Sign in to your shelf</button></div> : <>
   {loading&&<p role="status">Loading your shelf…</p>}{error&&<p role="alert" className="app-inline-alert">{error}</p>}
   {entries.length>0&&<div className="library-section"><div className="section-heading"><div><h2>Saved books</h2></div><span className="quiet-count">{entries.length} {entries.length===1?'book':'books'}</span></div><div className="book-grid">{entries.map(entry=>{const book=books.find(b=>b.id===entry.book_id);return book?<BookCard key={book.id} book={{...book,progressPercent:Math.round(entry.reading_progress?.percentage||0)}} showProgress/>:null;})}</div></div>}
   {!loading&&!entries.length&&<div className="empty-state"><BookCardIcon/><h3>A shelf with room for a story.</h3><p>Save a book from Explore and it will be waiting here, along with your reading progress.</p></div>}
  </>}
  <section className="drive-library"><span className="eyebrow">YOUR FILES, YOUR DRIVE</span><h2 className="font-reading text-xl">Personal Google Drive library</h2><p>Connect your own Google Drive. EPUB files stay in Drive; OpenShelf saves a reference so you can read them here.</p>
   <div className="flex flex-wrap gap-3 mt-4"><button disabled={busy||!isAuthenticated} className="os-button" onClick={()=>void task(connectDrive)}>Connect Drive</button><button disabled={busy||!isAuthenticated} className="os-button" onClick={()=>void task(async()=>{const file=await pickDrive();if(file)await remember(file);})}>Select EPUB from Drive</button><label className="os-button">Upload EPUB to Drive<input disabled={busy||!isAuthenticated} type="file" accept=".epub" onChange={e=>{const file=e.target.files?.[0];if(!file)return;void task(async()=>{const parsed=ePub();try{await parsed.open(await file.arrayBuffer(),'binary');await parsed.ready;}finally{parsed.destroy();}await remember(await uploadDrive(file));});e.target.value='';}}/></label></div>
   <div className="space-y-3 mt-5">{(isAuthenticated?personal:[]).map(p=><div key={p.id} className="p-4 border rounded-xl"><h3 className="font-reading">{p.title}</h3><button onClick={()=>openReader({id:p.id,title:p.title,author:p.author,driveFileId:p.drive_file_id,isPersonalUpload:true} as Book)}>Open EPUB</button><button className="ml-4" onClick={()=>void task(async()=>{const {error}=await database().from('personal_books').delete().eq('id',p.id);if(error)throw error;await loadPersonal();})}>Remove reference</button></div>)}</div>
  </section>
 </div>;
}

function BookCardIcon(){return <BookOpen size={34} strokeWidth={1.2} aria-hidden="true"/>;}
