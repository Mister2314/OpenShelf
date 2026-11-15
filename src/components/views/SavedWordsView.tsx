import { useEffect, useState } from 'react';
import { BookOpen, Search, Volume2, X } from 'lucide-react';
import { database } from '../../lib/supabase';

type Word={id:string;word:string;context:string;definition:string|null;source_url:string|null;shelf_id:string};

export function SavedWordsView(){
 const [words,setWords]=useState<Word[]>([]),[search,setSearch]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;void(async()=>{const {data,error}=await database().from('vocabulary').select('*').order('created_at',{ascending:false});if(!alive)return;if(error)setError(error.message);else setWords(data||[]);setLoading(false);})();return()=>{alive=false;};},[]);
 const filtered=words.filter(word=>`${word.word} ${word.context} ${word.definition||''}`.toLowerCase().includes(search.toLowerCase()));
 const pronounce=(word:string)=>{if(!window.speechSynthesis){setError('Speech synthesis is unavailable in this browser.');return;}window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));};
 const remove=async(id:string)=>{const {error}=await database().from('vocabulary').delete().eq('id',id);if(error){setError(error.message);return;}setWords(rows=>rows.filter(word=>word.id!==id));};
 return <div className="vocabulary-screen">
  <span className="eyebrow"><span className="little-dot"/>YOUR READING MARGINS</span>
  <h1>Saved words & marginalia</h1>
  <p>A collection of words and passages you’ve kept close.</p>
  <label className="search-control vocabulary-search"><Search size={18}/><input aria-label="Search saved words" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search words, definitions, or passages"/>{search&&<button onClick={()=>setSearch('')} aria-label="Clear search"><X size={16}/></button>}</label>
  {error&&<p role="alert">{error}</p>}{loading&&<p role="status">Loading your saved words…</p>}
  {!loading&&!words.length&&!error&&<div className="empty-state"><BookOpen size={34} strokeWidth={1.2}/><h3>Your reading margins are still open.</h3><p>Select a word while reading to save it here with its passage and definition.</p></div>}
  {!loading&&words.length>0&&!filtered.length&&<div className="empty-state"><BookOpen size={34} strokeWidth={1.2}/><h3>No saved words match that search.</h3><p>Try another word or passage.</p><button className="os-button" onClick={()=>setSearch('')}>Show all saved words</button></div>}
  <div className="grid sm:grid-cols-2 gap-5">{filtered.map(word=><article key={word.id} className="rounded-2xl p-6 border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3"><div className="flex items-start justify-between gap-3"><h2 className="font-reading text-2xl">{word.word}</h2><button className="icon-button" aria-label={`Pronounce ${word.word}`} onClick={()=>pronounce(word.word)}><Volume2 size={17}/></button></div><p>{word.definition||'English definition unavailable.'}</p><blockquote className="font-reading text-[var(--color-text-secondary)]">{word.context}</blockquote>{word.source_url?.startsWith('https://')&&<a href={word.source_url} target="_blank" rel="noreferrer">Dictionary source</a>}<div className="flex gap-4"><button onClick={()=>void remove(word.id)}>Remove from saved words</button></div></article>)}</div>
 </div>;
}
