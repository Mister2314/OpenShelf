import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Book, ReadingSettings, ViewState } from '../types';

import { clearDrive } from '../lib/drive';
import { database, supabase } from '../lib/supabase';

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
  logout: () => void;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);


export const ReadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewState>('explore');
  const [authError, setAuthError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [books,setBooks]=useState<Book[]>([]);
  const [selectedBook,setSelectedBook]=useState<Book>({} as Book);
  const [shelvedBookIds,setShelvedBookIds]=useState<string[]>([]);
  useEffect(()=> {
    if(!supabase) return;
    let alive=true;
    void (async()=> {
      const {data,error}=await database().from('books').select('*, categories(name)').eq('status','published').order('created_at',{ascending:false});
      if(!alive) return;
      if(error) {setAuthError(error.message);return;}
      setBooks((data || []).map(row=>({
        id:row.id,title:row.title,author:row.author,description:row.description,coverUrl:row.cover_url,
        category:row.categories?.name || 'Uncategorized',status:row.status,
        coverBg:'from-[#2F3A4A] via-[#1E2633] to-[#121822]',coverTextColor:'#FFFFFF',motifType:'shapes',
        pageCount:0,format:'EPUB',fileSize:row.file_size ? (row.file_size/1048576).toFixed(1)+' MB' : '',
        progressPercent:0,currentPage:0,currentChapterId:'',currentChapterTitle:'',estReadingTime:'',
        publishedDate:row.created_at,isbn:'',publisher:'',quote:'',shelvedCount:0,chapters:[]
      })));
    })();
    return ()=>{alive=false;};
  },[currentView]);

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
    let previousUserId:string|undefined;
    const sync = async (user: import('@supabase/supabase-js').User | null) => {
      const run = ++generation;
      if(previousUserId!==user?.id)clearDrive();
      previousUserId=user?.id;
      setCurrentUser(null); setShelvedBookIds([]); setIsAuthenticated(false); setAuthLoading(true); setAuthError('');
      if (!user) { setCurrentView('explore'); setAuthLoading(false); return; }
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
        setCurrentUser({name:profile.display_name || String(user.user_metadata?.full_name || 'Reader'),email:user.email || '',role:'Reader',avatar:''});
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
      } catch(error) { if(alive && run===generation) setAuthError((error && typeof error==='object' && 'message' in error) ? String(error.message) : String(error)); }
      finally { if(alive && run===generation) setAuthLoading(false); }
    };
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session)=> {
      if(event==='TOKEN_REFRESHED' && session?.user.id===previousUserId)return;
      queueMicrotask(()=> {if(alive) void sync(session?.user || null);});
    });
    return ()=> {alive=false;generation++;subscription.unsubscribe();};
  },[]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Shelves');

  const updateReadingSettings = (newSettings:Partial<ReadingSettings>) => {
    const updated={...readingSettings,...newSettings};setReadingSettings(updated);
    if(!isAuthenticated)return;
    void(async()=>{const db=database();const {data:{user}}=await db.auth.getUser();if(!user)return;const {error}=await db.from('profiles').update({settings:updated}).eq('id',user.id);if(error)setAuthError(error.message);})().catch(e=>setAuthError(String(e)));
  };

  const openBookDetail = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('book-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openReader = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('reader');
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
    } catch(error) {setAuthError((error && typeof error==='object' && 'message' in error) ? String(error.message) : String(error));}
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
    if(error) {setAuthError(error.message);return;}
    setCurrentUser(null);setIsAuthenticated(false);setCurrentView('explore');
  };

  return (
    <ReadingContext.Provider
      value={{
        currentView,
        setCurrentView,
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
