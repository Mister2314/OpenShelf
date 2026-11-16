import { useEffect, useState } from 'react';
import { BookOpen, Search, Volume2, X } from 'lucide-react';
import { database } from '../../lib/supabase';
import { useReading } from '../../context/ReadingContext';
import { userError } from '../../lib/user-error';

type Word={id:string;word:string;context:string;definition:string|null;source_url:string|null;shelf_id:string};

export function SavedWordsView(){
 const {isAuthenticated,authLoading,openAuthModal}=useReading();
 const [words,setWords]=useState<Word[]>([]),[search,setSearch]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;if(!isAuthenticated||authLoading)return;void(async()=>{try{const {data,error}=await database().from('vocabulary').select('*').order('created_at',{ascending:false});if(error)throw error;if(alive)setWords(data||[]);}catch(error){if(alive)setError(userError(error,'Saved words couldn’t be loaded. Try again.'));}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[isAuthenticated,authLoading]);
 const filtered=words.filter(word=>`${word.word} ${word.context} ${word.definition||''}`.toLowerCase().includes(search.toLowerCase()));
 const pronounce=(word:string)=>{if(!window.speechSynthesis){setError('Speech synthesis is unavailable in this browser.');return;}window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));};
 const remove=async(id:string)=>{const {error}=await database().from('vocabulary').delete().eq('id',id);if(error){setError(userError(error));return;}setWords(rows=>rows.filter(word=>word.id!==id));};
 return <div className="vocabulary-screen">
  <header className="vocabulary-intro"><div><p className="page-kicker">YOUR PERSONAL INDEX</p><h1>Words worth<br/><em>keeping.</em></h1><p className="page-intro">A collection of words and passages you’ve kept close.</p></div><div className="word-index-mark" aria-hidden="true"><span>Aa</span><i/><i/><i/></div></header>
  {isAuthenticated&&<label className="search-control vocabulary-search"><Search size={18}/><input aria-label="Search saved words" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search words, definitions, or passages"/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label="Clear search"><X size={16}/></button>}</label>}
  {error&&<p role="alert" className="app-inline-alert">{error}</p>}{authLoading&&<p role="status">Checking your saved words…</p>}{isAuthenticated&&loading&&!authLoading&&<p role="status">Loading your saved words…</p>}
  {!isAuthenticated&&!authLoading&&<div className="empty-state"><BookOpen size={34} strokeWidth={1.2} aria-hidden="true"/><h3>Your reading margins, kept in one place.</h3><p>Sign in to save words and passages across your reading sessions.</p><button className="os-button os-button-primary" onClick={openAuthModal}>Sign in to your words</button></div>}
  {isAuthenticated&&!loading&&!words.length&&!error&&<div className="empty-state"><BookOpen size={34} strokeWidth={1.2}/><h3>Your reading margins are still open.</h3><p>Select a word while reading to save it here with its passage and definition.</p></div>}
  {!loading&&words.length>0&&!filtered.length&&<div className="empty-state"><BookOpen size={34} strokeWidth={1.2}/><h3>No saved words match that search.</h3><p>Try another word or passage.</p><button className="os-button" onClick={()=>setSearch('')}>Show all saved words</button></div>}
  <div className="word-list">{filtered.map(word=><article key={word.id} className="word-card"><div className="word-card-head"><span className="word-initial" aria-hidden="true">{word.word.charAt(0).toUpperCase()}</span><h2>{word.word}</h2><button className="icon-button" aria-label={`Pronounce ${word.word}`} onClick={()=>pronounce(word.word)}><Volume2 size={17}/></button></div><p>{word.definition||'English definition unavailable.'}</p><blockquote>{word.context}</blockquote><div className="word-card-actions">{word.source_url?.startsWith('https://')&&<a href={word.source_url} target="_blank" rel="noreferrer">Dictionary source</a>}<button onClick={()=>void remove(word.id)}>Remove word</button></div></article>)}</div>
 </div>;
}
