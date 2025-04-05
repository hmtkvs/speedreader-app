import { useState, useCallback, useEffect } from 'react';
import { ReaderModel, ReaderSettings, ReadingWord } from '../models/ReaderModel';
import { TTSService } from '../services/TTSService';

export interface UseReaderOptions {
  initialSettings?: Partial<ReaderSettings>;
  enableTTS?: boolean;
}

export interface UseReaderResult {
  currentWords: ReadingWord[];
  isPlaying: boolean;
  progress: number;
  settings: ReaderSettings;
  play: () => void;
  pause: () => void;
  forward: (count?: number) => void;
  rewind: (count?: number) => void;
  setText: (text: string) => void;
  updateSettings: (settings: Partial<ReaderSettings>) => void;
  toggleTTS: () => void;
  isTTSEnabled: boolean;
}

/**
 * Custom hook for reader functionality
 * 
 * Provides an interface for components to control the reading experience
 * 
 * @param options Configuration options
 * @returns Reader state and control methods
 */
export function useReader(options: UseReaderOptions = {}): UseReaderResult {
  const [readerModel] = useState(() => new ReaderModel(options.initialSettings));
  const [ttsService] = useState(() => TTSService.getInstance());
  const [currentWords, setCurrentWords] = useState<ReadingWord[]>([{ before: '', highlight: '', after: '' }]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isTTSEnabled, setIsTTSEnabled] = useState(options.enableTTS || false);
  const [text, setText] = useState('');
  
  // Initialize reader model with callbacks
  useEffect(() => {
    // Set up callback for word changes
    readerModel.onWordsChange((words) => {
      if (words.length > 0) {
        setCurrentWords(words);
        setProgress(readerModel.getProgress());
      } else {
        console.error("Received empty words array from model");
      }
    });
    
    // Set up callback for playing state changes
    readerModel.onPlayingStateChange((playing) => {
      setIsPlaying(playing);
    });
    
    // Listen for global text update events (for cross-component updates)
    const handleTextUpdated = (event: CustomEvent) => {
      // Event handler kept for functionality
    };
    
    // Listen for word change events from Reader models
    const handleWordsChanged = (event: CustomEvent) => {
      if (event.detail && event.detail.wordCount > 0) {
        // Force a refresh of the model to get updated words
        setProgress(readerModel.getProgress());
      }
    };
    
    document.addEventListener('reader-text-updated', handleTextUpdated as EventListener);
    document.addEventListener('reader-words-changed', handleWordsChanged as EventListener);
    
    // Force an update after mounting to ensure we have the latest state
    setTimeout(() => {
      setProgress(readerModel.getProgress());
    }, 100);
    
    return () => {
      readerModel.cleanup();
      document.removeEventListener('reader-text-updated', handleTextUpdated as EventListener);
      document.removeEventListener('reader-words-changed', handleWordsChanged as EventListener);
    };
  }, [readerModel]);
  
  // Initialize TTS service with callbacks
  useEffect(() => {
    if (isTTSEnabled) {
      ttsService.setHighlightCallback((index) => {
        readerModel.setPosition(index);
      });
      
      ttsService.setCompletionCallback(() => {
        readerModel.pause();
      });
    }
    
    return () => {
      ttsService.cleanup();
    };
  }, [ttsService, readerModel, isTTSEnabled]);
  
  // Set text in the reader
  const handleSetText = useCallback((newText: string) => {
    if (!newText || newText.trim() === '') {
      console.error("ERROR: Attempted to set empty text in useReader");
      return;
    }
    
    // Update local state first
    setText(newText);
    
    // Then update model - this will trigger callbacks through the ReaderModel's onWordsChange
    try {
      readerModel.setText(newText);
    } catch (err) {
      console.error("ERROR setting text in reader model:", err);
    }
    
    // Force an update of the UI through a custom event
    document.dispatchEvent(new CustomEvent('reader-text-updated', { 
      detail: { 
        length: newText?.length || 0,
        source: 'useReader.handleSetText',
        preview: newText.substring(0, 100) + "..."
      } 
    }));
  }, [readerModel]);
  
  // Play/Resume reading
  const play = useCallback(() => {
    if (isTTSEnabled) {
      const state = readerModel.getState();
      const settings = readerModel.getSettings();
      
      if (state.isPlaying) {
        ttsService.resume();
      } else {
        ttsService.speak(
          text, 
          settings.wpm, 
          state.currentIndex
        );
      }
    }
    
    readerModel.play();
  }, [readerModel, ttsService, isTTSEnabled, text]);
  
  // Pause reading
  const pause = useCallback(() => {
    if (isTTSEnabled) {
      ttsService.pause();
    }
    
    readerModel.pause();
  }, [readerModel, ttsService, isTTSEnabled]);
  
  // Skip forward
  const forward = useCallback((count?: number) => {
    readerModel.forward(count);
  }, [readerModel]);
  
  // Skip backward
  const rewind = useCallback((count?: number) => {
    readerModel.rewind(count);
  }, [readerModel]);
  
  // Update reader settings
  const updateSettings = useCallback((settings: Partial<ReaderSettings>) => {
    readerModel.updateSettings(settings);
    
    // Update TTS voice if changed
    if (settings.ttsVoice && isTTSEnabled) {
      ttsService.setVoice(settings.ttsVoice);
    }
  }, [readerModel, ttsService, isTTSEnabled]);
  
  // Toggle TTS on/off
  const toggleTTS = useCallback(() => {
    if (isTTSEnabled) {
      ttsService.stop();
      setIsTTSEnabled(false);
    } else {
      setIsTTSEnabled(true);
    }
  }, [isTTSEnabled, ttsService]);
  
  // Update currentWords when text changes
  useEffect(() => {
    if (text && text.trim() !== '') {
      // This will trigger the onWordsChange callback which updates currentWords
      try {
        readerModel.setText(text);
      } catch (err) {
        console.error("ERROR updating model text:", err);
      }
    }
  }, [text, readerModel]);
  
  return {
    currentWords,
    isPlaying,
    progress,
    settings: readerModel.getSettings(),
    play,
    pause,
    forward,
    rewind,
    setText: handleSetText,
    updateSettings,
    toggleTTS,
    isTTSEnabled
  };
} 