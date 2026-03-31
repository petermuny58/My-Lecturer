import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, BookOpen, Download, MessageCircle, Search, Sparkles } from 'lucide-react';
import type { ChatBookContext } from '../types';
import './Library.css';

export interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    previewLink?: string;
    infoLink?: string;
    categories?: string[];
  };
  accessInfo?: {
    publicDomain?: boolean;
    accessViewStatus?: string;
    webReaderLink?: string;
    pdf?: { downloadLink?: string; isAvailable?: boolean };
    epub?: { downloadLink?: string; isAvailable?: boolean };
  };
}

interface VolumesResponse {
  items?: GoogleBookVolume[];
  totalItems?: number;
}

function httpsImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:/, 'https:');
}

export function canDownloadAsFreePublic(volume: GoogleBookVolume): boolean {
  const a = volume.accessInfo;
  if (!a) return false;
  const link = a.pdf?.downloadLink || a.epub?.downloadLink;
  if (!link) return false;
  if (a.publicDomain === true) return true;
  if (a.accessViewStatus === 'FULL_PUBLIC_DOMAIN') return true;
  return false;
}

export function getDownloadLink(volume: GoogleBookVolume): string | null {
  const a = volume.accessInfo;
  if (!a) return null;
  return a.pdf?.downloadLink || a.epub?.downloadLink || null;
}

function readNowUrl(volume: GoogleBookVolume): string | null {
  const v = volume.volumeInfo;
  return v.previewLink || volume.accessInfo?.webReaderLink || v.infoLink || null;
}

/* ═══════════════════════════════════════════
   Course Categories
═══════════════════════════════════════════ */
interface CourseCategory {
  id: string;
  label: string;
  emoji: string;
  query: string; // Google Books query
}

const CATEGORIES: CourseCategory[] = [
  { id: 'all',        label: 'Featured',            emoji: '✨', query: 'subject:education textbook' },
  { id: 'engineering',label: 'Engineering',          emoji: '⚙️', query: 'subject:engineering textbook' },
  { id: 'cs',         label: 'Computer Science',     emoji: '💻', query: 'subject:computer+science programming' },
  { id: 'medicine',   label: 'Medicine',             emoji: '🩺', query: 'subject:medicine anatomy' },
  { id: 'business',   label: 'Business',             emoji: '📊', query: 'subject:business management' },
  { id: 'law',        label: 'Law',                  emoji: '⚖️', query: 'subject:law jurisprudence' },
  { id: 'math',       label: 'Mathematics',           emoji: '📐', query: 'subject:mathematics calculus' },
  { id: 'physics',    label: 'Physics',              emoji: '🔬', query: 'subject:physics mechanics' },
  { id: 'biology',    label: 'Biology',              emoji: '🧬', query: 'subject:biology genetics' },
  { id: 'chemistry',  label: 'Chemistry',            emoji: '⚗️', query: 'subject:chemistry organic' },
  { id: 'psychology', label: 'Psychology',            emoji: '🧠', query: 'subject:psychology cognitive' },
  { id: 'economics',  label: 'Economics',            emoji: '💰', query: 'subject:economics microeconomics' },
  { id: 'arts',       label: 'Arts & Humanities',    emoji: '🎨', query: 'subject:arts humanities literature' },
];

/* ═══════════════════════════════════════════
   Library Component
═══════════════════════════════════════════ */
interface LibraryProps {
  onAddToAiChat: (book: ChatBookContext) => void;
}

