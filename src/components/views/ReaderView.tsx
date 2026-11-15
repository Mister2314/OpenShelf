import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import type { Rendition, Contents } from 'epubjs';
import type { Location } from 'epubjs/types/rendition';
import type { NavItem } from 'epubjs/types/navigation';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Type, Volume2 } from 'lucide-react';
import { useReading } from '../../context/ReadingContext';
import { driveFile } from '../../lib/drive';
import { database } from '../../lib/supabase';
import { shelfFor, storageRequest } from '../../lib/reading';

type Annotation={id:string;kind:string;cfi:string;excerpt:string;note:string};
const button='px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:opacity-80 disabled:opacity-40';
export function ReaderView(){
 const {selectedBook,setCurrentView,readingSettings,updateReadingSettings,isAuthenticated}=useReading();
 const host=useRef<HTMLDivElement>(null), rendition=useRef<Rendition|null>(null);
 const shelf=useRef<{id:string;user_id:string}|null>(null), position=useRef('');
 const [readerReady,setReaderReady]=useState(false);
 const [toc,setToc]=useState<NavItem[]>([]),[error,setError]=useState(''),[status,setStatus]=useState('Opening EPUB…');
 const [selection,setSelection]=useState({cfi:'',text:'',context:''}),[notes,setNotes]=useState<Annotation[]>([]);
 const [note,setNote]=useState(''),[settings,setSettings]=useState(false),[rate,setRate]=useState(1),[voice,setVoice]=useState('');
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[speechState,setSpeechState]=useState('stopped');
 const chapterText=useRef(''), speechGeneration=useRef(0);
 const stop=()=>{speechGeneration.current++;window.speechSynthesis?.cancel();setSpeechState('stopped');};
 useEffect(()=>{if(!window.speechSynthesis)return;const load=()=>setVoices(window.speechSynthesis.getVoices());load();window.speechSynthesis.addEventListener('voiceschanged',load);return()=>{window.speechSynthesis.removeEventListener('voiceschanged',load);window.speechSynthesis.cancel();};},[]);
 useEffect(()=>{
  let alive=true;const book=ePub();let queue=Promise.resolve();
  const fail=(e:unknown)=>{if(alive){setError((e && typeof e==='object' && 'message' in e) ? String(e.message) : String(e));setStatus('');}};
  void(async()=>{
   try{
    if(!host.current)return;
    const response=selectedBook.driveFileId ? await driveFile(selectedBook.driveFileId) : await storageRequest(`/books/${encodeURIComponent(selectedBook.id)}/file`);
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
    await book.locations.generate(1500);if(!alive)return;
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
  const resize=()=>{if(host.current)r.resize(host.current.clientWidth,Math.round(window.innerHeight*0.68));};
  const hostElement=host.current;
  const observer=hostElement?new ResizeObserver(resize):null;
  if(hostElement)observer?.observe(hostElement);
  resize();window.addEventListener('resize',resize,{passive:true});
  return()=>{window.removeEventListener('resize',resize);observer?.disconnect();};
 },[readingSettings,readerReady]);
 const save=async(kind:'bookmark'|'highlight'|'note')=>{
  try{if(!shelf.current)throw new Error('Sign in to save annotations.');const cfi=kind==='bookmark'?position.current:selection.cfi;if(!cfi)throw new Error('Select text first.');
   const {data,error}=await database().from('annotations').insert({shelf_id:shelf.current.id,user_id:shelf.current.user_id,kind,cfi,excerpt:selection.text,note}).select().single();if(error)throw error;
   setNotes(items=>[data,...items]);if(kind==='highlight')rendition.current?.annotations.highlight(cfi);setStatus('Annotation saved.');setNote('');
  }catch(e){setError((e && typeof e==='object' && 'message' in e) ? String(e.message) : String(e));}
 };
 const vocabulary=async()=>{
  try{if(!shelf.current)throw new Error('Sign in first.');const word=selection.text.trim();if(!word||word.length>120)throw new Error('Select a word or short phrase.');
   let definition:string|null=null;let source_url:string|null=null;
   try{const response=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);if(response.ok){const entries=await response.json();definition=entries[0]?.meanings?.[0]?.definitions?.[0]?.definition||null;source_url=entries[0]?.sourceUrls?.[0]||null;}}catch{/* Word can still be saved without a definition. */}
   const {error}=await database().from('vocabulary').insert({shelf_id:shelf.current.id,user_id:shelf.current.user_id,word,context:selection.context,definition,source_url});if(error)throw error;
   setStatus(definition?'Word saved.':'Word saved. English definition unavailable.');
  }catch(e){setError((e && typeof e==='object' && 'message' in e) ? String(e.message) : String(e));}
 };
 const speak=(text:string)=>{
  stop();if(!window.speechSynthesis){setError('Speech synthesis is unavailable in this browser.');return;}
  const chunks=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.flatMap(s=>s.match(/.{1,220}(?:\s|$)|.{1,220}/g)||[])||[];
  const generation=speechGeneration.current;let index=0;
  const next=()=>{if(generation!==speechGeneration.current)return;if(index>=chunks.length){setSpeechState('stopped');return;}const utterance=new SpeechSynthesisUtterance(chunks[index++]);utterance.rate=rate;utterance.voice=voices.find(v=>v.voiceURI===voice)||null;utterance.onend=next;utterance.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled')setError(`Speech: ${e.error}`);setSpeechState('stopped');};window.speechSynthesis.speak(utterance);};setSpeechState('playing');next();
 };
 const navigate=(action:()=>Promise<void>|undefined)=>{stop();setSelection({cfi:'',text:'',context:''});void action()?.catch(e=>setError(String(e)));};
 return <div className="reader-screen text-[var(--color-ink)]">
  <header className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--color-border)]"><button className={button} onClick={()=>setCurrentView('my-shelf')}><ArrowLeft size={18}/></button><div className="flex-1 min-w-0"><h1 className="font-reading truncate">{selectedBook.title}</h1><p className="text-xs">{selectedBook.author}</p></div><button className={button} onClick={()=>void save('bookmark')} aria-label="Bookmark"><Bookmark size={18}/></button><button className={button} onClick={()=>setSettings(!settings)} aria-label="Reading settings"><Type size={18}/></button></header>
  {error&&<p role="alert" className="p-4 text-red-600">{error}</p>}<p role="status" className="text-xs px-5 py-2">{status}</p>
  <div className="max-w-[1240px] mx-auto px-4"><select aria-label="Chapter" className={button+' max-w-full'} onChange={e=>navigate(()=>rendition.current?.display(e.target.value))}><option value="">Table of contents</option>{toc.flatMap(function flatten(item):NavItem[]{return [item,...(item.subitems||[]).flatMap(flatten)];}).map(item=><option key={item.id} value={item.href}>{item.label}</option>)}</select>
  {settings&&<div className="flex flex-wrap gap-4 py-4"><label>Font size<input type="range" min="16" max="30" value={readingSettings.fontSize} onChange={e=>updateReadingSettings({fontSize:+e.target.value})}/></label><select aria-label="Typeface" value={readingSettings.typeface} onChange={e=>updateReadingSettings({typeface:e.target.value as typeof readingSettings.typeface})}>{['Lora','DM Sans','Georgia'].map(x=><option key={x}>{x}</option>)}</select><select aria-label="Reader theme" value={readingSettings.canvasPalette} onChange={e=>updateReadingSettings({canvasPalette:e.target.value as typeof readingSettings.canvasPalette})}>{['cream','white','charcoal','amber'].map(x=><option key={x}>{x}</option>)}</select><label>Line spacing<input type="range" min="1.3" max="2.2" step="0.1" value={readingSettings.lineHeight} onChange={e=>updateReadingSettings({lineHeight:+e.target.value})}/></label><select aria-label="Reading width" value={readingSettings.columnWidth} onChange={e=>updateReadingSettings({columnWidth:e.target.value as typeof readingSettings.columnWidth})}>{['narrow','normal','wide'].map(x=><option key={x}>{x}</option>)}</select></div>}
  <div ref={host} className="reader-pages mx-auto my-5 overflow-hidden rounded-2xl border border-[var(--color-border)]" style={{maxWidth:{narrow:580,normal:720,wide:860}[readingSettings.columnWidth]}}/>
  <div className="flex justify-between"><button className={button} onClick={()=>navigate(()=>rendition.current?.prev())}><ChevronLeft/>Previous</button><button className={button} onClick={()=>navigate(()=>rendition.current?.next())}>Next<ChevronRight/></button></div>
  {selection.text&&<section className="my-5 p-5 rounded-2xl bg-[var(--color-surface-warm)] space-y-3"><blockquote className="font-reading">{selection.text}</blockquote><div className="flex flex-wrap gap-2"><button className={button} onClick={()=>void save('highlight')}>Highlight</button><button className={button} onClick={()=>void vocabulary()}>Save word</button><button className={button} onClick={()=>speak(selection.text)}>Read selection</button></div><textarea aria-label="Note" className="w-full p-3 border rounded-xl" value={note} onChange={e=>setNote(e.target.value)} maxLength={10000}/><button className={button} onClick={()=>void save('note')}>Save note</button></section>}
  <section className="my-5 p-5 rounded-2xl border border-[var(--color-border)]"><h2 className="font-reading mb-3">Synthesized speech</h2><div className="flex flex-wrap gap-3"><button className={button} onClick={()=>speak(chapterText.current)}><Volume2 size={16}/>Read chapter</button><button className={button} disabled={speechState==='stopped'} onClick={()=>{if(speechState==='paused'){window.speechSynthesis.resume();setSpeechState('playing');}else{window.speechSynthesis.pause();setSpeechState('paused');}}}>{speechState==='paused'?'Resume':'Pause'}</button><button className={button} onClick={stop}>Stop</button><select aria-label="Speech speed" value={rate} onChange={e=>{stop();setRate(+e.target.value);}}>{[0.75,1,1.25,1.5,2].map(x=><option key={x} value={x}>{x}x</option>)}</select><select aria-label="Voice" className="max-w-full" value={voice} onChange={e=>{stop();setVoice(e.target.value);}}><option value="">Default voice</option>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}</select></div></section>
  <section className="space-y-3 py-5"><h2 className="font-reading text-xl">Bookmarks & notes</h2>{notes.map(item=><div className="p-4 border rounded-xl" key={item.id}><button onClick={()=>navigate(()=>rendition.current?.display(item.cfi))}>{item.kind}: {item.excerpt||'Reading position'}</button><p>{item.note}</p><button className={button} onClick={async()=>{const {error}=await database().from('annotations').delete().eq('id',item.id);if(error){setError(error.message);return;}rendition.current?.annotations.remove(item.cfi,'highlight');setNotes(items=>items.filter(x=>x.id!==item.id));}}>Remove</button></div>)}</section>
  </div></div>;
}

