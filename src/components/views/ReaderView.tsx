import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import type { Rendition, Contents } from 'epubjs';
import type { Location } from 'epubjs/types/rendition';
import type { NavItem } from 'epubjs/types/navigation';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Type, Volume2, X, Highlighter, StickyNote, Trash2, ArrowUpRight, Check, LoaderCircle, BookOpen, Maximize2, Minimize2 } from 'lucide-react';
import { useReading } from '../../context/ReadingContext';
import { useNotifications } from '../../context/NotificationContext';
import { driveFile } from '../../lib/drive';
import { database } from '../../lib/supabase';
import { shelfFor, storageRequest } from '../../lib/reading';
import { SelectField } from '../common/SelectField';
import { ChapterPicker } from '../common/ChapterPicker';
import { userError } from '../../lib/user-error';

type Annotation={id:string;kind:string;cfi:string;excerpt:string;note:string};
const button='px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:opacity-80 disabled:opacity-40';
export function ReaderView(){
 const {selectedBook,setCurrentView,readingSettings,updateReadingSettings,isAuthenticated}=useReading();
 const {notify,update}=useNotifications();
 const host=useRef<HTMLDivElement>(null), rendition=useRef<Rendition|null>(null);
 const screen=useRef<HTMLDivElement>(null);
 const shelf=useRef<{id:string;user_id:string}|null>(null), position=useRef('');
 const [currentHref,setCurrentHref]=useState(''),[noteFilter,setNoteFilter]=useState('all'),[saving,setSaving]=useState(false);
 const currentChapter=useRef('');
 const [readerReady,setReaderReady]=useState(false);
 const [loadingStep,setLoadingStep]=useState(0);
 const [toc,setToc]=useState<NavItem[]>([]),[error,setError]=useState(''),[status,setStatus]=useState('Opening EPUB…'),[page,setPage]=useState(0),[pageTotal,setPageTotal]=useState(0),[progress,setProgress]=useState(0);
 const [selection,setSelection]=useState({cfi:'',text:'',context:''}),[notes,setNotes]=useState<Annotation[]>([]);
 const [note,setNote]=useState(''),[settings,setSettings]=useState(false),[rate,setRate]=useState(1),[voice,setVoice]=useState('');
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[speechState,setSpeechState]=useState('stopped');
 const [fullScreen,setFullScreen]=useState(false),[activePanel,setActivePanel]=useState<'notes'|'listen'|null>(null);
 const chapterText=useRef(''), speechGeneration=useRef(0);
 const stop=()=>{speechGeneration.current++;window.speechSynthesis?.cancel();setSpeechState('stopped');};
 useEffect(()=>{if(!fullScreen)return;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setFullScreen(false);};document.addEventListener('keydown',escape);return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',escape);};},[fullScreen]);
 const toggleFullScreen=()=>setFullScreen(value=>!value);
 useEffect(()=>{if(!window.speechSynthesis)return;const load=()=>setVoices(window.speechSynthesis.getVoices());load();window.speechSynthesis.addEventListener('voiceschanged',load);return()=>{window.speechSynthesis.removeEventListener('voiceschanged',load);window.speechSynthesis.cancel();};},[]);
 useEffect(()=>{
  let alive=true;const book=ePub();let queue=Promise.resolve();
  const fail=(e:unknown)=>{if(alive){setError(userError(e,'This EPUB couldn’t be opened. Check your connection and try again.'));setStatus('');}};
  void(async()=>{
   try{
    if(!host.current)return;
    setLoadingStep(0);
    const response=selectedBook.driveFileId ? await driveFile(selectedBook.driveFileId) : await storageRequest(`/books/${encodeURIComponent(selectedBook.id)}/file`);
    setLoadingStep(1);
    await book.open(await response.arrayBuffer(),'binary');
    if(!alive)return;
    const navigation=await book.loaded.navigation;setToc(navigation.toc);
    const r=book.renderTo(host.current,{width:'100%',height:'68vh',spread:'none',allowScriptedContent:false});rendition.current=r;
    r.hooks.content.register((content:Contents)=>{
     chapterText.current=content.document.body.textContent || '';
     content.document.querySelectorAll('script,iframe,object,embed,form').forEach(el=>el.remove());
    });
    r.on('selected',(cfi:string,content:Contents)=>{
     const selected=content.window.getSelection();
     setSelection({cfi,text:selected?.toString().trim().slice(0,10000)||'',context:selected?.anchorNode?.parentElement?.textContent?.slice(0,10000)||''});
    });
    let initial:string|undefined;
    if(isAuthenticated){
     shelf.current=await shelfFor(selectedBook.id,!!selectedBook.isPersonalUpload);
     const progress=await database().from('reading_progress').select('cfi').eq('shelf_id',shelf.current.id).maybeSingle();
     if(progress.error)throw progress.error;initial=progress.data?.cfi;
     const saved=await database().from('annotations').select('*').eq('shelf_id',shelf.current.id);
     if(saved.error)throw saved.error;if(!alive)return;setNotes(saved.data||[]);
     for(const item of saved.data||[])if(item.kind==='highlight')r.annotations.highlight(item.cfi);
    }
    setLoadingStep(2);await book.locations.generate(1500);if(!alive)return;
    r.on('relocated',(location:Location)=>{setCurrentHref(location.start.href);currentChapter.current=navigation.get(location.start.href)?.label||'Saved reading position';const nextPage=(location.start.location??0)+1;setPage(previous=>{if(previous&&previous!==nextPage){host.current?.classList.remove('reader-page-turn');requestAnimationFrame(()=>host.current?.classList.add('reader-page-turn'));window.setTimeout(()=>host.current?.classList.remove('reader-page-turn'),520);}return nextPage;});setPageTotal(book.locations.length());setProgress(Math.max(0,Math.min(100,book.locations.percentageFromCfi(location.start.cfi)*100)));});
    await r.display(initial);setReaderReady(true);setStatus(isAuthenticated?'Reading position restored.':'Sign in to save reading progress.');
    r.on('relocated',(location:Location)=>{
     position.current=location.start.cfi;window.speechSynthesis?.cancel();setSpeechState('stopped');speechGeneration.current++;
     if(!shelf.current)return;
     const owner={...shelf.current},cfi=location.start.cfi;
     const percentage=Math.max(0,Math.min(100,book.locations.percentageFromCfi(cfi)*100));
     setStatus('Saving position…');
     queue=queue.then(async()=>{const {error}=await database().from('reading_progress').upsert({shelf_id:owner.id,user_id:owner.user_id,cfi,percentage,updated_at:new Date().toISOString()});if(error)throw error;if(alive)setStatus('Position saved.');}).catch(fail);
    });
    position.current=r.location?.start?.cfi||initial||'';
   }catch(e){fail(e);}
  })();
  return()=>{alive=false;speechGeneration.current++;window.speechSynthesis?.cancel();rendition.current=null;shelf.current=null;book.destroy();};
 },[selectedBook.id,selectedBook.driveFileId,selectedBook.isPersonalUpload,isAuthenticated]);
 useEffect(()=>{
  const r=rendition.current;if(!r)return;
  const palettes={cream:['#FFFDF8','#282722'],white:['#FFFFFF','#282722'],charcoal:['#1C1B19','#EDE9E1'],amber:['#F4ECE1','#382E22']};
  const [background,color]=palettes[readingSettings.canvasPalette];
  r.themes.default({body:{'font-family':readingSettings.typeface,'font-size':`${readingSettings.fontSize}px`,'line-height':String(readingSettings.lineHeight),background,color},p:{'line-height':String(readingSettings.lineHeight)}});
  const resize=()=>{if(host.current)r.resize(host.current.clientWidth,Math.max(420,Math.round(window.innerHeight-(fullScreen?250:window.innerHeight*0.32))));};
  const hostElement=host.current;
  const observer=hostElement?new ResizeObserver(resize):null;
  if(hostElement)observer?.observe(hostElement);
  resize();window.addEventListener('resize',resize,{passive:true});
  return()=>{window.removeEventListener('resize',resize);observer?.disconnect();};
 },[readingSettings,readerReady,fullScreen]);
 const save=async(kind:'bookmark'|'highlight'|'note',selectedBookmark=false)=>{
  if(saving)return;
  if(kind==='note'&&!note.trim())return;
  if(!shelf.current){notify({level:'error',title:'Sign in to save',message:'Your reading notes are saved to your account.'});return;}
  const cfi=kind==='bookmark'&&!selectedBookmark?position.current:selection.cfi;
  if(!cfi){notify({level:'info',title:'Select a passage first',message:'Choose text in the book before saving this reading note.'});return;}
  setSaving(true);
  const titles={bookmark:'Saving bookmark',highlight:'Saving highlight',note:'Saving note'};
  const success={bookmark:'Bookmark saved',highlight:'Passage highlighted',note:'Note saved'};
  const id=notify({level:'progress',title:titles[kind],message:'Saving to your reading notes…',showAfterMs:450});
  try{
   const {data,error}=await database().from('annotations').insert({shelf_id:shelf.current.id,user_id:shelf.current.user_id,kind,cfi,excerpt:kind==='bookmark'&&!selectedBookmark?currentChapter.current:selection.text,note:kind==='note'?note.trim():''}).select().single();if(error)throw error;
   setNotes(items=>[data,...items]);if(kind==='highlight')rendition.current?.annotations.highlight(cfi);setNoteFilter('all');if(kind==='note')setNote('');
   update(id,{level:'success',title:success[kind],message:'Saved with this book.'});
  }catch(e){update(id,{level:'error',title:'Couldn’t save this note',message:userError(e,'Please try saving it again.')});}finally{setSaving(false);}
 };
 const vocabulary=async()=>{
  if(!shelf.current){notify({level:'error',title:'Sign in to save words',message:'Your vocabulary is kept with your OpenShelf account.'});return;}
  const word=selection.text.trim();if(!word||word.length>120){notify({level:'info',title:'Select a word first',message:'Choose a word or short phrase from the book.'});return;}
  const id=notify({level:'progress',title:'Saving word',message:'Adding it to your vocabulary…',showAfterMs:450});
  try{
   let definition:string|null=null;let source_url:string|null=null;
   try{const response=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);if(response.ok){const entries=await response.json();definition=entries[0]?.meanings?.[0]?.definitions?.[0]?.definition||null;source_url=entries[0]?.sourceUrls?.[0]||null;}}catch{/* Word can still be saved without a definition. */}
   const {error}=await database().from('vocabulary').insert({shelf_id:shelf.current.id,user_id:shelf.current.user_id,word,context:selection.context,definition,source_url});if(error)throw error;
   update(id,{level:'success',title:'Word saved',message:definition?'Added to your vocabulary with a definition.':'Added to your vocabulary.'});
  }catch(e){update(id,{level:'error',title:'Couldn’t save this word',message:userError(e,'Please try saving it again.')});}
 };
 const speak=(text:string)=>{
  stop();if(!window.speechSynthesis){notify({level:'error',title:'Read-aloud unavailable',message:'This browser doesn’t support speech synthesis.'});return;}
  const chunks=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.flatMap(s=>s.match(/.{1,220}(?:\s|$)|.{1,220}/g)||[])||[];
  const generation=speechGeneration.current;let index=0;
  const next=()=>{if(generation!==speechGeneration.current)return;if(index>=chunks.length){setSpeechState('stopped');return;}const utterance=new SpeechSynthesisUtterance(chunks[index++]);utterance.rate=rate;utterance.voice=voices.find(v=>v.voiceURI===voice)||null;utterance.onend=next;utterance.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled')notify({level:'error',title:'Read-aloud stopped',message:'Speech playback encountered a problem. Try starting it again.'});setSpeechState('stopped');};window.speechSynthesis.speak(utterance);};setSpeechState('playing');next();
 };
 const navigate=(action:()=>Promise<void>|undefined, reveal=false)=>{
  stop();setSelection({cfi:'',text:'',context:''});setNote('');setError('');
  void action()?.then(()=>{if(reveal){host.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});host.current?.focus({preventScroll:true});notify({level:'info',title:'Saved passage opened',message:'Your saved place is now visible in the reader.'});}}).catch(e=>setError(userError(e)));
 };
 return <div ref={screen} className={`reader-screen text-[var(--color-ink)] ${fullScreen?'is-fullscreen':''}`}>
  <header className="reader-topbar"><button className="reader-icon-control reader-back-control" onClick={()=>setCurrentView('my-shelf')} aria-label="Back to My Shelf"><ArrowLeft size={18}/><span>Library</span></button><div className="reader-book-heading"><span className="reader-overline">NOW READING</span><h1>{selectedBook.title}</h1>{selectedBook.author&&<p>{selectedBook.author}</p>}</div><div className="reader-top-actions"><span className="reader-chapter-live" title={status}>{readerReady?<><Check size={14}/><span>{isAuthenticated?(status.toLowerCase().includes('saving')?'Saving…':'Synced'):'Reading'}</span></>:status}</span><button className="reader-icon-control" onClick={()=>void save('bookmark')} disabled={!readerReady||saving} aria-label="Bookmark current position" title="Bookmark this place"><Bookmark size={18}/></button><button className={`reader-icon-control ${settings?'is-active':''}`} onClick={()=>setSettings(!settings)} aria-label="Reading settings" title="Reading settings" aria-expanded={settings}><Type size={18}/></button><button className={`reader-icon-control ${fullScreen?'is-active':''}`} onClick={toggleFullScreen} aria-label={fullScreen?'Exit reader focus mode':'Expand reader'} title={fullScreen?'Exit focus mode':'Expand reader'}>{fullScreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></header>
  {error&&<p role="alert" className="app-inline-alert">{error}</p>}
  <div className="reader-content-wrap"><div className={`reader-tools-row ${settings?'has-settings':''}`}><div className="reader-context-label"><span className="reader-overline">YOUR PLACE</span><ChapterPicker items={toc} currentHref={currentHref} onSelect={href=>navigate(()=>rendition.current?.display(href))}/></div>
  {settings&&<div className="reader-settings-panel"><h2>Reading preferences</h2><label>Font size<span>{readingSettings.fontSize}px</span><input type="range" min="16" max="30" value={readingSettings.fontSize} onChange={e=>updateReadingSettings({fontSize:+e.target.value})}/></label><SelectField label="Typeface" value={readingSettings.typeface} options={['Lora','DM Sans','Georgia'].map(value=>({value,label:value}))} onChange={value=>updateReadingSettings({typeface:value as typeof readingSettings.typeface})}/><SelectField label="Page color" value={readingSettings.canvasPalette} options={['cream','white','charcoal','amber'].map(value=>({value,label:value.charAt(0).toUpperCase()+value.slice(1)}))} onChange={value=>updateReadingSettings({canvasPalette:value as typeof readingSettings.canvasPalette})}/><label>Line spacing<span>{readingSettings.lineHeight.toFixed(1)}</span><input type="range" min="1.3" max="2.2" step="0.1" value={readingSettings.lineHeight} onChange={e=>updateReadingSettings({lineHeight:+e.target.value})}/></label><SelectField label="Reading width" value={readingSettings.columnWidth} options={['narrow','normal','wide'].map(value=>({value,label:value.charAt(0).toUpperCase()+value.slice(1)}))} onChange={value=>updateReadingSettings({columnWidth:value as typeof readingSettings.columnWidth})}/></div>}</div>
  <main className="reader-book-stage" aria-busy={!readerReady&&!error}><div ref={host} tabIndex={-1} aria-label="Book reading area" className={`reader-pages mx-auto my-5 overflow-hidden ${readerReady?'is-ready':''}`} style={{maxWidth:{narrow:580,normal:720,wide:860}[readingSettings.columnWidth]}}/>{!readerReady&&!error&&<div className="reader-loading" role="status" aria-live="polite"><span className="reader-loading-mark"><BookOpen size={22}/><LoaderCircle size={14}/></span><span className="reader-overline">OPENING YOUR BOOK</span><strong>{['Loading the EPUB file','Preparing chapters','Restoring your reading place'][loadingStep]}</strong><span className="reader-loading-caption">This can take a moment for larger books.</span><span className="reader-loading-track"><i style={{transform:`scaleX(${(loadingStep+1)/3})`}}/></span></div>}</main>
  <div className="reader-pagination"><button className={button} onClick={()=>navigate(()=>rendition.current?.prev())} aria-label="Previous page"><ChevronLeft/><span>Previous</span></button><div className="reader-progress-track" aria-label={`${Math.round(progress)} percent read`}><div className="reader-progress-meta"><span>READING PROGRESS</span><strong>{String(page||1).padStart(2,'0')} <i>/</i> {pageTotal?String(pageTotal).padStart(2,'0'):'—'} <small>LOCATIONS</small></strong></div><div className="reader-progress-line"><span style={{transform:`scaleX(${progress/100})`}}/></div></div><button className={button} onClick={()=>navigate(()=>rendition.current?.next())} aria-label="Next page"><span>Next</span><ChevronRight/></button></div>
  <nav className="reader-feature-nav" aria-label="Reading tools"><button type="button" aria-pressed={activePanel==='notes'} onClick={()=>setActivePanel(activePanel==='notes'?null:'notes')}><span><StickyNote size={18}/></span><strong>Bookmarks & notes</strong><small>{notes.length ? `${notes.length} saved` : 'Save a place or thought'}</small><ChevronRight size={17}/></button><button type="button" aria-pressed={activePanel==='listen'} onClick={()=>setActivePanel(activePanel==='listen'?null:'listen')}><span><Volume2 size={18}/></span><strong>Listen</strong><small>{speechState==='playing'?'Now playing':'Read this chapter aloud'}</small><ChevronRight size={17}/></button></nav>
  {selection.text&&<section className="selection-dock" aria-label="Selected passage actions"><div className="selection-dock-heading"><span>SELECTED PASSAGE</span><button className="icon-button" aria-label="Dismiss selection actions" onClick={()=>{setSelection({cfi:'',text:'',context:''});setNote('');}}><X size={18}/></button></div><blockquote className="font-reading">{selection.text}</blockquote><div className="selection-dock-actions"><button className={`${button} selection-primary`} disabled={saving} onClick={()=>void save('highlight')}>Highlight</button><button className={button} disabled={saving} onClick={()=>void save('bookmark',true)}><Bookmark size={15}/>Bookmark passage</button><button className={button} onClick={()=>void vocabulary()}>Save word</button><button className={button} onClick={()=>speak(selection.text)}>Read selection</button></div><div className="selection-note"><textarea aria-label="Note for selected passage" placeholder="Add a note…" value={note} onChange={e=>setNote(e.target.value)} maxLength={10000}/><button className={button} disabled={saving||!note.trim()} onClick={()=>void save('note')}>{saving?'Saving…':'Save note'}</button></div></section>}
  {activePanel==='listen'&&<section className="reader-speech-panel"><div><h2>Listen to this book</h2><p>Use your browser’s available voice to hear the current chapter.</p></div><div className="reader-speech-controls"><button className={button} onClick={()=>speak(chapterText.current)}><Volume2 size={16}/>{speechState==='playing'?'Restart chapter':'Read chapter'}</button><button className={button} disabled={speechState==='stopped'} onClick={()=>{if(speechState==='paused'){window.speechSynthesis.resume();setSpeechState('playing');}else{window.speechSynthesis.pause();setSpeechState('paused');}}}>{speechState==='paused'?'Resume':'Pause'}</button><button className={button} disabled={speechState==='stopped'} onClick={stop}>Stop</button><SelectField label="Speed" value={String(rate)} options={[0.75,1,1.25,1.5,2].map(value=>({value:String(value),label:value+'×'}))} onChange={value=>{stop();setRate(Number(value));}}/><SelectField label="Voice" value={voice} options={[{value:'',label:'Default voice'},...voices.map(v=>({value:v.voiceURI,label:v.name}))]} onChange={value=>{stop();setVoice(value);}}/></div></section>}
  {activePanel==='notes'&&<section className="reader-notes-panel" aria-labelledby="reading-notes-heading">
   <div className="reader-section-heading"><div><h2 id="reading-notes-heading">Bookmarks & notes</h2><p>Places to return to. Thoughts to keep.</p></div><span>{notes.length} saved</span></div>
   <div className="reader-note-filters" role="group" aria-label="Filter reading notes">{[['all','All'],['bookmark','Bookmarks'],['note','Notes'],['highlight','Highlights']].map(([value,label])=><button key={value} aria-pressed={noteFilter===value} onClick={()=>setNoteFilter(value)}>{label}<span>{value==='all'?notes.length:notes.filter(item=>item.kind===value).length}</span></button>)}</div>
   {!notes.some(item=>noteFilter==='all'||item.kind===noteFilter)&&<div className="reader-notes-empty"><Bookmark size={26}/><h3>{notes.length?'Nothing here yet':'Keep a little of what you read'}</h3><p>{!isAuthenticated?'Sign in to keep bookmarks, highlights, and your thoughts with this book.':noteFilter==='bookmark'?'Use the bookmark button above to save your current place.':'Bookmark a page, or select a passage to highlight it and add your own note.'}</p></div>}
   {notes.filter(item=>noteFilter==='all'||item.kind===noteFilter).map(item=>{const Icon=item.kind==='bookmark'?Bookmark:item.kind==='highlight'?Highlighter:StickyNote;const label=item.kind==='bookmark'?'Bookmark':item.kind==='highlight'?'Highlight':'Note';return <article className="reading-entry" data-kind={item.kind} key={item.id}>
    <div className="reading-entry-icon"><Icon size={19}/></div><div className="reading-entry-body"><span className="reading-entry-type">{label}</span>
    {item.kind==='bookmark'?<h3>{item.excerpt||'Saved reading position'}</h3>:<>{item.note&&<p className="reading-entry-thought">{item.note}</p>}{item.excerpt&&<blockquote>{item.excerpt}</blockquote>}</>}
    <button className="reading-entry-open" onClick={()=>navigate(()=>rendition.current?.display(item.cfi),true)}>{item.kind==='bookmark'?'Return to this page':'Go to passage'}<ArrowUpRight size={15}/></button></div>
    <button className="reading-entry-remove" aria-label={'Remove '+label.toLowerCase()+': '+(item.note||item.excerpt||'saved position').slice(0,70)} onClick={async()=>{const notificationId=notify({level:'progress',title:'Removing reading note',message:'Updating your reading notes…',showAfterMs:450});try{const {error}=await database().from('annotations').delete().eq('id',item.id);if(error)throw error;if(item.kind==='highlight')rendition.current?.annotations.remove(item.cfi,'highlight');setNotes(items=>items.filter(x=>x.id!==item.id));update(notificationId,{level:'success',title:'Reading note removed',message:'Removed from this book.'});}catch(e){update(notificationId,{level:'error',title:'Couldn’t remove this note',message:userError(e,'Please try again.')});}}}><Trash2 size={17}/></button>
   </article>;})}
  </section>}
  </div></div>;
}