export default function Library({ onAddToAiChat }: LibraryProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBookVolume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GoogleBookVolume | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isSearchMode, setIsSearchMode] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  /* ── Fetch books from Google Books API ── */
  const fetchBooks = useCallback(async (q: string, maxResults = 20) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(trimmed)}&maxResults=${maxResults}&orderBy=relevance&printType=books`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed. Try again.');
      const data: VolumesResponse = await res.json();
      setResults(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Load featured / category books on mount & category change ── */
  useEffect(() => {
    if (isSearchMode && query.trim()) return; // don't overwrite search results
    const cat = CATEGORIES.find((c) => c.id === activeCategory);
    if (cat) {
      fetchBooks(cat.query, 20);
    }
  }, [activeCategory, fetchBooks]);

  /* ── Debounced search ── */
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setIsSearchMode(false);
      // Reload category books
      const cat = CATEGORIES.find((c) => c.id === activeCategory);
      if (cat) fetchBooks(cat.query, 20);
      return;
    }

    setIsSearchMode(true);
    debounceRef.current = setTimeout(() => {
      fetchBooks(value);
    }, 500);
  };

  const handleSearchSubmit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      setIsSearchMode(true);
      fetchBooks(query);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    setQuery('');
    setIsSearchMode(false);
  };

  /* ── Modal ── */
  const openModal = (v: GoogleBookVolume) => {
    setSelected(v);
    setPreviewNotice(null);
  };

  const closeModal = () => {
    setSelected(null);
    setPreviewNotice(null);
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const handleDownload = () => {
    if (!selected) return;
    const link = getDownloadLink(selected);
    if (link && canDownloadAsFreePublic(selected)) {
      window.open(link, '_blank', 'noopener,noreferrer');
      setPreviewNotice(null);
      return;
    }
    setPreviewNotice('This book is for preview only.');
  };

  const handleReadNow = () => {
    if (!selected) return;
    const url = readNowUrl(selected);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAddToChat = () => {
    if (!selected) return;
    const title = selected.volumeInfo.title || 'Untitled';
    const description =
      selected.volumeInfo.description ||
      'No description available from Google Books. Ask in Lecture Hall for more context.';
    onAddToAiChat({ title, description });
    closeModal();
  };

  const activeCatLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label ?? 'Featured';

  return (
    <div className="library-root">
      {/* ── Search Bar ── */}
      <div className="library-search-wrap">
        <div className="library-search-bar">
          <Search size={18} className="library-search-icon" />
          <input
            id="library-search-input"
            className="library-search"
            type="search"
            placeholder="Search for any book, author, or topic…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search Google Books"
          />
          <button
            type="button"
            className="library-search-btn"
            onClick={handleSearchSubmit}
            aria-label="Search"
          >
            <Search size={16} />
          </button>
        </div>
        <p className="library-hint">
          <Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Powered by Google Books — search millions of titles
        </p>
        {error && <p className="library-error">{error}</p>}
      </div>

      {/* ── Category Chips ── */}
      <div className="library-categories-wrap" ref={categoryScrollRef}>
        <div className="library-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`library-cat-chip ${activeCategory === cat.id ? 'library-cat-chip--active' : ''}`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              <span className="library-cat-emoji">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section Heading ── */}
      <div className="library-section-heading">
        <h2>
          {isSearchMode
            ? `Results for "${query}"`
            : activeCatLabel}
        </h2>
        {!isSearchMode && (
          <span className="library-section-count">
            {results.length} {results.length === 1 ? 'book' : 'books'}
          </span>
        )}
      </div>

      {/* ── Book Grid ── */}
      <div className="library-grid-wrap">
        {loading && (
          <div className="library-loading">
            <div className="library-loading-spinner" />
            <span>Finding books…</span>
          </div>
        )}
        {!loading && results.length === 0 && !error && (
          <p className="library-empty">
            {isSearchMode
              ? 'No books found. Try a different search term.'
              : 'No books available in this category yet.'}
          </p>
        )}
        {!loading && results.length > 0 && (
          <div className="library-grid">
            {results.map((vol) => {
              const thumb = httpsImage(
                vol.volumeInfo.imageLinks?.thumbnail || vol.volumeInfo.imageLinks?.smallThumbnail
              );
              const authors = vol.volumeInfo.authors?.slice(0, 2).join(', ');
              return (
                <button
                  key={vol.id}
                  type="button"
                  className="library-card"
                  onClick={() => openModal(vol)}
                >
                  <div className="library-card-cover-wrap">
                    {thumb ? (
                      <img className="library-card-cover" src={thumb} alt="" loading="lazy" />
                    ) : (
                      <div
                        className="library-card-cover library-card-cover--placeholder"
                      >
                        <BookOpen size={40} color="#555" />
                      </div>
                    )}
                  </div>
                  <div className="library-card-info">
                    <p className="library-card-title">{vol.volumeInfo.title}</p>
                    {authors && <p className="library-card-author">{authors}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {selected && (
        <div
          className="library-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-modal-title"
          onClick={closeModal}
        >
          <div className="library-modal-inner library-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="library-modal-close" onClick={closeModal} aria-label="Close">
              <X size={22} />
            </button>
            <div className="library-modal-cover-wrap">
              {(() => {
                const thumb = httpsImage(
                  selected.volumeInfo.imageLinks?.thumbnail ||
                    selected.volumeInfo.imageLinks?.smallThumbnail
                );
                return thumb ? (
                  <img
                    className="library-modal-cover"
                    src={thumb.replace('zoom=1', 'zoom=2')}
                    alt={selected.volumeInfo.title}
                  />
                ) : (
                  <div
                    className="library-modal-cover"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}
                  >
                    <BookOpen size={64} color="#666" />
                  </div>
                );
              })()}
            </div>
            <div className="library-modal-body">
              <h2 id="book-modal-title">{selected.volumeInfo.title}</h2>
              {selected.volumeInfo.authors && (
                <p className="library-modal-authors">{selected.volumeInfo.authors.join(', ')}</p>
              )}
              {selected.volumeInfo.categories && (
                <div className="library-modal-tags">
                  {selected.volumeInfo.categories.map((cat, i) => (
                    <span key={i} className="library-modal-tag">{cat}</span>
                  ))}
                </div>
              )}
              <p className="library-modal-desc">
                {selected.volumeInfo.description ||
                  'No description available for this volume. Try another edition or ask in the Lecture Hall.'}
              </p>
              {previewNotice && <p className="library-preview-msg">{previewNotice}</p>}
            </div>
            <div className="library-modal-actions">
              <button type="button" className="library-btn library-btn--primary" onClick={handleReadNow}>
                <BookOpen size={18} />
                Read Now
              </button>
              <button type="button" className="library-btn library-btn--secondary" onClick={handleDownload}>
                <Download size={18} />
                Download PDF
              </button>
              <button type="button" className="library-btn library-btn--ghost" onClick={handleAddToChat}>
                <MessageCircle size={18} />
                Add to AI Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
