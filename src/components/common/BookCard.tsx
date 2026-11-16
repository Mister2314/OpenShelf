import {BookOpen,Bookmark,BookmarkCheck,ArrowUpRight} from 'lucide-react';
import type { MouseEvent } from 'react';
import type {Book} from '../../types';
import {useReading} from '../../context/ReadingContext';
export function BookCover({book,large=false}:{book:Book;large?:boolean}){
 const themes=['ink','forest','clay','blue','plum'];const tone=themes[Array.from(book.title).reduce((sum,c)=>sum+c.charCodeAt(0),0)%themes.length];
 return <div className={`book-object book-object--${tone} ${large?'book-object--large':''}`}>
 {book.coverUrl?<img src={book.coverUrl} alt="" loading="lazy"/>:<><span className="cover-edition">OPENSHELF · EPUB</span><div className="cover-arch" aria-hidden="true"><i/><i/><i/></div><div className="cover-type">{book.author&&<span>{book.author}</span>}<strong>{book.title}</strong></div><BookOpen className="cover-mark" size={20} aria-hidden="true"/></>}
 <span className="book-spine" aria-hidden="true"/>
 </div>;
}
export function BookCard({book,showProgress=true}:{book:Book;showProgress?:boolean;size?:'sm'|'md'|'lg'}){
 const {openBookDetail,toggleBookShelved,isBookShelved}=useReading();const saved=isBookShelved(book.id);
 const openFromCover=(event:MouseEvent<HTMLButtonElement>)=>{const cover=event.currentTarget.querySelector<HTMLElement>('.book-object');if(cover)cover.style.viewTransitionName='selected-book-cover';openBookDetail(book);};
 return <article className="volume-card"><button className="volume-cover-link" aria-label={`Open ${book.title}`} onClick={openFromCover}><BookCover book={book}/><span className="cover-open"><ArrowUpRight size={20}/></span></button><div className="volume-caption"><div><button className="volume-title" onClick={()=>openBookDetail(book)}>{book.title}</button>{book.author&&<p>{book.author}</p>}</div><button className="icon-button shelf-toggle" aria-label={saved?`Remove ${book.title} from shelf`:`Save ${book.title} to shelf`} aria-pressed={saved} onClick={()=>toggleBookShelved(book.id)}>{saved?<BookmarkCheck size={18}/>:<Bookmark size={18}/>}</button></div>{showProgress&&book.progressPercent>0?<div className="volume-progress"><div><span style={{width:`${book.progressPercent}%`}}/></div><span>{book.progressPercent}% read</span></div>:book.category&&<p className="volume-category">{book.category}</p>}</article>;
}
