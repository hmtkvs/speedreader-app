/**
 * ReaderModel
 * 
 * Core model handling reading logic, text processing, and reading state
 */
export interface ReaderSettings {
  wpm: number;
  fontSize: number;
  wordsAtTime: number;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
  ttsEnabled: boolean;
  ttsVoice: string;
}

/**
 * Structure for a word with highlighted portion
 */
export interface ReadingWord {
  before: string;
  highlight: string;
  after: string;
}

export class ReaderModel {
  private text: string = '';
  private words: string[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private settings: ReaderSettings;
  private timer: number | null = null;
  private onWordChange: ((words: ReadingWord[]) => void) | null = null;
  private onCompleted: (() => void) | null = null;
  private onPlayStateChange: ((isPlaying: boolean) => void) | null = null;

  constructor(initialSettings?: Partial<ReaderSettings>) {
    this.settings = {
      wpm: 300,
      fontSize: 24,
      wordsAtTime: 1,
      colorScheme: {
        background: '#ffffff',
        text: '#1a1a1a',
        highlight: '#ff5722'
      },
      ttsEnabled: false,
      ttsVoice: 'default',
      ...initialSettings
    };
  }

  /**
   * Set the text to be read
   */
  setText(text: string): void {
    if (!text || text.trim() === '') {
      console.error("ERROR: Attempted to set empty text in ReaderModel");
      this.text = '';
      this.words = [];
      this.currentIndex = 0;
      this.notifyWordChange();
      return;
    }
    
    this.text = text;
    
    // Split text into words and filter out empty strings
    this.words = text.split(/\s+/).filter(word => word.trim().length > 0);
    
    // Reset position
    this.currentIndex = 0;
    this.isPlaying = false;
    
    // Notify listeners that words have changed
    this.notifyWordChange();
    
    // Also emit a DOM event for components that might be listening
    try {
      document.dispatchEvent(new CustomEvent('reader-words-changed', {
        detail: {
          wordCount: this.words.length,
          sample: this.words.slice(0, 5).join(' ')
        }
      }));
    } catch (err) {
      console.error("Error emitting DOM event:", err);
    }
  }

  /**
   * Get the current progress as a value between 0 and 1
   */
  getProgress(): number {
    if (this.words.length === 0) return 0;
    return this.currentIndex / this.words.length;
  }

  /**
   * Start or resume reading
   */
  play(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.notifyPlayStateChange();
    this.startTimer();
  }

  /**
   * Pause reading
   */
  pause(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.notifyPlayStateChange();
    this.stopTimer();
  }

  /**
   * Skip forward by a number of words
   */
  forward(wordCount: number = 1): void {
    this.currentIndex = Math.min(this.words.length - 1, this.currentIndex + wordCount);
    this.notifyWordChange();
  }

  /**
   * Skip backward by a number of words
   */
  rewind(wordCount: number = 1): void {
    this.currentIndex = Math.max(0, this.currentIndex - wordCount);
    this.notifyWordChange();
  }

  /**
   * Update reader settings
   */
  updateSettings(settings: Partial<ReaderSettings>): void {
    this.settings = { ...this.settings, ...settings };
    
    // If reading speed is changed while playing, restart the timer
    if (this.isPlaying && settings.wpm !== undefined) {
      this.stopTimer();
      this.startTimer();
    }
  }

  /**
   * Get current reader settings
   */
  getSettings(): ReaderSettings {
    return { ...this.settings };
  }

  /**
   * Set position in text by index
   */
  setPosition(index: number): void {
    if (index >= 0 && index < this.words.length) {
      this.currentIndex = index;
      this.notifyWordChange();
    }
  }

  /**
   * Register callback for word change events
   */
  onWordsChange(callback: (words: ReadingWord[]) => void): void {
    this.onWordChange = callback;
  }

  /**
   * Register callback for completion events
   */
  onReadingCompleted(callback: () => void): void {
    this.onCompleted = callback;
  }

  /**
   * Register callback for play state change events
   */
  onPlayingStateChange(callback: (isPlaying: boolean) => void): void {
    this.onPlayStateChange = callback;
  }

  /**
   * Get current reading state
   */
  getState(): { isPlaying: boolean; currentIndex: number; totalWords: number } {
    return {
      isPlaying: this.isPlaying,
      currentIndex: this.currentIndex,
      totalWords: this.words.length
    };
  }

  /**
   * Start timer for autoplay reading
   */
  private startTimer(): void {
    this.stopTimer();
    
    // Calculate milliseconds per word based on WPM
    const msPerWord = (60 * 1000) / this.settings.wpm;
    
    this.timer = window.setInterval(() => {
      this.forward(this.settings.wordsAtTime);
      
      // Check if we've reached the end
      if (this.currentIndex >= this.words.length - 1) {
        this.pause();
        if (this.onCompleted) {
          this.onCompleted();
        }
      }
    }, msPerWord);
  }

  /**
   * Stop the autoplay timer
   */
  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Get current words to display based on wordsAtTime setting
   */
  private getCurrentWords(): ReadingWord[] {
    if (this.words.length === 0) {
      return [{ before: '', highlight: '', after: '' }];
    }

    // Get words to display
    const result: ReadingWord[] = [];
    for (let i = 0; i < this.settings.wordsAtTime; i++) {
      const index = this.currentIndex + i;
      if (index < this.words.length) {
        // For each word, determine the optimal reading position
        const word = this.words[index];
        const highlightPos = this.getOptimalReadingPosition(word);
        
        // Split the word into before, highlight, and after segments
        result.push({
          before: word.substring(0, highlightPos),
          highlight: word.charAt(highlightPos) || '',
          after: word.substring(highlightPos + 1)
        });
      }
    }
    
    return result.length > 0 ? result : [{ before: '', highlight: '', after: '' }];
  }

  /**
   * Get the optimal reading position for highlighting a character in a word
   * Based on research about optimal recognition point (ORP)
   */
  private getOptimalReadingPosition(word: string): number {
    // Ensure we handle edge cases
    if (!word || word.length === 0) {
      return 0;
    }
    
    // For short words, highlight near the beginning
    if (word.length <= 3) return 0;
    if (word.length <= 5) return 1;
    
    // For medium words, highlight near 1/3 of the way in
    if (word.length <= 9) return Math.floor(word.length / 3);
    
    // For long words, highlight around 1/4 of the way in
    return Math.floor(word.length / 4);
  }

  /**
   * Notify listeners that the current word has changed
   */
  private notifyWordChange(): void {
    if (this.onWordChange) {
      const words = this.getCurrentWords();
      this.onWordChange(words);
    }
  }

  /**
   * Notify subscribers about play state changes
   */
  private notifyPlayStateChange(): void {
    if (this.onPlayStateChange) {
      this.onPlayStateChange(this.isPlaying);
    }
  }

  /**
   * Clean up any resources
   */
  cleanup(): void {
    this.stopTimer();
  }
} 