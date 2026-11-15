import {Compass,BookMarked,Type,Settings2} from 'lucide-react';
import {useReading} from '../../context/ReadingContext';
import type {ViewState} from '../../types';
export function MobileNav(){const {currentView,setCurrentView}=useReading();const links:{id:ViewState;label:string;icon:typeof Compass}[]=[{id:'explore',label:'Explore',icon:Compass},{id:'my-shelf',label:'My shelf',icon:BookMarked},{id:'saved-words',label:'Words',icon:Type},{id:'admin',label:'Studio',icon:Settings2}];return <nav className="mobile-navigation" aria-label="Mobile navigation">{links.map(({id,label,icon:Icon})=><button key={id} className={currentView===id?'active':''} aria-current={currentView===id?'page':undefined} onClick={()=>setCurrentView(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>;}
