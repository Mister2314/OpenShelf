import React, { createContext, useContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import type { Book, ReadingSettings, ViewState } from '../types';

import { clearDrive } from '../lib/drive';
import { database, supabase } from '../lib/supabase';
import { userError } from '../lib/user-error';
import { useNotifications } from './NotificationContext';

interface User {
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface ReadingContextType {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  selectedBook: Book;
  setSelectedBook: (book: Book) => void;
  openBookDetail: (book: Book) => void;
  openReader: (book: Book) => void;
  books: Book[];
  readingSettings: ReadingSettings;
  updateReadingSettings: (settings: Partial<ReadingSettings>) => void;
  
  // Audio narration
  
  // Shelving
  toggleBookShelved: (bookId: string) => void;
  isBookShelved: (bookId: string) => boolean;
  
  // Auth
  isAuthenticated: boolean;
  currentUser: User | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  authError: string;
  authLoading: boolean;
  catalogError: string;
  catalogLoading: boolean;
  retryCatalog: () => void;
  logout: () => void;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

function cachedCatalog():Book[]{
  try{const value=localStorage.getItem('openshelf_catalog_cache');const parsed=value?JSON.parse(value):[];return Array.isArray(parsed)?parsed as Book[]:[];}catch{return [];}
}


export const ReadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotifications();
  const [currentView, setCurrentView] = useState<ViewState>(()=>{try{const saved=localStorage.getItem('openshelf_current_view');return saved&&['explore','book-detail','my-shelf','reader','saved-words','admin'].includes(saved)?saved as ViewState:'explore';}catch{return 'explore';}});
  const [authError, setAuthError] = useState('');
  const [catalogError, setCatalogError] = useState(supabase ? '' : 'Library service is unavailable.');
  const [catalogLoading, setCatalogLoading] = useState(()=>Boolean(supabase)&&cachedCatalog().length===0);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [books,setBooks]=useState<Book[]>(cachedCatalog);
  const [selectedBook,setSelectedBook]=useState<Book>(()=>{try{const saved=localStorage.getItem('openshelf_selected_book');return saved?JSON.parse(saved) as Book:{} as Book;}catch{return {} as Book;}});
  const [shelvedBookIds,setShelvedBookIds]=useState<string[]>([]);
  useEffect(()=> {
    if(!supabase) return;
    let alive=true;
    void (async()=> {
      const {data,error}=await database().from('books').select('*, categories(name)').eq('status','published').order('created_at',{ascending:false});
      if(!alive) return;
      if(error) {setCatalogError(error.message);setCatalogLoading(false);return;}
      setCatalogError('');
      const catalog:Book[]=(data || []).map(row=>({
        id:row.id,title:row.title,author:row.author,description:row.description,coverUrl:row.cover_url,
        category:row.categories?.name || 'Uncategorized',status:row.status,
        coverBg:'from-[#2F3A4A] via-[#1E2633] to-[#121822]',coverTextColor:'#FFFFFF',motifType:'shapes',
        pageCount:0,format:'EPUB',fileSize:row.file_size ? (row.file_size<1048576?`${Math.max(1,Math.round(row.file_size/1024))} KB`:`${(row.file_size/1048576).toFixed(1)} MB`) : '',
        progressPercent:0,currentPage:0,currentChapterId:'',currentChapterTitle:'',estReadingTime:'',
        publishedDate:row.created_at,isbn:'',publisher:'',quote:'',shelvedCount:0,chapters:[]
      }));
      setBooks(catalog);
      try{localStorage.setItem('openshelf_catalog_cache',JSON.stringify(catalog));}catch{/* The live catalog remains available when storage is full. */}
      setCatalogLoading(false);
    })();
    return ()=>{alive=false;};
  },[catalogRetry]);

  useEffect(()=>{try{localStorage.setItem('openshelf_current_view',currentView);}catch{/* Storage may be unavailable. */}},[currentView]);
  useEffect(()=>{try{if(selectedBook?.id)localStorage.setItem('openshelf_selected_book',JSON.stringify(selectedBook));}catch{/* Storage may be unavailable. */}},[selectedBook]);

  const [readingSettings, setReadingSettings] = useState<ReadingSettings>(() => {
    try {
      const saved = localStorage.getItem('openshelf_reader_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return {
      fontSize: 20,
      typeface: 'Lora',
      canvasPalette: 'cream',
      lineHeight: 1.75,
      columnWidth: 'normal'
    };
  });

  // Audio State

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setAuthError('Supabase configuration is missing.'); setAuthLoading(false); return; }
    let generation = 0, alive = true;
    let authInitialized=false;
    let previousUserId:string|undefined;
    const sync = async (user: import('@supabase/supabase-js').User | null, event?: string) => {
      const firstAuthEvent=!authInitialized;
      const sameIdentity=previousUserId===user?.id;
      if(authInitialized&&sameIdentity)return;
      authInitialized=true;
      const run = ++generation;
      if(previousUserId!==user?.id)clearDrive();
      previousUserId=user?.id;
      setCurrentUser(null); setShelvedBookIds([]); setIsAuthenticated(false); setAuthLoading(true); setAuthError('');
      if (!user) { setAuthLoading(false); return; }
      const fallbackName=String(user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Reader');
      setCurrentUser({name:fallbackName,email:user.email || '',role:'Reader',avatar:''});
      setIsAuthenticated(true);
      setAuthLoading(false);
      try {
        const db = database();
        const result = await db.from('profiles').select('display_name, settings').eq('id',user.id).maybeSingle();
        if (result.error) throw result.error;
        let profile = result.data;
        if (!profile) {
          const created = await db.from('profiles').upsert({id:user.id,display_name:String(user.user_metadata?.display_name || user.user_metadata?.full_name || '').slice(0,120)}, {onConflict:'id',ignoreDuplicates:true});
          if(created.error) throw created.error;
          const loaded = await db.from('profiles').select('display_name, settings').eq('id',user.id).single();
          if(loaded.error) throw loaded.error;
          profile=loaded.data;
        }
        if(!alive || run!==generation) return;
        setCurrentUser({name:profile.display_name || fallbackName,email:user.email || '',role:'Reader',avatar:''});
        const shelf=await db.from('bookshelf').select('book_id').eq('user_id',user.id);
        if(shelf.error) throw shelf.error;
        if(!alive || run!==generation) return;
        setShelvedBookIds((shelf.data || []).flatMap(row=>row.book_id ? [row.book_id] : []));
        const settings=profile.settings;
        if(settings && typeof settings==='object')setReadingSettings(prev=>({...prev,
          fontSize:Math.max(16,Math.min(30,Number(settings.fontSize)||20)),
          lineHeight:Math.max(1.3,Math.min(2.2,Number(settings.lineHeight)||1.75)),
          ...(['Lora','DM Sans','Georgia','Bookerly'].includes(settings.typeface)?{typeface:settings.typeface}:{}),
          ...(['cream','white','charcoal','amber'].includes(settings.canvasPalette)?{canvasPalette:settings.canvasPalette}:{}),
          ...(['narrow','normal','wide'].includes(settings.columnWidth)?{columnWidth:settings.columnWidth}:{})
        }));
        setIsAuthenticated(true); setIsAuthModalOpen(false);
        if (!firstAuthEvent && event === 'SIGNED_IN') notify({level:'success',title:'You’re signed in',message:'Your shelf is ready.'});
      } catch(error) { if(alive && run===generation) setAuthError(userError(error,'We couldn’t connect to your account. Please sign in again.')); }
      finally { if(alive && run===generation) setAuthLoading(false); }
    };
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session)=> {
      queueMicrotask(()=> {if(alive) void sync(session?.user || null,event);});
    });
    return ()=> {alive=false;generation++;subscription.unsubscribe();};
  },[]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Shelves');

  const navigateTo = (view: ViewState, resetScroll = true) => {
    if (view === currentView) return;
    try{localStorage.setItem('openshelf_current_view',view);}catch{/* The in-memory route still works when storage is unavailable. */}
    const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const documentWithTransitions = document as Document & { startViewTransition?: (update: () => void) => unknown };
    if (!motionReduced && documentWithTransitions.startViewTransition) {
      documentWithTransitions.startViewTransition(() => flushSync(() => setCurrentView(view)));
    } else setCurrentView(view);
    if (resetScroll) window.scrollTo({ top: 0, behavior: motionReduced ? 'auto' : 'smooth' });
  };

  const updateReadingSettings = (newSettings:Partial<ReadingSettings>) => {
    const updated={...readingSettings,...newSettings};setReadingSettings(updated);
    if(!isAuthenticated)return;
    void(async()=>{const db=database();const {data:{user}}=await db.auth.getUser();if(!user)return;const {error}=await db.from('profiles').update({settings:updated}).eq('id',user.id);if(error)setAuthError(userError(error));})().catch(e=>setAuthError(userError(e)));
  };

  const openBookDetail = (book: Book) => {
    setSelectedBook(book);
    try{localStorage.setItem('openshelf_selected_book',JSON.stringify(book));}catch{/* The in-memory selection still works when storage is unavailable. */}
    navigateTo('book-detail', false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openReader = (book: Book) => {
    setSelectedBook(book);
    try{localStorage.setItem('openshelf_selected_book',JSON.stringify(book));}catch{/* The in-memory selection still works when storage is unavailable. */}
    navigateTo('reader', false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBookShelved = async (bookId:string) => {
    try {
      const db=database();const {data:{user},error:authFailure}=await db.auth.getUser();
      if(authFailure) throw authFailure;
      if(!user) {setIsAuthModalOpen(true);return;}
      if(shelvedBookIds.includes(bookId)) {
        const {error}=await db.from('bookshelf').delete().eq('user_id',user.id).eq('book_id',bookId);if(error) throw error;
        setShelvedBookIds(ids=>ids.filter(id=>id!==bookId));
      } else {
        const {error}=await db.from('bookshelf').insert({user_id:user.id,book_id:bookId});if(error) throw error;
        setShelvedBookIds(ids=>[...ids,bookId]);
      }
    } catch(error) {setAuthError(userError(error));}
  };

  const isBookShelved = (bookId: string) => {
    return shelvedBookIds.includes(bookId);
  };

  const login = async (email:string,password:string) => {
    const {error}=await database().auth.signInWithPassword({email,password});
    if(error) throw error;
  };
  const logout = async () => {
    const {error}=await database().auth.signOut();
    if(error) {setAuthError(userError(error));return;}
    setCurrentUser(null);setIsAuthenticated(false);setCurrentView('explore');
  };

  return (
    <ReadingContext.Provider
      value={{
        currentView,
        setCurrentView: navigateTo,
        selectedBook,
        setSelectedBook,
        openBookDetail,
        openReader,
        books,
        readingSettings,
        updateReadingSettings,
        toggleBookShelved,
        isBookShelved,
        isAuthenticated,
        currentUser,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        authError,
        authLoading,
        catalogError,
        catalogLoading,
        retryCatalog: () => { setCatalogError(''); setCatalogLoading(true); setCatalogRetry(value => value + 1); },
        logout,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory
      }}
    >
      {children}
    </ReadingContext.Provider>
  );
};

export const useReading = () => {
  const context = useContext(ReadingContext);
  if (!context) {
    throw new Error('useReading must be used within a ReadingProvider');
  }
  return context;
};
