import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import { BookOpen, Check, FileUp, HardDrive, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { database } from '../../lib/supabase';
import { storageRequest } from '../../lib/reading';
import { userError } from '../../lib/user-error';
import { useReading } from '../../context/ReadingContext';
import { useNotifications } from '../../context/NotificationContext';
import { SelectField } from '../common/SelectField';

type Row = { id: string; title: string; author: string; description: string; status: string; category_id: string | null; cover_url: string | null; r2_key: string | null; file_size: number | null };
type Category = { id: string; name: string };
const blank = { title: '', author: '', description: '', category_id: '', cover_url: '' };
const sizeLabel = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

export function AdminView() {
  const { isAuthenticated, authLoading, currentUser, openAuthModal } = useReading();
  const { notify, update } = useNotifications();
  const [accessRetry, setAccessRetry] = useState(0);
  const [allowed, setAllowed] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [books, setBooks] = useState<Row[]>([]), [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(blank), [id, setId] = useState(''), [file, setFile] = useState<File | null>(null), [category, setCategory] = useState('');
  const [editorOpen, setEditorOpen] = useState(false), [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const [usage, setUsage] = useState<{ bytes: number; objects: number } | null>(null), [usageLoading, setUsageLoading] = useState(false), [usageError, setUsageError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'book' | 'category'; id: string; title: string } | null>(null);
  const editor = useRef<HTMLFormElement>(null), fileInput = useRef<HTMLInputElement>(null), categoryInput = useRef<HTMLInputElement>(null), confirmation = useRef<HTMLDialogElement>(null);

  const load = async () => {
    const db = database();
    const [b, c] = await Promise.all([db.from('books').select('*').order('created_at', { ascending: false }), db.from('categories').select('*').order('name')]);
    if (b.error) throw b.error; if (c.error) throw c.error;
    setBooks(b.data || []); setCategories(c.data || []);
  };
  const refreshUsage = async () => {
    setUsageLoading(true); setUsageError('');
    try { const response = await storageRequest('/usage'); setUsage(await response.json()); }
    catch (e) { setUsageError(userError(e, 'Storage usage is unavailable. Try again.')); }
    finally { setUsageLoading(false); }
  };
  useEffect(() => {
    let active = true;
    if (authLoading) return;
    void (async () => {
      setAllowed(false); setLoading(true); setError(''); setUsage(null);
      try {
        if (!isAuthenticated) return;
        const db = database(), access = await db.rpc('is_admin');
        if (access.error) throw access.error;
        if (!active || access.data !== true) return;
        const [b, c] = await Promise.all([db.from('books').select('*').order('created_at', { ascending: false }), db.from('categories').select('*').order('name')]);
        if (b.error) throw b.error; if (c.error) throw c.error;
        if (active) { setBooks(b.data || []); setCategories(c.data || []); setAllowed(true); }
      } catch (e) { if (active) setError(userError(e, 'We couldn’t open the studio. Please try again.')); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [authLoading, isAuthenticated, currentUser?.email, accessRetry]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void (async () => {
      setUsageLoading(true); setUsageError('');
      try { const response = await storageRequest('/usage'); const result = await response.json(); if (active) setUsage(result); }
      catch (e) { if (active) setUsageError(userError(e, 'Storage usage is unavailable. Try again.')); }
      finally { if (active) setUsageLoading(false); }
    })();
    return () => { active = false; };
  }, [allowed]);
  useEffect(() => {
    if (editorOpen) { editor.current?.scrollIntoView({ behavior: 'instant', block: 'start' }); editor.current?.querySelector('input')?.focus({ preventScroll: true }); }
  }, [editorOpen, id]);
  useEffect(() => { if (pendingDelete) confirmation.current?.showModal(); else confirmation.current?.close(); }, [pendingDelete]);

  const run = async (action: () => Promise<void>, title: string, message: string) => {
    if (busy) return;
    setBusy(true); setError('');
    const notificationId = notify({ level: 'progress', title: 'Saving catalog changes', message: 'Please keep this page open.', showAfterMs: 450 });
    try { await action(); await load(); update(notificationId, { level: 'success', title, message }); }
    catch (e) { const message = userError(e, 'We couldn’t save your changes. Check the form and try again.'); setError(message); update(notificationId, { level: 'error', title: 'Catalog update failed', message }); }
    finally { setBusy(false); }
  };
  const resetEditor = () => { setId(''); setForm(blank); setFile(null); if (fileInput.current) fileInput.current.value = ''; };
  const editBook = (book: Row) => { setId(book.id); setForm({ title: book.title, author: book.author || '', description: book.description || '', category_id: book.category_id || '', cover_url: book.cover_url || '' }); setFile(null); if (fileInput.current) fileInput.current.value = ''; setEditorOpen(true); editor.current?.scrollIntoView({ behavior: 'instant', block: 'start' }); };
  const saveBook = async () => {
    if (!form.title.trim()) throw new Error('Enter a book title.');
    // Validate the EPUB before creating a catalog record, so an invalid file cannot leave an accidental draft.
    if (file) {
      if (file.size > 50 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.epub')) throw new Error('Choose an EPUB file under 50 MB.');
      const parsed = ePub(); try { await parsed.open(await file.arrayBuffer(), 'binary'); await parsed.ready; } finally { parsed.destroy(); }
    }
    const payload = { ...form, title: form.title.trim(), author: form.author.trim(), category_id: form.category_id || null, cover_url: form.cover_url || null };
    let target = id;
    if (!target) { const result = await database().from('books').insert(payload).select().single(); if (result.error) throw result.error; target = result.data.id; setId(target); }
    else { const result = await database().from('books').update(payload).eq('id', target).select().single(); if (result.error) throw result.error; }
    if (file) { await storageRequest(`/books/${target}/file`, { method: 'PUT', headers: { 'Content-Type': 'application/epub+zip' }, body: file }); await refreshUsage(); }
    resetEditor(); setEditorOpen(false);
  };
  const filtered = books.filter(book => (filter === 'all' || book.status === filter) && `${book.title} ${book.author || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  if (authLoading || loading) return <div className="studio-screen studio-gate"><BookOpen size={28}/><h1>Opening your studio…</h1><p role="status">Checking administrator access.</p></div>;
  if (!allowed) return <div className="studio-screen studio-gate"><BookOpen size={28}/><h1>{error ? 'Studio couldn’t be opened' : 'Administrator access required'}</h1><p>{error || (isAuthenticated ? 'This account can’t manage the catalog. Ask the library owner for administrator access.' : 'Sign in with an administrator account to manage books and categories.')}</p>{error && <button className="os-button" onClick={() => setAccessRetry(value => value + 1)}>Try again</button>}{!isAuthenticated && <button className="os-button os-button-primary" onClick={openAuthModal}>Sign in</button>}</div>;
  return <div className="studio-screen">
    <header className="studio-heading"><div><h1>Library studio<span>.</span></h1><p>Add books, organize the catalog, and decide what readers can discover.</p></div><button className="os-button os-button-primary" disabled={busy} onClick={() => { resetEditor(); setEditorOpen(true); }}><Plus size={18}/>Add a book</button></header>
    <div className="studio-overview">
      <div className="studio-summary"><BookOpen size={21}/><div><strong>{books.length}</strong><span>Books in catalog</span></div><p>{books.filter(book => book.status === 'published').length} published · {books.filter(book => book.status === 'draft').length} drafts</p></div>
      <div className="studio-storage"><HardDrive size={21}/><div><span className="field-label">EPUB storage</span><strong aria-live="polite">{usageLoading && !usage ? 'Checking storage…' : usage ? sizeLabel(usage.bytes) : 'Unavailable'}</strong><p>{usageError || (usage ? `${usage.objects} stored ${usage.objects === 1 ? 'file' : 'files'} · updates after uploads and deletions` : 'Checking files in your catalog storage.')}</p></div><button className="icon-button" disabled={usageLoading || busy} aria-label="Refresh storage usage" onClick={() => void refreshUsage()}><RefreshCw size={18} className={usageLoading ? 'is-spinning' : ''}/></button></div>
    </div>
    {error && <p role="alert" className="app-inline-alert">{error}</p>}
    {editorOpen && <form ref={editor} className="studio-editor" onSubmit={event => { event.preventDefault(); void run(saveBook, id ? 'Book updated' : 'Draft created', id ? 'Your changes have been saved.' : 'Upload an EPUB and publish the book when it is ready.'); }}>
      <div className="studio-section-heading"><div><h2>{id ? 'Edit book' : 'Add a book'}</h2><p>{id ? 'Update the details readers see in the library.' : 'New books start as drafts. Publish them from the catalog below.'}</p></div><button type="button" className="icon-button" disabled={busy} aria-label="Close book editor" onClick={() => setEditorOpen(false)}><X size={20}/></button></div>
      <fieldset disabled={busy} className="studio-fields">
        <label>Title <span className="field-required">Required</span><input required maxLength={300} placeholder="Book title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
        <label>Author<input maxLength={300} placeholder="Author’s name" value={form.author} onChange={event => setForm({ ...form, author: event.target.value })}/></label>
        <div><SelectField label="Category" value={form.category_id} options={[{ value: '', label: 'Uncategorized' }, ...categories.map(item => ({ value: item.id, label: item.name }))]} disabled={busy} onChange={value => setForm({ ...form, category_id: value })}/><p className="field-help">{categories.length ? 'Choose where readers will find this book.' : 'No categories yet. Create one in the Categories section.'} <button type="button" className="text-action" onClick={() => { categoryInput.current?.scrollIntoView({ block: 'center' }); categoryInput.current?.focus({ preventScroll: true }); }}>Add a category</button></p></div>
        <label>Cover image URL<input type="url" pattern="https://.*" placeholder="https://…" value={form.cover_url} onChange={event => setForm({ ...form, cover_url: event.target.value })}/><span className="field-help">Optional. A book cover is used when no image is provided.</span></label>
        <label className="studio-field-wide">Description<textarea rows={4} maxLength={20000} placeholder="A short introduction to the book…" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label>
        <div className="studio-field-wide studio-file"><FileUp size={25}/><div><strong>{file ? file.name : id && books.find(book => book.id === id)?.r2_key ? 'An EPUB is already attached' : 'Attach the book’s EPUB'}</strong><p>{file ? sizeLabel(file.size) : 'EPUB only, up to 50 MB. Required before publishing.'}</p></div><label className="os-button studio-file-button">{file ? 'Change file' : 'Choose EPUB'}<input ref={fileInput} type="file" accept=".epub,application/epub+zip" aria-label="Choose EPUB file" onChange={event => setFile(event.target.files?.[0] || null)}/></label></div>
      </fieldset>
      <div className="studio-form-actions"><span>{id && books.find(book => book.id === id)?.status === 'published' ? 'Changes update the published book.' : 'Saving keeps this book as a draft.'}</span><button type="button" className="os-button" disabled={busy} onClick={() => setEditorOpen(false)}>Cancel</button><button className="os-button os-button-primary" disabled={busy}><Check size={17}/>{busy ? 'Saving…' : id ? 'Save changes' : 'Save draft'}</button></div>
    </form>}
    <div className="studio-workspace">
      <section className="studio-catalog" aria-labelledby="catalog-heading"><div className="studio-section-heading"><div><h2 id="catalog-heading">Your catalog</h2><p>Drafts stay private until you publish them.</p></div><span className="quiet-count">{filtered.length} {filtered.length === 1 ? 'book' : 'books'}</span></div>
        <div className="studio-catalog-tools"><label className="search-control"><Search size={18}/><input aria-label="Search catalog in Studio" placeholder="Search title or author" value={search} onChange={event => setSearch(event.target.value)}/></label><SelectField label="Show" value={filter} options={[{ value: 'all', label: 'All books' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }]} onChange={setFilter}/></div>
        {!filtered.length && <div className="studio-empty"><BookOpen size={28}/><h3>{books.length ? 'No matching books' : 'Your catalog starts here'}</h3><p>{books.length ? 'Try another search or change the status filter.' : 'Add a book, attach its EPUB, then publish it for readers.'}</p></div>}
        <div className="studio-book-list">{filtered.map(book => <article className="studio-book" key={book.id}><div className="studio-book-cover">{book.cover_url ? <img src={book.cover_url} alt="" loading="lazy"/> : <BookOpen size={24}/>}</div><div className="studio-book-copy"><div className="studio-book-title"><h3>{book.title}</h3><span className={`studio-status ${book.status === 'published' ? 'is-published' : ''}`}>{book.status === 'published' ? 'Published' : 'Draft'}</span></div><p>{book.author || 'Author not set'} · {categories.find(item => item.id === book.category_id)?.name || 'Uncategorized'}</p><span className="studio-file-state">{book.r2_key ? `EPUB attached${book.file_size !== null ? ' · ' + sizeLabel(book.file_size) : ''}` : 'Attach an EPUB to enable publishing'}</span></div><div className="studio-book-actions"><button className="os-button" disabled={busy} onClick={() => editBook(book)}>Edit</button><button className="os-button" disabled={busy || (!book.r2_key && book.status !== 'published')} onClick={() => void run(async () => { const status = book.status === 'published' ? 'draft' : 'published'; const result = await database().from('books').update({ status }).eq('id', book.id).select().single(); if (result.error) throw result.error; }, book.status === 'published' ? 'Book unpublished' : 'Book published', book.status === 'published' ? 'The book is now a private draft.' : 'Readers can now find this book in the library.')}>{book.status === 'published' ? 'Unpublish' : 'Publish'}</button><button className="icon-button danger-control" disabled={busy} aria-label={`Delete ${book.title}`} onClick={() => setPendingDelete({ kind: 'book', id: book.id, title: book.title })}><Trash2 size={17}/></button></div></article>)}</div>
      </section>
      <aside className="studio-categories" aria-labelledby="categories-heading"><h2 id="categories-heading">Categories</h2><p>Organize books into subjects readers can browse. New categories appear in the book editor.</p><form onSubmit={event => { event.preventDefault(); void run(async () => { const name = category.trim(); if (!name) throw new Error('Enter a category name.'); const result = await database().from('categories').insert({ name }).select().single(); if (result.error) throw result.error; if (editorOpen) setForm(previous => ({ ...previous, category_id: result.data.id })); setCategory(''); }, 'Category added', 'The category is ready to use in your book editor.'); }}><label htmlFor="new-category">New category</label><input id="new-category" ref={categoryInput} required maxLength={120} placeholder="e.g. Fiction" value={category} disabled={busy} onChange={event => setCategory(event.target.value)}/><button className="os-button" disabled={busy || !category.trim()}><Plus size={16}/>Add category</button></form>
        {!categories.length && <p className="studio-category-empty">No categories yet. Books will appear as Uncategorized until you add and assign a category.</p>}
        <ul>{categories.map(item => <li key={item.id}><div><strong>{item.name}</strong><span>{books.filter(book => book.category_id === item.id).length} books</span></div><button className="icon-button danger-control" disabled={busy} aria-label={`Delete category ${item.name}`} onClick={() => setPendingDelete({ kind: 'category', id: item.id, title: item.name })}><Trash2 size={16}/></button></li>)}</ul>
      </aside>
    </div>
    <dialog ref={confirmation} className="studio-confirm" aria-labelledby="delete-heading" onCancel={event => { if (busy) event.preventDefault(); else setPendingDelete(null); }} onClose={() => setPendingDelete(null)}><h2 id="delete-heading">Delete {pendingDelete?.kind === 'book' ? 'this book' : 'this category'}?</h2><p><strong>{pendingDelete?.title}</strong></p><p>{pendingDelete?.kind === 'book' ? 'This removes the catalog entry and its EPUB file. This cannot be undone.' : 'Books in this category will become Uncategorized. The books themselves will stay in the catalog.'}</p><div><button className="os-button" disabled={busy} onClick={() => setPendingDelete(null)}>Keep it</button><button className="os-button os-button-danger" disabled={busy} onClick={() => { if (!pendingDelete) return; const target = pendingDelete; void run(async () => { if (target.kind === 'book') { await storageRequest(`/books/${target.id}/file`, { method: 'DELETE' }); await refreshUsage(); if (id === target.id) { resetEditor(); setEditorOpen(false); } } else { const result = await database().from('categories').delete().eq('id', target.id); if (result.error) throw result.error; setForm(previous => previous.category_id === target.id ? { ...previous, category_id: '' } : previous); } setPendingDelete(null); }, target.kind === 'book' ? 'Book deleted' : 'Category deleted', 'The catalog has been updated.'); }}>{busy ? 'Deleting…' : 'Delete'}</button></div></dialog>
  </div>;
}
