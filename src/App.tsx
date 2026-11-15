import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ReadingProvider, useReading } from './context/ReadingContext';
import { Header } from './components/common/Header';
import { MobileNav } from './components/common/MobileNav';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/common/AuthModal';
import { ExploreView } from './components/views/ExploreView';
import { BookDetailView } from './components/views/BookDetailView';
import { SavedWordsView } from './components/views/SavedWordsView';

const ReaderView = React.lazy(()=>import('./components/views/ReaderView').then(m=>({default:m.ReaderView})));
const AdminView = React.lazy(()=>import('./components/views/AdminView').then(m=>({default:m.AdminView})));
const MyShelfView = React.lazy(()=>import('./components/views/MyShelfView').then(m=>({default:m.MyShelfView})));

const MainContent: React.FC = () => {
  const { currentView, authError, authLoading, currentUser } = useReading();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas)] text-[var(--color-ink)] transition-colors duration-200">
      {/* Top Header shown on all screens except reader mode for distraction-free reading */}
      {currentView !== 'reader' && <Header />}

      {/* Main Content Area */}
      <main className={`app-main flex-1 ${currentView !== 'reader' ? 'pt-[72px] pb-16 md:pb-0' : ''}`}>
        <React.Suspense fallback={<p role="status" className="p-8">Loading…</p>}>
        {authError && <p role="alert" className="p-5 text-red-600">{authError}</p>}
        {authLoading && <p role="status" className="p-5">Loading account…</p>}
        {currentView === 'explore' && <ExploreView />}
        {currentView === 'book-detail' && <BookDetailView />}
        {currentView === 'my-shelf' && <MyShelfView key={currentUser?.email || 'guest'} />}
        {currentView === 'reader' && <ReaderView />}
        {currentView === 'saved-words' && <SavedWordsView key={currentUser?.email || 'guest'} />}
        {currentView === 'admin' && <AdminView />}
        </React.Suspense>
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation (hidden during deep reading) */}
      {currentView !== 'reader' && <MobileNav />}

      {/* Authentication & Sign In Modal */}
      <AuthModal />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <ReadingProvider>
        <MainContent />
      </ReadingProvider>
    </ThemeProvider>
  );
}

export default App;
