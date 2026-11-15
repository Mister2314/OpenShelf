import { ArrowRight, ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useReading } from '../../context/ReadingContext';
import { BookCard, BookCover } from '../common/BookCard';

export function ExploreView() {
  const revealRoot = useRef<HTMLDivElement>(null);
  const {
    books,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    currentUser,
    openReader,
    openBookDetail,
    catalogLoading,
    catalogError,
  } = useReading();
  const filtered = books.filter((book) =>
    (selectedCategory === 'All Shelves' || book.category === selectedCategory)
    && `${book.title} ${book.author} ${book.description}`.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const featured = books[0];
  const categories = ['All Shelves', ...new Set(books.map((book) => book.category))];

  useEffect(() => {
    const root = revealRoot.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    targets.forEach((target) => observer.observe(target));
    const frame = requestAnimationFrame(() => root.classList.add('motion-ready'));
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [books.length]);

  return (
    <div className="os-page discovery-page" ref={revealRoot}>
      <section className="editorial-hero">
        <div className="hero-copy" data-reveal="rise">
          <span className="eyebrow"><span className="little-dot" aria-hidden="true" />YOUR READING SANCTUARY</span>
          <h1>A good book.<br />A little <em>quiet.</em></h1>
          <p>{currentUser ? `Welcome back, ${currentUser.name.split(' ')[0]}. ` : ''}Make space for stories, new perspectives, and the pleasure of an unhurried page.</p>
          <a className="os-button os-button-primary" href="#library">Find your next read<ArrowRight size={17} aria-hidden="true" /></a>
          <span className="hero-footnote">Your pace. Your place. Your next chapter.</span>
        </div>

        {featured ? (
          <div className="hero-stage" data-reveal="stage">
            <div className="stage-circle" aria-hidden="true" />
            <span className="stage-label">ON THE READING TABLE</span>
            <button className="staged-cover" onClick={() => openBookDetail(featured)} aria-label={`View ${featured.title}`}>
              <BookCover book={featured} large />
            </button>
            <span className="stage-caption">A page away from somewhere new.<span>Explore the library <ArrowUpRight size={15} aria-hidden="true" /></span></span>
          </div>
        ) : catalogLoading ? (
          <div className="hero-stage book-stage-loading" data-reveal="stage" role="status" aria-label="Loading featured book"><div className="stage-circle" aria-hidden="true" /></div>
        ) : (
          <div className="hero-stage empty-stage" data-reveal="stage" aria-hidden="true">
            <div className="stage-circle" />
            <div className="window-book"><div className="paper-sun" /><BookOpen size={82} strokeWidth={1} /><span>A story is waiting.</span></div>
          </div>
        )}
      </section>

      <section id="library" className="library-section" data-reveal="soft">
        <div className="section-heading">
          <div><span className="eyebrow">THE OPEN LIBRARY</span><h2>Find a little wonder.</h2></div>
          <span className="quiet-count">
            {catalogLoading ? 'Checking the shelves…' : catalogError ? 'Library unavailable' : `${books.length} ${books.length === 1 ? 'volume' : 'volumes'} to explore`}
          </span>
        </div>

        <div className="discovery-tools">
          <label className="search-control"><Search size={19} aria-hidden="true" /><input aria-label="Search catalog" placeholder="A title, an author, a new beginning…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Clear search">×</button>}
          </label>
          <div className="filter-row" aria-label="Filter books by category">
            {categories.map((category) => (
              <button key={category} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)} className={`filter-pill ${selectedCategory === category ? 'selected' : ''}`}>
                {category === 'All Shelves' ? 'All books' : category}
              </button>
            ))}
          </div>
        </div>

        <div className="book-grid">{filtered.map((book) => <BookCard key={book.id} book={book} />)}</div>
        {!catalogLoading && !catalogError && !filtered.length && (
          <div className="empty-state">
            <BookOpen size={36} strokeWidth={1.2} aria-hidden="true" />
            <h3>{books.length ? 'No books on this shelf just yet.' : 'The first chapter is on its way.'}</h3>
            <p>{books.length ? 'Try another title, author, or category.' : 'Published books will appear here. Your reading space is ready.'}</p>
            {books.length > 0 && <button className="os-button" onClick={() => { setSearchQuery(''); setSelectedCategory('All Shelves'); }}>Show all books</button>}
          </div>
        )}
      </section>

      {featured && <section className="quiet-feature" data-reveal="rise"><div><span className="eyebrow">ONE BOOK. A LITTLE SPACE.</span><h2>Settle into your next chapter.</h2><p>Open {featured.title} and leave the rest for a moment.</p></div><button className="os-button" onClick={() => openReader(featured)}>Open book<ArrowRight size={17} aria-hidden="true" /></button></section>}
    </div>
  );
}
