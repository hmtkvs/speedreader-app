import { EventCallback, ColorScheme, COLOR_SCHEMES, FONT_FAMILIES } from './types';
import { StatisticsService } from '../utils/statistics';
import { BookStorage } from '../utils/storage';
import { TextToSpeech } from '../utils/tts';

interface HighlightedWord {
  before: string;
  highlight: string;
  after: string;
}

export class ReaderModel {
  private _text: string = '';
  private _words: string[] = [];
  private _currentIndex: number = 0;
  private _isPlaying: boolean = false;
  private _wpm: number = 200;
  private _wordsAtTime: number = 1;
  private _currentWords: HighlightedWord[] = [];
  private _progress: number = 0;
  private _timeRemaining: string = '0:00';
  private _timer: number | null = null;
  private _colorScheme: ColorScheme = { 
    ...COLOR_SCHEMES[0], 
    highlight: '#FF3B30',
    font: FONT_FAMILIES[0].value
  };
  private _fontSize: number = 60;
  private _eventListeners: { [key: string]: EventCallback[] } = {};
  private storage: BookStorage;
  private statistics: StatisticsService;
  private _useTTS: boolean = false;
  private tts: TextToSpeech;
  private _ttsOptions = {
    voice: 'af_bella',
    format: 'mp3',
    returnTimestamps: false
  };

  constructor() {
    this.storage = new BookStorage();
    this.statistics = StatisticsService.getInstance();
    this.tts = TextToSpeech.getInstance();
    this.tts.setHighlightCallback(this.handleTTSHighlight.bind(this));
    this.tts.setCompletionCallback(this.handleTTSComplete.bind(this));
  }

  async getAllBooks() {
    return this.storage.getAllBooks();
  }

  async loadBook(bookId: string) {
    const content = await this.storage.getBookContent(bookId);
    if (content) {
      this.setText(content);
      return true;
    }
    return false;
  }

  async deleteBook(bookId: string) {
    return this.storage.deleteBook(bookId);
  }

  async addBook(content: string, title: string): Promise<string | null> {
    try {
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      return await this.storage.addBook(content, {
        title: title,
        wordCount: wordCount
      });
    } catch (error) {
      console.error('Error adding book:', error);
      return null;
    }
  }

