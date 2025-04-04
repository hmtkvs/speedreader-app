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
    this.text = text;
    this.words = text
      .split(/\s+/)
      .filter(word => word.trim() !== '');
    this.currentIndex = 0;
    this.isPlaying = false;
    this.notifyWordChange();
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
        
        result.push({
          before: word.substring(0, highlightPos),
          highlight: word.substring(highlightPos, highlightPos + 1),
          after: word.substring(highlightPos + 1)
        });
      }
    }
    
    return result;
  }

  /**
   * Determine the optimal character to highlight for reading
   */
  private getOptimalReadingPosition(word: string): number {
    // Simple algorithm:
    // - For words of 1-4 characters: highlight first character
    // - For words of 5-9 characters: highlight second character
    // - For words of 10+ characters: highlight third character
    if (word.length <= 4) return 0;
    if (word.length <= 9) return 1;
    return 2;
  }

  /**
   * Notify subscribers about word changes
   */
  private notifyWordChange(): void {
    if (this.onWordChange) {
      this.onWordChange(this.getCurrentWords());
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