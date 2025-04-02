import axios from 'axios';
import { ErrorHandler } from './errorHandler';

const errorHandler = ErrorHandler.getInstance();

interface TTSOptions {
  voice: string;
  speed: number;
  format: string;
  returnTimestamps: boolean;
}

export class TextToSpeech {
  private static instance: TextToSpeech;
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
  
  // Map between WPM and TTS speed factor
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

  static getInstance(): TextToSpeech {
    if (!TextToSpeech.instance) {
      TextToSpeech.instance = new TextToSpeech();
    }
    return TextToSpeech.instance;
  }

  setOptions(options: Partial<TTSOptions>) {
    this.options = { ...this.options, ...options };
  }

  getOptions(): TTSOptions {
    return { ...this.options };
  }

  setHighlightCallback(callback: (index: number) => void) {
    this.onHighlight = callback;
  }

  setCompletionCallback(callback: () => void) {
    this.onComplete = callback;
  }

  /**
   * Convert WPM to TTS speed factor
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
        context: 'TextToSpeech.speak',
        textLength: text.length
      });
      throw new Error('Failed to generate speech');
    }
  }

  private calculateWordTiming() {
    if (!this.audio || !this.text || !this.onHighlight) return;

    const words = this.text.split(/\s+/);
    const totalDuration = this.audio.duration;
    const msPerWord = (totalDuration * 1000) / words.length;

    let currentTime = 0;
    const wordTimeouts: number[] = [];

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

  getPlaybackState(): { isPlaying: boolean; currentTime: number; duration: number } {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.audio?.currentTime || 0,
      duration: this.audio?.duration || 0
    };
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  resume(): void {
    if (this.audio) {
      this.audio.play().catch(err => {
        errorHandler.handleError(err, { context: 'TextToSpeech.resume' });
      });
    }
  }

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

  setSpeed(speed: number) {
    this.options.speed = speed;
    // For speed changes, we need to re-generate the audio
  }

  setVoice(voice: string) {
    this.options.voice = voice;
    // For voice changes, we need to re-generate the audio
  }

  private handleAudioEnd() {
    this.isPlaying = false;
    
    // Release object URL
    if (this.audio?.src && this.audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }
    
    // Call completion callback if exists
    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): { id: string; name: string; langCode?: string; quality?: string }[] {
    return [
      // English/American Female - af_*
      { id: 'af_heart', name: 'Heart', langCode: 'en', quality: 'A' },
      { id: 'af_bella', name: 'Bella', langCode: 'en', quality: 'A-' },
      { id: 'af_alloy', name: 'Alloy', langCode: 'en', quality: 'C' },
      { id: 'af_aoede', name: 'Aoede', langCode: 'en', quality: 'C+' },
      { id: 'af_jessica', name: 'Jessica', langCode: 'en', quality: 'D' },
      { id: 'af_kore', name: 'Kore', langCode: 'en', quality: 'C+' },
      { id: 'af_nicole', name: 'Nicole', langCode: 'en', quality: 'B-' },
      { id: 'af_nova', name: 'Nova', langCode: 'en', quality: 'C' },
      { id: 'af_river', name: 'River', langCode: 'en', quality: 'D' },
      { id: 'af_sarah', name: 'Sarah', langCode: 'en', quality: 'C+' },
      { id: 'af_sky', name: 'Sky', langCode: 'en', quality: 'C-' },

      // English/American Male - am_*
      { id: 'am_echo', name: 'Echo', langCode: 'en', quality: 'D' },
      { id: 'am_onyx', name: 'Onyx', langCode: 'en', quality: 'D' },
      { id: 'am_adam', name: 'Adam', langCode: 'en', quality: 'F+' },
      { id: 'am_eric', name: 'Eric', langCode: 'en', quality: 'D' },
      { id: 'am_fenrir', name: 'Fenrir', langCode: 'en', quality: 'C+' },
      { id: 'am_liam', name: 'Liam', langCode: 'en', quality: 'D' },
      { id: 'am_michael', name: 'Michael', langCode: 'en', quality: 'C+' },
      { id: 'am_puck', name: 'Puck', langCode: 'en', quality: 'C+' },
      { id: 'am_santa', name: 'Santa', langCode: 'en', quality: 'D-' },

      // British English Female - bf_*
      { id: 'bf_alice', name: 'Alice', langCode: 'en-GB', quality: 'D' },
      { id: 'bf_emma', name: 'Emma', langCode: 'en-GB', quality: 'B-' },
      { id: 'bf_isabella', name: 'Isabella', langCode: 'en-GB', quality: 'C' },
      { id: 'bf_lily', name: 'Lily', langCode: 'en-GB', quality: 'D' },

      // British English Male - bm_*
      { id: 'bm_daniel', name: 'Daniel', langCode: 'en-GB', quality: 'D' },
      { id: 'bm_fable', name: 'Fable', langCode: 'en-GB', quality: 'C' },
      { id: 'bm_george', name: 'George', langCode: 'en-GB', quality: 'C' },
      { id: 'bm_lewis', name: 'Lewis', langCode: 'en-GB', quality: 'D+' },

      // Japanese - jf_* and jm_*
      { id: 'jf_alpha', name: 'Alpha', langCode: 'ja', quality: 'C+' },
      { id: 'jf_gongitsune', name: 'Gongitsune', langCode: 'ja', quality: 'C' },
      { id: 'jf_nezumi', name: 'Nezumi', langCode: 'ja', quality: 'C-' },
      { id: 'jf_tebukuro', name: 'Tebukuro', langCode: 'ja', quality: 'C' },
      { id: 'jm_kumo', name: 'Kumo', langCode: 'ja', quality: 'C-' },

      // Chinese Mandarin - zf_* and zm_*
      { id: 'zf_xiaobei', name: 'Xiao Bei', langCode: 'zh', quality: 'D' },
      { id: 'zf_xiaoni', name: 'Xiao Ni', langCode: 'zh', quality: 'D' },
      { id: 'zf_xiaoxiao', name: 'Xiao Xiao', langCode: 'zh', quality: 'D' },
      { id: 'zf_xiaoyi', name: 'Xiao Yi', langCode: 'zh', quality: 'D' },
      { id: 'zm_yunjian', name: 'Yun Jian', langCode: 'zh', quality: 'D' },
      { id: 'zm_yunxi', name: 'Yun Xi', langCode: 'zh', quality: 'D' },
      { id: 'zm_yunxia', name: 'Yun Xia', langCode: 'zh', quality: 'D' },
      { id: 'zm_yunyang', name: 'Yun Yang', langCode: 'zh', quality: 'D' },

      // Spanish - ef_* and em_*
      { id: 'ef_dora', name: 'Dora', langCode: 'es' },
      { id: 'em_alex', name: 'Alex', langCode: 'es' },
      { id: 'em_santa', name: 'Santa', langCode: 'es' },

      // French - ff_*
      { id: 'ff_siwis', name: 'Siwis', langCode: 'fr', quality: 'B-' },

      // Hindi - hf_* and hm_*
      { id: 'hf_alpha', name: 'Alpha', langCode: 'hi', quality: 'C' },
      { id: 'hf_beta', name: 'Beta', langCode: 'hi', quality: 'C' },
      { id: 'hm_omega', name: 'Omega', langCode: 'hi', quality: 'C' },
      { id: 'hm_psi', name: 'Psi', langCode: 'hi', quality: 'C' },

      // Italian - if_* and im_*
      { id: 'if_sara', name: 'Sara', langCode: 'it', quality: 'C' },
      { id: 'im_nicola', name: 'Nicola', langCode: 'it', quality: 'C' },

      // Portuguese - pf_* and pm_*
      { id: 'pf_dora', name: 'Dora', langCode: 'pt-BR' },
      { id: 'pm_alex', name: 'Alex', langCode: 'pt-BR' },
      { id: 'pm_santa', name: 'Santa', langCode: 'pt-BR' }
    ];
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
  }
}