  on(event: string, callback: EventCallback) {
    if (!this._eventListeners[event]) {
      this._eventListeners[event] = [];
    }
    this._eventListeners[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (this._eventListeners[event]) {
      this._eventListeners[event] = this._eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string) {
    if (this._eventListeners[event]) {
      this._eventListeners[event].forEach(callback => callback());
    }
  }

  private getHighlightIndex(word: string): number {
    if (word.length <= 4) return 0;
    if (word.length <= 9) return 2;
    return 3;
  }

  private highlightWord(word: string): HighlightedWord {
    const highlightIndex = this.getHighlightIndex(word);
    return {
      before: word.slice(0, highlightIndex),
      highlight: word[highlightIndex] || '',
      after: word.slice(highlightIndex + 1)
    };
  }

  get currentWords(): HighlightedWord[] {
    return this._currentWords;
  }

  get readText(): string {
    return this._words.slice(0, this._currentIndex).join(' ');
  }

  get unreadText(): string {
    return this._words.slice(this._currentIndex + this._wordsAtTime).join(' ');
  }

  get progress(): number {
    return this._progress;
  }

  get timeRemaining(): string {
    return this._timeRemaining;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get wpm(): number {
    return this._wpm;
  }

  get colorScheme(): ColorScheme {
    return this._colorScheme;
  }

  get useTTS(): boolean {
    return this._useTTS;
  }

  set useTTS(value: boolean) {
    if (this._useTTS !== value) {
      this._useTTS = value;
      
      // If turning off TTS, stop audio
      if (!value && this._isPlaying) {
        this.tts.stop();
      }
      
      // If turning on TTS and reading is active, start TTS
      if (value && this._isPlaying) {
        this.startTTS();
      }
      
      this.emit('propertyChange');
    }
  }

  set colorScheme(scheme: ColorScheme) {
    if (this._colorScheme !== scheme) {
      this._colorScheme = { 
        ...scheme, 
        highlight: this._colorScheme.highlight,
        font: this._colorScheme.font
      };
      this.emit('propertyChange');
    }
  }

  setHighlightColor(color: string) {
    if (this._colorScheme.highlight !== color) {
      this._colorScheme = { ...this._colorScheme, highlight: color };
      this.emit('propertyChange');
    }
  }

  setFont(fontFamily: string) {
    if (this._colorScheme.font !== fontFamily) {
      this._colorScheme = { ...this._colorScheme, font: fontFamily };
      this.emit('propertyChange');
    }
  }

  set wpm(value: number) {
    if (this._wpm !== value) {
      this._wpm = value;
      this.updateTimeRemaining();
      
      // If currently playing, restart with new WPM
      if (this._isPlaying) {
        this.pause();
        this.play();
      }
      
      this.emit('propertyChange');
    }
  }

  get wordsAtTime(): number {
    return this._wordsAtTime;
  }

  set wordsAtTime(value: number) {
    if (this._wordsAtTime !== value && value >= 1 && value <= 5) {
      this._wordsAtTime = value;
      this.showCurrentWords();
      this.updateTimeRemaining();
      
      // If currently playing, restart with new words at time
      if (this._isPlaying) {
        this.pause();
        this.play();
      }
      
      this.emit('propertyChange');
    }
  }

  setText(text: string) {
    this._text = text;
    this._words = text.split(/\s+/).filter(word => word.length > 0);
    this._currentIndex = 0;
    this.updateTimeRemaining();
    this.showCurrentWords();
  }

  private getWordDuration(words: string[]): number {
    // Calculate base duration from WPM
    const minuteInMs = 60000;
    const baseWpmDuration = minuteInMs / this._wpm;

    // Apply length-based adjustments
    const maxLength = Math.max(...words.map(word => word.length));
    const lengthFactor = Math.max(1, maxLength / 5); // Longer words get more time
    
    return baseWpmDuration * lengthFactor;
  }

  private showCurrentWords() {
    if (this._currentIndex >= this._words.length) {
      this.pause();
      return;
    }

    const endIndex = Math.min(this._currentIndex + this._wordsAtTime, this._words.length);
    const currentWords = this._words.slice(this._currentIndex, endIndex);
    this._currentWords = currentWords.map(word => this.highlightWord(word));
    this._progress = (this._currentIndex / this._words.length) * 100;

    this.emit('propertyChange');
  }

  private updateTimeRemaining() {
    const wordsRemaining = this._words.length - this._currentIndex;
    const minutesRemaining = wordsRemaining / (this._wpm * this._wordsAtTime);
    const minutes = Math.floor(minutesRemaining);
    const seconds = Math.floor((minutesRemaining - minutes) * 60);
    this._timeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this.emit('propertyChange');
  }

  /**
   * Start text-to-speech for current text
   */
  private async startTTS() {
    if (!this._useTTS || !this._text) return;
    
    try {
      // Get remaining text from current position
      const remainingText = this._words.slice(this._currentIndex).join(' ');
      
      // Start TTS with current WPM
      await this.tts.speak(remainingText, this._wpm, this._currentIndex);
    } catch (error) {
      console.error('TTS error:', error);
      // Fall back to regular reading if TTS fails
    }
  }

  /**
   * Handle TTS highlighting a specific word
   */
  private handleTTSHighlight(wordIndex: number) {
    // TTS is handling the words, so update internal index
    const actualIndex = this._currentIndex + wordIndex;
    if (actualIndex < this._words.length) {
      this._currentIndex = actualIndex;
      this.showCurrentWords();
      this.updateTimeRemaining();
    }
  }

  /**
   * Handle TTS completion
   */
  private handleTTSComplete() {
    this.pause();
  }
  
  /**
   * Set TTS voice
   */
  setTTSVoice(voice: string) {
    this._ttsOptions.voice = voice;
    this.tts.setOptions({
      voice,
      format: this._ttsOptions.format,
      returnTimestamps: this._ttsOptions.returnTimestamps
    });
    
    // If currently playing with TTS, restart with new voice
    if (this._useTTS && this._isPlaying) {
      this.startTTS();
    }
  }
  
  /**
   * Get available TTS voices
   */
  getTTSVoices() {
    return this.tts.getAvailableVoices();
  }

  play() {
    if (this._isPlaying) return;
    
    this._isPlaying = true;
    this.statistics.startSession(this._wpm);
    this.emit('propertyChange');
    
    if (this._useTTS) {
      // Use TTS for playback
      this.startTTS();
    } else {
      // Use visual reader
      this.processNextWords();
    }
  }

  pause() {
    this._isPlaying = false;
    this.statistics.endSession(this._wpm, this._fontSize);
    this.emit('propertyChange');
    
    if (this._useTTS) {
      this.tts.pause();
    }
    
    if (this._timer !== null) {
      window.clearTimeout(this._timer);
      this._timer = null;
    }
  }

  private processNextWords() {
    if (!this._isPlaying || this._currentIndex >= this._words.length) {
      this.pause();
      return;
    }

    this.showCurrentWords();
    const currentWords = this._words.slice(
      this._currentIndex,
      this._currentIndex + this._wordsAtTime
    );
    const duration = this.getWordDuration(currentWords);
    
    this._timer = window.setTimeout(() => {
      this._currentIndex += this._wordsAtTime;
      this.statistics.updateWordCount(this._wordsAtTime);
      this.updateTimeRemaining();
      this.processNextWords();
    }, duration);
  }

  forward() {
    this._currentIndex = Math.min(
      this._words.length - 1,
      this._currentIndex + this._wordsAtTime
    );
    this.showCurrentWords();
    
    // If using TTS, stop current playback (will restart if playing)
    if (this._useTTS && this._isPlaying) {
      this.tts.stop();
      this.startTTS();
    }
  }

  rewind() {
    this._currentIndex = Math.max(0, this._currentIndex - this._wordsAtTime);
    this.showCurrentWords();
    
    // If using TTS, stop current playback (will restart if playing)
    if (this._useTTS && this._isPlaying) {
      this.tts.stop();
      this.startTTS();
    }
  }
}