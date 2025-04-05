/**
 * Simplified types for use in adapter components during migration
 */

/**
 * Simplified Reader Model interface
 * 
 * This is a streamlined version of the ReaderModel interface that includes
 * only the methods needed for adapter components during the migration process.
 */
export interface SimplifiedReaderModel {
  /** Add a book to the reader */
  addBook: (text: string, name: string) => Promise<string>;
  
  /** Load a book into the reader */
  loadBook: (id: string) => Promise<any>;
  
  /** Get all books from the reader */
  getAllBooks?: () => Promise<Array<any>>;
  
  /** Rewind to the previous section */
  rewind: () => void;
  
  /** Move forward to the next section */
  forward: () => void;
  
  /** Set the text content */
  setText: (text: string) => void;
  
  /** Start playing the reader */
  play: () => void;
  
  /** Pause the reader */
  pause: () => void;
  
  /** Set the TTS voice to use */
  setTTSVoice?: (voiceId: string) => void;
  
  /** Current reading speed in words per minute */
  wpm?: number;
} 