import { ArrowRight, ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { useEffect, useRef, type MouseEvent } from 'react';
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
  const openFeatured = (event: MouseEvent<HTMLButtonElement>) => {
    const cover = event.currentTarget.querySelector<HTMLElement>('.book-object');
    if (cover) cover.style.viewTransitionName = 'selected-book-cover';
    if (featured) openBookDetail(featured);
  };

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
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
    targets.forEach((target) => observer.observe(target));
    const frame = requestAnimationFrame(() => root.classList.add('motion-ready'));
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [books.length]);

  return (
    <div className="os-page discovery-page" ref={revealRoot}>
      <section className="editorial-hero">
        <div className="hero-copy" data-reveal="rise">
          <h1>{currentUser ? `Welcome back, ${currentUser.name.split(' ')[0]}.` : <>New worlds,<br />one book <em>away.</em></>}</h1>
          <p>Follow a new idea, find a familiar voice, or settle into a story you can call your own.</p>
          <a className="os-button os-button-primary" href="#library">Explore the library<ArrowRight size={17} aria-hidden="true" /></a>
          <span className="hero-footnote">Browse the catalog. Keep the books that stay with you.</span>
        </div>

        {featured ? (
          <div className="hero-stage" data-reveal="stage">
            <div className="stage-circle" aria-hidden="true" />
            <span className="stage-label">FROM THE OPEN LIBRARY</span>
            <button className="staged-cover" onClick={openFeatured} aria-label={`View ${featured.title}`}>
              <BookCover book={featured} large />
            </button>
            <button className="stage-caption" onClick={openFeatured}>
              {featured.title}<span>View book details <ArrowUpRight size={15} aria-hidden="true" /></span>
            </button>
          </div>
        ) : catalogLoading ? (
          <div className="hero-stage book-stage-loading" data-reveal="stage" role="status" aria-label="Loading books"><div className="stage-circle" aria-hidden="true" /></div>
        ) : (
          <div className="hero-stage empty-stage" data-reveal="stage">
            <div className="stage-circle" aria-hidden="true" />
            <div className="window-book"><BookOpen size={76} strokeWidth={1.1} aria-hidden="true" /><span>Your next book starts here.</span></div>
          </div>
        )}
      </section>

      <section id="library" className="library-section" data-reveal="soft">
        <div className="section-heading">
          <div><h2>Find your next read.</h2></div>
          <span className="quiet-count">
            {catalogLoading ? 'Checking the shelves…' : catalogError ? 'Library unavailable' : `${books.length} ${books.length === 1 ? 'volume' : 'volumes'}`}
          </span>
        </div>

        <div className="discovery-tools">
          <label className="search-control"><Search size={19} aria-hidden="true" /><input aria-label="Search catalog" placeholder="Search by title, author, or category" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
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
            <BookOpen size={36} strokeWidth={1.3} aria-hidden="true" />
            <h3>{books.length ? 'No books match this search.' : 'The library is ready for its first volume.'}</h3>
            <p>{books.length ? 'Try a different title, author, or category.' : 'Published EPUBs will appear here when they are added to the catalog.'}</p>
            {books.length > 0 && <button className="os-button" onClick={() => { setSearchQuery(''); setSelectedCategory('All Shelves'); }}>Show all books</button>}
          </div>
        )}
      </section>

      {featured && <section className="quiet-feature" data-reveal="rise"><div><h2>Pick up where a story begins.</h2><p>Open {featured.title} from the catalog and start reading.</p></div><button className="os-button os-button-primary" onClick={() => openReader(featured)}>Read this book<BookOpen size={17} aria-hidden="true" /></button></section>}
    </div>
  );
}
