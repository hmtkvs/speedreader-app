import { ErrorHandler } from './errorHandler';

const errorHandler = ErrorHandler.getInstance();

interface BookProgress {
  position: number;
  wordIndex: number;
  wpm: number;
  lastRead: number;
}

interface BookMetadata {
  title: string;
  wordCount: number;
}

export class BookStorage {
  private storage: Storage;
  private initialized = false;
  private STORAGE_KEY = 'speedreader_books';

  constructor() {
    this.storage = window.localStorage;
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize storage if needed
      if (!this.storage.getItem(this.STORAGE_KEY)) {
        this.storage.setItem(this.STORAGE_KEY, JSON.stringify([]));
      }
      this.initialized = true;
    } catch (error) {
      errorHandler.handleError(error, { context: 'BookStorage.initialize' });
      throw new Error('Failed to initialize storage');
    }
  }

  private getBooks(): Array<{
    id: string;
    title: string;
    content: string;
    hash: string;
    lastRead: number;
    lastPosition: number;
    wordIndex: number;
    readingSpeed: number;
    wordCount: number;
    created_at: number;
  }> {
    try {
      return JSON.parse(this.storage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveBooks(books: any[]) {
    this.storage.setItem(this.STORAGE_KEY, JSON.stringify(books));
  }

  async saveProgress(bookId: string, progress: BookProgress): Promise<boolean> {
    try {
      const books = this.getBooks();
      const bookIndex = books.findIndex(b => b.id === bookId);
      
      if (bookIndex === -1) return false;

      books[bookIndex] = {
        ...books[bookIndex],
        lastPosition: progress.position,
        wordIndex: progress.wordIndex,
        lastRead: Date.now(),
        readingSpeed: progress.wpm
      };

      this.saveBooks(books);
      return true;
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'BookStorage.saveProgress',
        bookId,
        progress 
      });
      return false;
    }
  }

  async addBook(content: string, metadata: BookMetadata): Promise<string> {
    try {
      const books = this.getBooks();
      const bookId = `book_${Date.now()}`;
      const hash = await this.generateHash(content);

      books.push({
        id: bookId,
        title: metadata.title,
        content: content,
        hash: hash,
        lastRead: Date.now(),
        lastPosition: 0,
        wordIndex: 0,
        readingSpeed: 300,
        wordCount: metadata.wordCount,
        created_at: Date.now()
      });

      this.saveBooks(books);
      return bookId;
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'BookStorage.addBook',
        metadata 
      });
      throw error;
    }
  }

  async getReadingPosition(bookId: string): Promise<BookProgress | null> {
    try {
      const books = this.getBooks();
      const book = books.find(b => b.id === bookId);

      if (book) {
        return {
          position: book.lastPosition,
          wordIndex: book.wordIndex,
          wpm: book.readingSpeed,
          lastRead: book.lastRead
        };
      }

      return null;
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'BookStorage.getReadingPosition',
        bookId 
      });
      return null;
    }
  }

  async getAllBooks(): Promise<Array<{
    id: string;
    title: string;
    lastRead: number;
    progress: number;
  }>> {
    try {
      const books = this.getBooks();

      return books.map(book => ({
        id: book.id,
        title: book.title,
        lastRead: book.lastRead,
        progress: (book.lastPosition / book.wordCount) * 100
      }));
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'BookStorage.getAllBooks' 
      });
      return [];
    }
  }

  async getBookContent(bookId: string): Promise<string | null> {
    try {
      const books = this.getBooks();
      const book = books.find(b => b.id === bookId);

      return book ? book.content : null;
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'BookStorage.getBookContent',
        bookId 
      });
      return null;
    }
  }

  private async generateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async deleteBook(bookId: string): Promise<boolean> {
    try {
      const books = this.getBooks();
      const filteredBooks = books.filter(b => b.id !== bookId);

      this.saveBooks(filteredBooks);

      return true;
    } catch (error) {
      errorHandler.handleError(error, { 
        context: 'BookStorage.deleteBook',
        bookId 
      });
      return false;
    }
  }

  async exportData(): Promise<string> {
    return this.storage.getItem(this.STORAGE_KEY) || '[]';
  }

  async close(): Promise<void> {
    // No cleanup needed for localStorage
  }
}