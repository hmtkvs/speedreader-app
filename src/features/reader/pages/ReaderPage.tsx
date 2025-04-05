import React, { useState, useCallback, useEffect } from 'react';
import { useReader } from '../hooks/useReader';
import { useTheme } from '../../theme/contexts/ThemeContext';
import { FullscreenReader } from '../components/FullscreenReader';
import { TTSSettingsAdapter } from '../components/TTSSettingsAdapter';
import { ReaderSettingsModal } from '../components/ReaderSettingsModal';
import { SimplifiedReaderModel } from '../../../types/simplified';
import { Translation } from '../../../models/types';
import { TranslationTooltip } from '../../../components/TranslationTooltip';
import { TranslationService } from '../../../utils/translation';
import { SettingsModal } from '../../../components/SettingsModal';

// Icons
import { IoPlaySharp, IoPauseSharp, IoSettingsOutline, IoVolumeHigh, IoVolumeMute, IoExpand } from 'react-icons/io5';
import { BiSkipPrevious, BiSkipNext } from 'react-icons/bi';
import { MdContentPaste } from 'react-icons/md';

interface ReaderPageProps {
  onPDFUploadClick?: () => void;
}

/**
 * ReaderPage component that encapsulates the Reader feature UI and logic
 */
export function ReaderPage({ onPDFUploadClick }: ReaderPageProps) {
  // Get theme and reader from context
  const { colorScheme } = useTheme();
  const { 
    currentWords, 
    isPlaying, 
    settings, 
    progress,
    play, 
    pause, 
    forward, 
    rewind, 
    updateSettings, 
    setText 
  } = useReader();
  
  // Local state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showReaderSettings, setShowReaderSettings] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [showColorSchemes, setShowColorSchemes] = useState(false);
  const [useTTS, setUseTTS] = useState(settings.ttsEnabled);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Simplified reader model for adapters
  const [reader] = useState<SimplifiedReaderModel>({ 
    addBook: async (text: string, name: string) => Promise.resolve(name),
    loadBook: async (id: string) => Promise.resolve(true),
    rewind: () => rewind(),
    forward: () => forward(),
    setText: (text: string) => setText(text),
    play: () => play(),
    pause: () => pause(),
    setTTSVoice: (voiceId: string) => updateSettings({ ttsVoice: voiceId }),
    wpm: settings.wpm
  });

  // Set sample text when the app loads (if needed)
  useEffect(() => {
    // Listen for text updates from other components
    const handleTextUpdated = () => {
    };
    
    // Listen for PDF selection events
    const handlePdfSelected = (event: CustomEvent) => {
    };
    
    // Listen for direct PDF content
    const handleDirectPdfContent = (event: CustomEvent) => {
    };
    
    // Listen for PDF content selected from saved PDFs
    const handlePdfContentSelected = (event: CustomEvent) => {
      // If event contains text, set it in the reader
      if (event.detail?.text) {
        setText(event.detail.text);
        
        // Force UI update
        setSelectedWord(null);
      }
    };
    
    document.addEventListener('reader-text-updated', handleTextUpdated);
    document.addEventListener('pdf-text-selected', handlePdfSelected as EventListener);
    document.addEventListener('pdf-direct-content', handleDirectPdfContent as EventListener);
    document.addEventListener('pdf-content-selected', handlePdfContentSelected as EventListener);
    
    if (currentWords.length <= 1 && !currentWords[0].before && !currentWords[0].highlight && !currentWords[0].after) {
      // Sample text to demonstrate the reader functionality
      setText("Welcome to the Speed Reader application. This is a sample text to demonstrate how the reader works. You can upload your own PDFs or paste text from clipboard. Click any word to see its translation. Use the controls at the bottom to adjust reading speed and settings.");
    }
    
    return () => {
      document.removeEventListener('reader-text-updated', handleTextUpdated);
      document.removeEventListener('pdf-text-selected', handlePdfSelected as EventListener);
      document.removeEventListener('pdf-direct-content', handleDirectPdfContent as EventListener);
      document.removeEventListener('pdf-content-selected', handlePdfContentSelected as EventListener);
    }
  }, [setText, currentWords.length]);

  // Toggle TTS
  const toggleTTS = () => {
    const newValue = !useTTS;
    setUseTTS(newValue);
    updateSettings({ ttsEnabled: newValue });
  };

  // Paste text from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setText(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, [setText]);

  // Handle word click for translation
  const handleWordClick = (word: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
    
    // Pause reading when clicking a word
    if (isPlaying) {
      pause();
    }
    
    setSelectedWord(word);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    
    // Get translation
    const translationService = TranslationService.getInstance();
    translationService.translate(cleanWord).then(result => {
      if (result) {
        setTranslation(result);
      } else {
        setSelectedWord(null);
        setTranslation(null);
        setTooltipPosition(null);
      }
    });
  };

  // Close translation tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.clickable-word')) {
        // Resume reading if it was playing before clicking a word
        if (selectedWord && isPlaying) {
          play();
        }
        setSelectedWord(null);
        setTranslation(null);
        setTooltipPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedWord, isPlaying, play]);

  // Update highlight color
  const handleHighlightColorChange = (color: string) => {
    // Use type assertion to access the setHighlightColor method
    const themeContext = useTheme() as any;
    if (themeContext.setHighlightColor) {
      themeContext.setHighlightColor(color);
    }
  };

  // Update font
  const handleFontChange = (fontFamily: string) => {
    // Use type assertion to access the setFontFamily method
    const themeContext = useTheme() as any;
    if (themeContext.setFontFamily) {
      themeContext.setFontFamily(fontFamily);
    }
  };

  // Update color scheme
  const handleColorSchemeChange = (scheme: any) => {
    // Use type assertion to access the setColorScheme method
    const themeContext = useTheme() as any;
    if (themeContext.setColorScheme) {
      themeContext.setColorScheme(scheme);
    }
  };

  return (
    <>
      {/* Translation tooltip */}
      {selectedWord && translation && tooltipPosition && (
        <TranslationTooltip
          word={selectedWord}
          translation={translation}
          position={tooltipPosition}
          colorScheme={{
            background: colorScheme.background,
            text: colorScheme.text,
            highlight: colorScheme.highlight || '#FF3B30'
          }}
        />
      )}
      
      {/* Fullscreen Reader */}
      <FullscreenReader
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        currentWords={currentWords}
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
        onForward={forward}
        onRewind={rewind}
        colorScheme={{
          background: colorScheme.background,
          text: colorScheme.text,
          highlight: colorScheme.highlight || '#FF3B30'
        }}
        fontSize={settings.fontSize}
        onWordClick={handleWordClick}
      />
      
      {/* Main Reading Area */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 overflow-hidden">
        <div className="w-full max-w-3xl mx-auto text-center p-8 rounded-xl" 
          style={{ 
            backgroundColor: `${colorScheme.background}AA`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}>
          <div className="mb-8 text-lg">
            {currentWords.length > 0 ? (
              <>
                <div className="font-serif text-xl">
                  {currentWords.map((word, index) => (
                    <span 
                      key={index}
                      className="clickable-word inline-block mx-1 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => handleWordClick(word.before + word.highlight + word.after, e)}
                    >
                      <span>{word.before}</span>
                      <span style={{ color: colorScheme.highlight, fontWeight: 'bold' }}>{word.highlight}</span>
                      <span>{word.after}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-center text-sm opacity-70">
                  <span>Reading progress: {Math.round(progress * 100)}%</span>
                  <span className="mx-2">•</span>
                  <span>Speed: {settings.wpm} WPM</span>
                </div>
              </>
            ) : (
              <div className="text-center opacity-80">
                <p className="mb-4">Welcome to the Speed Reader App</p>
                <p className="mb-4">Upload a PDF using the top-left corner button</p>
                <p className="mb-4">Or paste text using the button below</p>
                <p>Use the fullscreen button for a distraction-free reading experience</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-center gap-6 p-4">
        <button
          onClick={() => setIsFullscreen(true)}
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          <IoExpand size={24} />
        </button>
        <button
          onClick={toggleTTS}
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          {useTTS ? <IoVolumeHigh size={24} /> : <IoVolumeMute size={24} />}
        </button>
        <button
          onClick={() => setShowTTSSettings(true)}
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
          title="TTS Settings"
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          <IoVolumeHigh size={20} />
          <span className="absolute text-[10px] font-bold" style={{ bottom: '8px' }}>SET</span>
        </button>
        <button
          onClick={() => setShowReaderSettings(true)}
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          <IoSettingsOutline size={24} />
        </button>
        
        {/* Color scheme button */}
        <button
          onClick={() => setShowColorSchemes(true)}
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
          title="Appearance Settings"
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          <div 
            className="w-6 h-6 rounded-full" 
            style={{
              background: `conic-gradient(${colorScheme.highlight}, #FF9500, #34C759, #5856D6, #007AFF, ${colorScheme.highlight})`,
              border: '2px solid white'
            }}
          />
        </button>
        
        <button
          onClick={handlePaste}
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          <MdContentPaste size={24} />
        </button>
        
        <button
          onClick={() => rewind()}
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          <BiSkipPrevious size={26} />
        </button>
        
        <button
          onClick={isPlaying ? pause : play}
          className="w-20 h-20 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          {isPlaying ? <IoPauseSharp size={28} /> : <IoPlaySharp size={28} />}
        </button>
        
        <button
          onClick={() => forward()}
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
            }}
          />
          <BiSkipNext size={26} />
        </button>
      </div>

      {/* Settings Modals */}
      <ReaderSettingsModal
        isOpen={showReaderSettings}
        onClose={() => setShowReaderSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        colorScheme={{
          background: colorScheme.background,
          text: colorScheme.text,
          highlight: colorScheme.highlight || '#FF3B30'
        }}
      />
      
      <SettingsModal
        isOpen={showColorSchemes}
        onClose={() => setShowColorSchemes(false)}
        colorScheme={colorScheme as any}
        onHighlightColorChange={handleHighlightColorChange}
        onFontChange={handleFontChange}
        onColorSchemeChange={handleColorSchemeChange}
      />
      
      <TTSSettingsAdapter
        isOpen={showTTSSettings}
        onClose={() => setShowTTSSettings(false)}
        reader={reader}
        colorScheme={{
          background: colorScheme.background,
          text: colorScheme.text,
          highlight: colorScheme.highlight || '#FF3B30'
        }}
      />
    </>
  );
} 