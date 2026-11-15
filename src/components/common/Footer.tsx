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
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>OpenShelf · A little room for reading</p>
        <nav aria-label="Footer navigation">
          <button
            onClick={() => setCurrentView('explore')}
            className=""
          >
            Library
          </button>
          <button
            onClick={() => setCurrentView('my-shelf')}
            className=""
          >
            My Shelf
          </button>
          <button
            onClick={() => setCurrentView('saved-words')}
            className=""
          >
            Saved Words
          </button>
          <button
            onClick={toggleTheme}
            className=""
          >
            {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="capitalize">{resolvedTheme}</span>
          </button>
          <span>© 2026 OpenShelf</span>
        </nav>
      </div>
    </footer>
  );
};
