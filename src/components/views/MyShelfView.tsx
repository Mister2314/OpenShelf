import ePub from 'epubjs';
import { BookOpen, Check, Cloud, HardDriveUpload } from 'lucide-react';
import type { Book } from '../../types';
import {connectDrive,isDriveConnected,isDrivePickerConfigured,pickDrive,uploadDrive} from '../../lib/drive';
import {identity,shelfFor} from '../../lib/reading';
import {useEffect,useState} from 'react';
import {database} from '../../lib/supabase';
import {useReading} from '../../context/ReadingContext';
import {userError} from '../../lib/user-error';
import {BookCard} from '../common/BookCard';
export function MyShelfView(){
 const {books,isAuthenticated,authLoading,openAuthModal,openReader}=useReading();
 const [entries,setEntries]=useState<{book_id:string;reading_progress:{percentage:number}|null}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [personal,setPersonal]=useState<{id:string;title:string;author:string;drive_file_id:string}[]>([]),[busy,setBusy]=useState(false),[driveConnected,setDriveConnected]=useState(isDriveConnected),[driveNotice,setDriveNotice]=useState('');
 const loadPersonal=async()=>{const {data,error}=await database().from('personal_books').select('*');if(error)throw error;setPersonal(data||[]);};
 useEffect(()=>{if(isAuthenticated)void loadPersonal().catch(e=>setError(userError(e,'Your Drive books couldn’t be loaded. Try again.')));},[isAuthenticated]);
 const task=async(action:()=>Promise<void>)=>{setBusy(true);setError('');setDriveNotice('');try{await action();}catch(e){setError(userError(e));}finally{setDriveConnected(isDriveConnected());setBusy(false);}};
 const remember=async(file:{id:string;name:string})=>{const user_id=await identity();const result=await database().from('personal_books').upsert({user_id,drive_file_id:file.id,title:file.name.replace(/\.epub$/i,'')},{onConflict:'user_id,drive_file_id'}).select().single();if(result.error)throw result.error;await shelfFor(result.data.id,true);await loadPersonal();};
 const chooseFromDrive=()=>void task(async()=>{if(!isDrivePickerConfigured())throw new Error('Google Drive file picker is not configured for this OpenShelf deployment.');if(!isDriveConnected()){await connectDrive();setDriveConnected(true);}setDriveNotice('Google Drive connected. Choose an EPUB to add it to your shelf.');const file=await pickDrive();if(file){await remember(file);setDriveNotice(`${file.name} was added to your shelf.`);}else setDriveNotice('Google Drive is connected. No file was selected.');});
 const uploadFromDevice=(file:File)=>void task(async()=>{const parsed=ePub();try{await parsed.open(await file.arrayBuffer(),'binary');await parsed.ready;}finally{parsed.destroy();}if(!isDriveConnected()){await connectDrive();setDriveConnected(true);}const uploaded=await uploadDrive(file);await remember(uploaded);setDriveNotice(`${uploaded.name} was uploaded to Google Drive and added to your shelf.`);});
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
  <section className="drive-library">
   <div className="drive-library-heading"><div><span className="eyebrow">ADD A BOOK</span><h2 className="font-reading">Bring your EPUBs to OpenShelf.</h2><p>Choose an existing Drive file or upload one from this device. Books are stored in your Google Drive.</p></div>{driveConnected&&<span className="drive-connected"><Check size={15}/> Drive connected</span>}</div>
   <div className="import-methods">
    <article className="import-method"><span className="import-method-icon"><Cloud size={20}/></span><div className="import-method-copy"><h3>From Google Drive</h3><p>Pick an EPUB already in your Drive. On first use, Google will ask you to allow access.</p></div><button disabled={busy||!isAuthenticated} className="os-button os-button-primary" onClick={chooseFromDrive}>{busy?'Opening Drive…':'Choose from Drive'}</button></article>
    <article className="import-method"><span className="import-method-icon"><HardDriveUpload size={20}/></span><div className="import-method-copy"><h3>From this device</h3><p>Choose a local EPUB. OpenShelf uploads it to your Drive so you can read it here.</p></div><label className={`os-button device-upload-button ${busy||!isAuthenticated?'disabled':''}`}>{busy?'Uploading…':'Choose EPUB file'}<input disabled={busy||!isAuthenticated} type="file" accept=".epub" onChange={e=>{const file=e.target.files?.[0];if(file)uploadFromDevice(file);e.target.value='';}}/></label></article>
   </div>
   {!isAuthenticated&&<p className="import-signin-hint">Sign in to connect Google Drive or add an EPUB from your device.</p>}
   {driveNotice&&<p className="drive-notice" role="status">{driveNotice}</p>}
   <div className="personal-drive-list">{(isAuthenticated?personal:[]).map(p=><article key={p.id} className="personal-drive-book"><div><h3 className="font-reading">{p.title}</h3><p>Personal EPUB · Google Drive</p></div><div><button className="os-button" onClick={()=>openReader({id:p.id,title:p.title,author:p.author,driveFileId:p.drive_file_id,isPersonalUpload:true} as Book)}>Open EPUB</button><button className="personal-remove" onClick={()=>void task(async()=>{const {error}=await database().from('personal_books').delete().eq('id',p.id);if(error)throw error;await loadPersonal();})}>Remove</button></div></article>)}</div>
  </section>
 </div>;
}

function BookCardIcon(){return <BookOpen size={34} strokeWidth={1.2} aria-hidden="true"/>;}
