import axios from 'axios';
import { ErrorHandler } from '../../../utils/errorHandler';

const errorHandler = ErrorHandler.getInstance();

/**
 * Options for text-to-speech synthesis
 */
export interface TTSOptions {
  /** Voice ID to use for synthesis */
  voice: string;
  /** Playback speed factor */
  speed: number;
  /** Output audio format */
  format: string;
  /** Whether to request word timestamps */
  returnTimestamps: boolean;
}

/**
 * Represents the playback state of TTS audio
 */
export interface TTSPlaybackState {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration of current audio in seconds */
  duration: number;
}

/**
 * Voice model information
 */
export interface TTSVoice {
  /** Unique voice identifier */
  id: string;
  /** Display name of the voice */
  name: string;
  /** Language code (e.g., 'en-US') */
  langCode?: string;
  /** Voice quality indicator */
  quality?: string;
}

/**
 * Service for text-to-speech functionality
 * 
 * Provides an interface to convert text to speech using API services
 * and manage audio playback with word highlighting.
 */
export class TTSService {
  private static instance: TTSService;
  private audio: HTMLAudioElement | null = null;
  private currentWordIndex: number = 0;
  private text: string = '';
  private onHighlight: ((index: number) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private isPlaying: boolean = false;
  private options: TTSOptions = {
    voice: 'af_bella',
    speed: 1,
    format: 'mp3',
    returnTimestamps: false
  };
  
  /**
   * Map between WPM (words per minute) and TTS speed factor
   * Used to convert reading speed to API speed parameter
   */
  private readonly WPM_SPEED_MAP = [
    { wpm: 100, speed: 0.5 },
    { wpm: 200, speed: 1.0 },
    { wpm: 300, speed: 1.5 },
    { wpm: 400, speed: 2.0 },
    { wpm: 500, speed: 2.5 },
    { wpm: 600, speed: 3.0 },
    { wpm: 800, speed: 3.5 },
    { wpm: 1000, speed: 4.0 }
  ];

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.audio = new Audio();
    this.audio.addEventListener('ended', this.handleAudioEnd.bind(this));
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
    });
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
    });
  }

  /**
   * Get singleton instance of TTSService
   */
  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  /**
   * Update TTS options
   */
  setOptions(options: Partial<TTSOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current TTS options
   */
  getOptions(): TTSOptions {
    return { ...this.options };
  }

  /**
   * Set callback for word highlighting
   * 
   * @param callback Function to call with the index of the current word
   */
  setHighlightCallback(callback: (index: number) => void): void {
    this.onHighlight = callback;
  }

  /**
   * Set callback for speech completion
   * 
   * @param callback Function to call when speech playback completes
   */
  setCompletionCallback(callback: () => void): void {
    this.onComplete = callback;
  }

  /**
   * Convert WPM to TTS speed factor
   * 
   * @param wpm Words per minute reading speed
   * @returns Speed factor for TTS API
   */
  convertWpmToSpeed(wpm: number): number {
    // Find the appropriate speed for the given WPM
    for (let i = this.WPM_SPEED_MAP.length - 1; i >= 0; i--) {
      if (wpm >= this.WPM_SPEED_MAP[i].wpm) {
        // If exact match, return the mapped speed
        if (wpm === this.WPM_SPEED_MAP[i].wpm) {
          return this.WPM_SPEED_MAP[i].speed;
        }
        
        // If between two values, interpolate
        if (i < this.WPM_SPEED_MAP.length - 1) {
          const lowerWpm = this.WPM_SPEED_MAP[i].wpm;
          const upperWpm = this.WPM_SPEED_MAP[i + 1].wpm;
          const lowerSpeed = this.WPM_SPEED_MAP[i].speed;
          const upperSpeed = this.WPM_SPEED_MAP[i + 1].speed;
          
          // Linear interpolation
          const factor = (wpm - lowerWpm) / (upperWpm - lowerWpm);
          return lowerSpeed + factor * (upperSpeed - lowerSpeed);
        }
        
        return this.WPM_SPEED_MAP[i].speed;
      }
    }
    
    // Default to lowest speed if WPM is very low
    return this.WPM_SPEED_MAP[0].speed;
  }

  /**
   * Synthesize speech from text and play it
   * 
   * @param text Text to convert to speech
   * @param wpm Words per minute reading speed
   * @param startIndex Starting word index for highlighting
   */
  async speak(text: string, wpm: number = 300, startIndex: number = 0): Promise<void> {
    try {
      if (!text || text.trim() === '') {
        throw new Error('Text is required for speech synthesis');
      }
      
      // Stop any current audio
      this.stop();
      
      this.text = text;
      this.currentWordIndex = startIndex;
      
      // If too much text, truncate for API (max ~1000 chars recommended)
      const truncatedText = text.length > 1000 ? 
        text.split(' ').slice(0, 100).join(' ') + '...' : 
        text;
      
      // Calculate speed based on WPM
      const ttsSpeed = this.convertWpmToSpeed(wpm);
      
      // Make API request to DeepInfra
      const response = await axios.post(
        'https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M',
        {
          text: truncatedText,
          preset_voice: [this.options.voice],
          speed: ttsSpeed,
          output_format: this.options.format,
          return_timestamps: this.options.returnTimestamps
        },
        {
          headers: {
            'Authorization': `bearer ${import.meta.env.VITE_DEEPINFRA_TOKEN || '0jxRzr6VTMJsMSnR2NomXgP0PKDkEEw5'}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob'
        }
      );

      // Convert response to audio
      const audioBlob = new Blob([response.data], { type: `audio/${this.options.format}` });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (this.audio) {
        this.audio.src = audioUrl;
        this.audio.playbackRate = 1.0; // Use API's speed control
        await this.audio.play();
        
        // Calculate word timing for highlighting
        this.calculateWordTiming();
      }
    } catch (error) {
      errorHandler.handleError(error as Error, { 
        context: 'TTSService.speak',
        textLength: text.length
      });
      throw new Error('Failed to generate speech');
    }
  }

  /**
   * Calculate timing for word highlighting during playback
   */
  private calculateWordTiming(): void {
    if (!this.audio || !this.text || !this.onHighlight) return;

    const words = this.text.split(/\s+/);
    const totalDuration = this.audio.duration;
    const msPerWord = (totalDuration * 1000) / words.length;

    let currentTime = 0;
    const wordTimeouts: NodeJS.Timeout[] = [];

    words.forEach((_, index) => {
      const timeout = setTimeout(() => {
        if (this.onHighlight && this.isPlaying) {
          this.onHighlight(index);
        }
      }, currentTime);
      
      wordTimeouts.push(timeout);
      currentTime += msPerWord;
    });

    // Store timeouts to clear them when needed
    (this.audio as any).wordTimeouts = wordTimeouts;
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): TTSPlaybackState {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.audio?.currentTime || 0,
      duration: this.audio?.duration || 0
    };
  }

  /**
   * Pause audio playback
   */
  pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Resume audio playback
   */
  resume(): void {
    if (this.audio) {
      this.audio.play().catch(err => {
        errorHandler.handleError(err, { context: 'TTSService.resume' });
      });
    }
  }

  /**
   * Stop audio playback and reset state
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      
      // Clear any word timing timeouts
      const timeouts = (this.audio as any).wordTimeouts;
      if (Array.isArray(timeouts)) {
        timeouts.forEach(timeout => clearTimeout(timeout));
        (this.audio as any).wordTimeouts = [];
      }
      
      // Release object URL
      if (this.audio.src && this.audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audio.src);
        this.audio.src = '';
      }
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.options.speed = speed;
    // For speed changes, we need to re-generate the audio
  }

  /**
   * Set voice for speech synthesis
   */
  setVoice(voice: string): void {
    this.options.voice = voice;
    // For voice changes, we need to re-generate the audio
  }

  /**
   * Handle audio playback completion
   */
  private handleAudioEnd(): void {
    this.isPlaying = false;
    
    // Release object URL
    if (this.audio?.src && this.audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }
    
    // Call completion callback
    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Get list of available voices
   */
  getAvailableVoices(): TTSVoice[] {
    return [
      { id: 'af_bella', name: 'Bella (African English)' },
      { id: 'au_adelaide', name: 'Adelaide (Australian English)' },
      { id: 'br_ana', name: 'Ana (Brazilian Portuguese)' },
      { id: 'ca_clara', name: 'Clara (Canadian English)' },
      { id: 'de_eva', name: 'Eva (German)' },
      { id: 'es_esperanza', name: 'Esperanza (Spanish)' },
      { id: 'fr_eloise', name: 'Eloise (French)' },
      { id: 'in_arya', name: 'Arya (Indian English)' },
      { id: 'ir_aoife', name: 'Aoife (Irish English)' },
      { id: 'it_alba', name: 'Alba (Italian)' },
      { id: 'jp_akemi', name: 'Akemi (Japanese)' },
      { id: 'kr_bora', name: 'Bora (Korean)' },
      { id: 'ph_maricel', name: 'Maricel (Filipino)' },
      { id: 'pl_franka', name: 'Franka (Polish)' },
      { id: 'pt_ines', name: 'Ines (Portuguese)' },
      { id: 'ru_anastasia', name: 'Anastasia (Russian)' },
      { id: 'sg_daisy', name: 'Daisy (Singaporean English)' },
      { id: 'tr_aylin', name: 'Aylin (Turkish)' },
      { id: 'uk_elsie', name: 'Elsie (British English)' },
      { id: 'us_amber', name: 'Amber (American English)' },
      { id: 'us_beth', name: 'Beth (American English)' },
      { id: 'us_christopher', name: 'Christopher (American English)' },
      { id: 'us_cora', name: 'Cora (American English)' },
      { id: 'us_daniel', name: 'Daniel (American English)' },
      { id: 'us_dave', name: 'Dave (American English)' },
      { id: 'us_dorothy', name: 'Dorothy (American English)' },
      { id: 'us_ethan', name: 'Ethan (American English)' },
      { id: 'us_gregory', name: 'Gregory (American English)' },
      { id: 'us_harper', name: 'Harper (American English)' },
      { id: 'us_isaac', name: 'Isaac (American English)' },
      { id: 'us_james', name: 'James (American English)' },
      { id: 'us_jane', name: 'Jane (American English)' },
      { id: 'us_jason', name: 'Jason (American English)' },
      { id: 'us_jeremy', name: 'Jeremy (American English)' },
      { id: 'us_jesse', name: 'Jesse (American English)' },
      { id: 'us_joanna', name: 'Joanna (American English)' },
      { id: 'us_john', name: 'John (American English)' },
      { id: 'us_joseph', name: 'Joseph (American English)' },
      { id: 'us_joshua', name: 'Joshua (American English)' },
      { id: 'us_julie', name: 'Julie (American English)' },
      { id: 'us_kathleen', name: 'Kathleen (American English)' },
      { id: 'us_kathy', name: 'Kathy (American English)' },
      { id: 'us_kayla', name: 'Kayla (American English)' },
      { id: 'us_kimberly', name: 'Kimberly (American English)' },
      { id: 'us_laura', name: 'Laura (American English)' },
      { id: 'us_linda', name: 'Linda (American English)' },
      { id: 'us_lisa', name: 'Lisa (American English)' },
      { id: 'us_madison', name: 'Madison (American English)' },
      { id: 'us_mark', name: 'Mark (American English)' },
      { id: 'us_matthew', name: 'Matthew (American English)' },
      { id: 'us_michael', name: 'Michael (American English)' },
      { id: 'us_nancy', name: 'Nancy (American English)' },
      { id: 'us_nathan', name: 'Nathan (American English)' },
      { id: 'us_nicholas', name: 'Nicholas (American English)' },
      { id: 'us_olivia', name: 'Olivia (American English)' },
      { id: 'us_patricia', name: 'Patricia (American English)' },
      { id: 'us_paul', name: 'Paul (American English)' },
      { id: 'us_rebecca', name: 'Rebecca (American English)' },
      { id: 'us_robert', name: 'Robert (American English)' },
      { id: 'us_ronald', name: 'Ronald (American English)' },
      { id: 'us_samantha', name: 'Samantha (American English)' },
      { id: 'us_sara', name: 'Sara (American English)' },
      { id: 'us_stephanie', name: 'Stephanie (American English)' },
      { id: 'us_steven', name: 'Steven (American English)' },
      { id: 'us_susan', name: 'Susan (American English)' },
      { id: 'us_thomas', name: 'Thomas (American English)' },
      { id: 'us_timothy', name: 'Timothy (American English)' },
      { id: 'us_victoria', name: 'Victoria (American English)' },
      { id: 'us_zachary', name: 'Zachary (American English)' },
    ];
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stop();
    
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onpause = null;
      this.audio.onplay = null;
      this.audio = null;
    }
    
    this.onHighlight = null;
    this.onComplete = null;
  }
} 