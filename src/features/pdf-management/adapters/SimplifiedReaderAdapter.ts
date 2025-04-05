import { ReaderModel } from "../../../models/reader";
import { SimplifiedReaderModel } from "../../../types/simplified";

/**
 * Adapter to make ReaderModel conform to the SimplifiedReaderModel interface
 * for use in components during the migration process
 */
export class SimplifiedReaderAdapter implements SimplifiedReaderModel {
  private reader: ReaderModel;

  constructor(reader: ReaderModel) {
    this.reader = reader;
  }

  /**
   * Add a book to the reader
   * @param text Text content of the book
   * @param name Name of the book
   * @returns Promise that resolves with the book ID
   */
  async addBook(text: string, name: string): Promise<string> {
    // The actual ReaderModel may not have this method, but we implement it
    // for compatibility with the SimplifiedReaderModel interface
    this.reader.setText(text);
    return Promise.resolve(name); // Use name as ID for simplicity
  }

  /**
   * Load a book into the reader
   * @param id ID of the book to load
   * @returns Promise that resolves when the book is loaded
   */
  async loadBook(id: string): Promise<any> {
    // In the simplified version, we don't need to do anything here
    return Promise.resolve();
  }

  /**
   * Get all books from the reader
   * @returns Promise that resolves with an array of books
   */
  async getAllBooks(): Promise<Array<any>> {
    // Return an empty array since the ReaderModel doesn't store books
    return Promise.resolve([]);
  }

  /**
   * Rewind to the previous section
   */
  rewind(): void {
    this.reader.rewind();
  }

  /**
   * Move forward to the next section
   */
  forward(): void {
    this.reader.forward();
  }

  /**
   * Set the text content
   * @param text Text to set
   */
  setText(text: string): void {
    console.log("DEBUG: SimplifiedReaderAdapter.setText called with text length:", text?.length || 0);
    console.warn("💫 ADAPTER: Setting text in reader model with length:", text?.length || 0);
    
    // Make sure we have text before calling setText
    if (!text) {
      console.error("ADAPTER ERROR: Attempted to set empty text");
      return;
    }
    
    try {
      // Actually call setText on the reader model
      this.reader.setText(text);
      
      // Log success
      console.log("DEBUG: Text successfully set via adapter to reader model");
      
      // Dispatch an event to notify that text was updated via the adapter
      document.dispatchEvent(new CustomEvent('reader-text-updated-via-adapter', { 
        detail: { length: text.length } 
      }));
    } catch (err) {
      console.error("ADAPTER ERROR: Failed to set text in reader model", err);
    }
  }

  /**
   * Start playing the reader
   */
  play(): void {
    this.reader.play();
  }

  /**
   * Pause the reader
   */
  pause(): void {
    this.reader.pause();
  }

  /**
   * Set the TTS voice to use
   * @param voiceId ID of the voice to use
   */
  setTTSVoice(voiceId: string): void {
    // The actual implementation may vary
    // For ReaderModel, we need to use setTTSVoice directly
    this.reader.setTTSVoice(voiceId);
  }

  /**
   * Current reading speed in words per minute
   */
  get wpm(): number {
    return this.reader.getSettings().wpm;
  }
} 