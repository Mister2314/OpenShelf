export type ThemeMode = 'light' | 'dark' | 'system';

export type ReaderTheme = 'cream' | 'white' | 'charcoal' | 'amber';

export interface Chapter {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  estimatedMinutes: number;
  content: string[];
}

export interface Book {
  driveFileId?: string;
  coverUrl?: string;
  id: string;
  title: string;
  author: string;
  authorBio?: string;
  authorAvatar?: string;
  forewordBy?: string;
  coverBg: string;
  coverTextColor: string;
  motifType: 'architectural' | 'botanical' | 'contour' | 'waves' | 'shapes' | 'tea' | 'garden';
  pageCount: number;
  category: string;
  format: string;
  fileSize: string;
  progressPercent: number;
  currentPage: number;
  currentChapterId: string;
  currentChapterTitle: string;
  estReadingTime: string;
  publishedDate: string;
  isbn: string;
  publisher: string;
  quote: string;
  description: string;
  status: 'published' | 'in_review' | 'draft';
  isPersonalUpload?: boolean;
  isFinished?: boolean;
  isFeatured?: boolean;
  shelvedCount: number;
  chapters: Chapter[];
  audioNarrator?: string;
  audioDuration?: string;
  audioCurrentTime?: string;
}

export interface SavedWord {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  bookTitle: string;
  bookId: string;
  chapterTitle: string;
  contextSentence: string;
  savedDate: string;
  note?: string;
}

export interface ReadingSettings {
  fontSize: number; // 16 to 26 px
  typeface: 'Lora' | 'DM Sans' | 'Bookerly' | 'Georgia';
  canvasPalette: ReaderTheme;
  lineHeight: number; // 1.5 to 2.0
  columnWidth: 'narrow' | 'normal' | 'wide'; // 580px, 720px, 860px
}

export type ViewState = 'explore' | 'book-detail' | 'my-shelf' | 'reader' | 'saved-words' | 'admin';
