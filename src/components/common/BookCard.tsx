import {BookOpen,Bookmark,BookmarkCheck,ArrowUpRight} from 'lucide-react';
import type {Book} from '../../types';
import {useReading} from '../../context/ReadingContext';
export function BookCover({book,large=false}:{book:Book;large?:boolean}){
 const themes=['ink','forest','clay','blue','plum'];const tone=themes[Array.from(book.title).reduce((sum,c)=>sum+c.charCodeAt(0),0)%themes.length];
 return <div className={`book-object book-object--${tone} ${large?'book-object--large':''}`}>
 {book.coverUrl?<img src={book.coverUrl} alt={`${book.title} cover`} loading="lazy"/>:<><span className="cover-edition">OPENSHELF · EPUB</span><div className="cover-arch" aria-hidden="true"><i/><i/><i/></div><div className="cover-type"><span>{book.author||'Open library'}</span><strong>{book.title}</strong></div><BookOpen className="cover-mark" size={20}/></>}
 <span className="book-spine" aria-hidden="true"/>
 </div>;
}
export function BookCard({book,showProgress=true}:{book:Book;showProgress?:boolean;size?:'sm'|'md'|'lg'}){
 const {openBookDetail,toggleBookShelved,isBookShelved}=useReading();const saved=isBookShelved(book.id);
 return <article className="volume-card"><button className="volume-cover-link" aria-label={`Open ${book.title}`} onClick={()=>openBookDetail(book)}><BookCover book={book}/><span className="cover-open"><ArrowUpRight size={20}/></span></button><div className="volume-caption"><div><button className="volume-title" onClick={()=>openBookDetail(book)}>{book.title}</button><p>{book.author||'Author not specified'}</p></div><button className="icon-button shelf-toggle" aria-label={saved?`Remove ${book.title} from shelf`:`Save ${book.title} to shelf`} aria-pressed={saved} onClick={()=>toggleBookShelved(book.id)}>{saved?<BookmarkCheck size={18}/>:<Bookmark size={18}/>}</button></div>{showProgress&&book.progressPercent>0?<div className="volume-progress"><div><span style={{width:`${book.progressPercent}%`}}/></div><span>{book.progressPercent}% read</span></div>:<p className="volume-category">{book.category}</p>}</article>;
}
