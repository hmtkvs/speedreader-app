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
    readerModel.onWordsChange((words) => {
      setCurrentWords(words);
      setProgress(readerModel.getProgress());
    });
    
    readerModel.onPlayingStateChange((playing) => {
      setIsPlaying(playing);
    });
    
    return () => {
      readerModel.cleanup();
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
    setText(newText);
    readerModel.setText(newText);
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