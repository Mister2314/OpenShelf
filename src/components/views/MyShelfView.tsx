import ePub from 'epubjs';
import { ArrowUpRight, BookOpen, Check, Cloud, HardDriveUpload, Plus, X } from 'lucide-react';
import type { Book } from '../../types';
import {connectDrive,isDriveConnected,isDrivePickerConfigured,pickDrive,uploadDrive} from '../../lib/drive';
import {identity,shelfFor} from '../../lib/reading';
import {useEffect,useRef,useState} from 'react';
import {database} from '../../lib/supabase';
import {useReading} from '../../context/ReadingContext';
import {userError} from '../../lib/user-error';
import {BookCard} from '../common/BookCard';
export function MyShelfView(){
 const {books,isAuthenticated,authLoading,openAuthModal,openReader}=useReading();
 const [entries,setEntries]=useState<{book_id:string;reading_progress:{percentage:number}|null}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [personal,setPersonal]=useState<{id:string;title:string;author:string;drive_file_id:string}[]>([]),[busy,setBusy]=useState(false),[driveConnected,setDriveConnected]=useState(isDriveConnected),[driveNotice,setDriveNotice]=useState('');
 const [importOpen,setImportOpen]=useState(false),importDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=importDialog.current;if(!dialog)return;if(importOpen&&!dialog.open)dialog.showModal();else if(!importOpen&&dialog.open)dialog.close();},[importOpen]);
 const loadPersonal=async()=>{const {data,error}=await database().from('personal_books').select('*');if(error)throw error;setPersonal(data||[]);};
 useEffect(()=>{if(isAuthenticated)void loadPersonal().catch(e=>setError(userError(e,'Your Drive books couldn’t be loaded. Try again.')));},[isAuthenticated]);
 const task=async(action:()=>Promise<void>)=>{setBusy(true);setError('');setDriveNotice('');try{await action();}catch(e){setError(userError(e));}finally{setDriveConnected(isDriveConnected());setBusy(false);}};
 const remember=async(file:{id:string;name:string})=>{const user_id=await identity();const result=await database().from('personal_books').upsert({user_id,drive_file_id:file.id,title:file.name.replace(/\.epub$/i,'')},{onConflict:'user_id,drive_file_id'}).select().single();if(result.error)throw result.error;await shelfFor(result.data.id,true);await loadPersonal();};
 const chooseFromDrive=()=>void task(async()=>{if(!isDrivePickerConfigured())throw new Error('Google Drive file picker is not configured for this OpenShelf deployment.');if(!isDriveConnected()){await connectDrive();setDriveConnected(true);}setDriveNotice('Google Drive connected. Choose an EPUB to add it to your shelf.');const file=await pickDrive();if(file){await remember(file);setDriveNotice(`${file.name} was added to your shelf.`);}else setDriveNotice('Google Drive is connected. No file was selected.');});
 const uploadFromDevice=(file:File)=>void task(async()=>{const parsed=ePub();try{await parsed.open(await file.arrayBuffer(),'binary');await parsed.ready;}finally{parsed.destroy();}if(!isDriveConnected()){await connectDrive();setDriveConnected(true);}const uploaded=await uploadDrive(file);await remember(uploaded);setDriveNotice(`${uploaded.name} was uploaded to Google Drive and added to your shelf.`);});
 useEffect(()=>{let alive=true;if(!isAuthenticated)return;void(async()=>{const [shelf,progress]=await Promise.all([database().from('bookshelf').select('id,book_id'),database().from('reading_progress').select('shelf_id,percentage')]);if(!alive)return;const error=shelf.error||progress.error;if(error)setError(userError(error,'Your shelf couldn’t be loaded. Try again.'));else setEntries((shelf.data||[]).map(row=>({book_id:row.book_id,reading_progress:(progress.data||[]).find(p=>p.shelf_id===row.id)||null})));setLoading(false);})();return()=>{alive=false;};},[isAuthenticated]);
 return <div className="shelf-screen">
  <header className="shelf-intro"><div><p className="page-kicker">YOUR READING, IN ONE PLACE</p><h1>My Shelf<span>.</span></h1><p className="page-intro">Your saved books and reading positions, ready when you are.</p></div><div className="shelf-mark" aria-hidden="true"><BookOpen size={31} strokeWidth={1.25}/><span>OPEN<br/>SHELF</span></div></header>
  {authLoading ? <p role="status">Checking your shelf…</p> : !isAuthenticated ? <div className="empty-state"><BookCardIcon/><h3>Your reading life, in one place.</h3><p>Sign in to keep your shelf and reading progress with you.</p><button className="os-button os-button-primary" onClick={openAuthModal}>Sign in to your shelf</button></div> : <>
   {loading&&<p role="status">Loading your shelf…</p>}{error&&<p role="alert" className="app-inline-alert">{error}</p>}
   {entries.length>0&&<div className="library-section"><div className="section-heading"><div><h2>Saved books</h2></div><span className="quiet-count">{entries.length} {entries.length===1?'book':'books'}</span></div><div className="book-grid">{entries.map(entry=>{const book=books.find(b=>b.id===entry.book_id);return book?<BookCard key={book.id} book={{...book,progressPercent:Math.round(entry.reading_progress?.percentage||0)}} showProgress/>:null;})}</div></div>}
   {!loading&&!entries.length&&<div className="empty-state"><BookCardIcon/><h3>A shelf with room for a story.</h3><p>Save a book from Explore and it will be waiting here, along with your reading progress.</p></div>}
  </>}
   <section className="drive-library" aria-labelledby="add-book-heading">
    <div className="drive-library-heading">
     <div><h2 id="add-book-heading" className="font-reading">Add a book</h2><p>Bring an EPUB from Google Drive or this device. Device uploads are saved to your Drive.</p></div>
     <button className="os-button os-button-primary add-book-trigger" disabled={busy} onClick={()=>setImportOpen(true)}><Plus size={17}/>{busy?'Working…':'Choose a source'}</button>
    </div>
    {driveConnected&&<p className="drive-connected"><Check size={15}/> Google Drive connected for this session</p>}
    {!isAuthenticated&&<p className="import-signin-hint">Sign in to connect Google Drive or add an EPUB from your device.</p>}
    {busy&&<p className="drive-progress" role="status"><span className="drive-progress-dot"/>Opening the selected source…</p>}
    {driveNotice&&<p className="drive-notice" role="status">{driveNotice}</p>}
    <div className="personal-drive-list">{(isAuthenticated?personal:[]).map(p=><article key={p.id} className="personal-drive-book"><div><h3 className="font-reading">{p.title}</h3><p>Personal EPUB · Google Drive</p></div><div><button className="os-button" onClick={()=>openReader({id:p.id,title:p.title,author:p.author,driveFileId:p.drive_file_id,isPersonalUpload:true} as Book)}>Open EPUB</button><button className="personal-remove" onClick={()=>void task(async()=>{const {error}=await database().from('personal_books').delete().eq('id',p.id);if(error)throw error;await loadPersonal();})}>Remove</button></div></article>)}</div>
   </section>
   <dialog ref={importDialog} className="import-dialog" aria-labelledby="import-dialog-title" onClose={()=>setImportOpen(false)} onClick={event=>{if(event.target===importDialog.current)setImportOpen(false);}}>
    <div className="import-dialog-content">
     <header className="import-dialog-header"><div><h2 id="import-dialog-title">Add a book</h2><p>Choose where your EPUB is stored.</p></div><button className="icon-button" aria-label="Close add book dialog" onClick={()=>setImportOpen(false)}><X size={20}/></button></header>
     <div className="import-choice-grid">
      <button className="import-choice" type="button" disabled={!isAuthenticated||busy||!isDrivePickerConfigured()} onClick={()=>{setImportOpen(false);chooseFromDrive();}}>
       <span className="import-choice-icon"><Cloud size={22}/></span><span className="import-choice-copy"><strong>Google Drive</strong><span>{!isDrivePickerConfigured()?'Drive picker is not configured.':'Choose an EPUB already in your Drive.'}</span></span><span className="import-choice-action">{driveConnected?'Browse Drive':'Connect & browse'}<ArrowUpRight size={16}/></span>
      </button>
      <label className={`import-choice import-device-choice ${!isAuthenticated||busy?'is-disabled':''}`}>
       <input aria-label="Choose an EPUB from this device" type="file" accept=".epub,application/epub+zip" disabled={!isAuthenticated||busy} onChange={event=>{const file=event.target.files?.[0];if(file){setImportOpen(false);uploadFromDevice(file);}event.target.value='';}}/>
       <span className="import-choice-icon import-device-icon"><HardDriveUpload size={22}/></span><span className="import-choice-copy"><strong>This device</strong><span>Upload an EPUB from your computer to Drive.</span></span><span className="import-choice-action">Choose file<ArrowUpRight size={16}/></span>
      </label>
     </div>
     {!isAuthenticated&&<div className="import-dialog-signin"><p>Sign in first to connect your shelf and Google Drive.</p><button className="os-button os-button-primary" onClick={()=>{setImportOpen(false);openAuthModal();}}>Sign in</button></div>}
     <p className="import-dialog-privacy">OpenShelf only gets access to the Drive file you choose.</p>
    </div>
   </dialog>
 </div>;
}

function BookCardIcon(){return <BookOpen size={34} strokeWidth={1.2} aria-hidden="true"/>;}
