import { ArrowLeft, Bookmark, BookOpen } from 'lucide-react';
import { useReading } from '../../context/ReadingContext';
import { BookCover } from '../common/BookCard';

export function BookDetailView() {
  const { selectedBook: book, openReader, toggleBookShelved, isBookShelved, setCurrentView } = useReading();
  if (!book.id) return null;

  return (
    <div className="detail-screen">
      <button onClick={() => setCurrentView('explore')} className="detail-back"><ArrowLeft size={16} /> Back to library</button>
      <section className="detail-book">
        <div className="detail-cover"><BookCover book={book} large /></div>
        <div className="detail-copy">
          <span className="eyebrow">{book.category}</span>
          <h1 className="font-reading">{book.title}</h1>
          {book.author && <p className="detail-author">{book.author}</p>}
          {book.description && <p className="detail-description font-reading">{book.description}</p>}
          <p className="detail-format">{book.format}{book.fileSize ? ` · ${book.fileSize}` : ''}</p>
          <div className="detail-actions">
            <button className="os-button os-button-primary" onClick={() => openReader(book)}><BookOpen size={17} /> Read EPUB</button>
            <button className="os-button" onClick={() => toggleBookShelved(book.id)}><Bookmark size={16} /> {isBookShelved(book.id) ? 'Remove from shelf' : 'Save to shelf'}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
