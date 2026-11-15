import React from 'react';
import { useReading } from '../../context/ReadingContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const Footer: React.FC = () => {
  const { currentView, setCurrentView } = useReading();
  const { resolvedTheme, toggleTheme } = useTheme();

  // Hide footer inside the EPUB reader for absolute distraction-free immersion
  if (currentView === 'reader') return null;

  return (
    <footer className="w-full bg-[var(--color-surface-warm)] border-t border-[var(--color-border)] mt-16 transition-colors duration-200">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-primary shadow-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 2v6l3-2 3 2V2" fill="#E87957" stroke="none" />
            </svg>
          </div>
          <span className="text-xs text-[var(--color-text-secondary)] font-ui">
            OpenShelf — The Cozy Editorial Library. Crafted for contemplative reading.
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-[var(--color-text-tertiary)]">
          <button
            onClick={() => setCurrentView('explore')}
            className="hover:text-[var(--color-ink)] transition-colors"
          >
            Library
          </button>
          <button
            onClick={() => setCurrentView('my-shelf')}
            className="hover:text-[var(--color-ink)] transition-colors"
          >
            My Shelf
          </button>
          <button
            onClick={() => setCurrentView('saved-words')}
            className="hover:text-[var(--color-ink)] transition-colors"
          >
            Saved Words
          </button>
          <button
            onClick={toggleTheme}
            className="hover:text-[var(--color-ink)] flex items-center gap-1 transition-colors"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="capitalize">{resolvedTheme}</span>
          </button>
          <span>© 2026 OpenShelf Systems. Quiet digital spaces.</span>
        </div>
      </div>
    </footer>
  );
};
