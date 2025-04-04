import React, { useState, useEffect, useCallback } from 'react';
import { ReaderContainer, FullscreenReader, InlineReader, ReaderSettingsModal, useReader, ReaderProvider } from './features/reader';
import { TTSSettingsAdapter } from './features/reader/components/TTSSettingsAdapter';
import { SubscriptionService } from './utils/subscription';
import { IoPlaySharp, IoPauseSharp } from 'react-icons/io5';
import { BiSkipPrevious, BiSkipNext } from 'react-icons/bi';
import { IoChevronUpOutline, IoChevronDownOutline, IoMenu, IoExpand, IoStatsChart, IoTime } from 'react-icons/io5';
import { IoSettingsOutline, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import { MdContentPaste } from 'react-icons/md';
import { COLOR_SCHEMES, Translation, ColorScheme as ModelColorScheme } from './models/types';
import { TranslationService } from './utils/translation';
import { FileUploadCornerAdapter } from './components/FileUploadCornerAdapter';
import { LandingPage } from './components/LandingPage';
import { PDFManagerAdapter, SavedPDFsPanelAdapter } from './features/pdf-management';
import { StatisticsService } from './utils/statistics';
import { StatsPanel } from './components/StatsPanel';
import { SlideIndicator } from './components/SlideIndicator';
import { TranslationTooltip } from './components/TranslationTooltip';
import { SubscriptionModal } from './components/SubscriptionModal';
import { initializeMonitoring } from './monitoring';
import { DatabaseService } from './utils/database';
import { SettingsModal } from './components/SettingsModal';
import { SimplifiedReaderModel } from './types/simplified';

// App wrapper to provide reader context
const AppWithReaderProvider = () => {
  return (
    <ReaderProvider>
      <App />
    </ReaderProvider>
  );
};

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    hasAccess: boolean;
    trialDaysLeft: number | null;
    subscriptionDaysLeft: number | null;
  }>({ hasAccess: false, trialDaysLeft: null, subscriptionDaysLeft: null });

  const [colorScheme, setColorScheme] = useState<ModelColorScheme>({
    ...COLOR_SCHEMES[0],
    highlight: COLOR_SCHEMES[0].highlight || '#FF3B30'  // Ensure highlight is always defined
  });
  
  // Use the reader hook from the Reader feature
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
  
  // Create a simplified reader model for adapters that still need it
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
  
  const [useTTS, setUseTTS] = useState(settings.ttsEnabled);
  const [showColorSchemes, setShowColorSchemes] = useState(false);
  const [showReaderSettings, setShowReaderSettings] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set sample text when the app loads
  useEffect(() => {
    // Sample text to demonstrate the reader functionality
    setText("Welcome to the Speed Reader application. This is a sample text to demonstrate how the reader works. You can upload your own PDFs or paste text from clipboard. Click any word to see its translation. Use the controls at the bottom to adjust reading speed and settings.");
  }, [setText]);

  useEffect(() => {
    const subscription = SubscriptionService.getInstance();
    subscription.initialize();
    
    const checkSubscription = async () => {
      const info = await subscription.checkAccess();
      setSubscriptionInfo(info);
      
      // Show subscription modal if trial is ending soon (2 days left)
      if (info.trialDaysLeft !== null && info.trialDaysLeft <= 2) {
        setShowSubscription(true);
      }
    };

    checkSubscription();
    
    // Initialize database check
    const checkDatabase = async () => {
      const db = DatabaseService.getInstance();
      const health = await db.checkHealth();
      
      if (!health.healthy) {
        console.error('Database health check failed:', health.error);
      }
    };
    
    checkDatabase();
  }, []);

  const handleSubscribe = async (planId: string) => {
    const subscription = SubscriptionService.getInstance();
    const success = await subscription.subscribe(planId);
    
    if (success) {
      setShowSubscription(false);
      const info = await subscription.checkAccess();
      setSubscriptionInfo(info);
    }
  };

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSavedPDFs, setShowSavedPDFs] = useState(false);
  const [showPDFManager, setShowPDFManager] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(() => StatisticsService.getInstance().getReadingStats());

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setText(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, [setText]);

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

  const handlePDFSelection = (pdfId: string, content: string) => {
    if (pdfId && content) {
      // Pass the text to the reader
      console.log(`Selected PDF: ${pdfId}, content length: ${content.length}`);
      setText(content);
      setShowPDFManager(false);
    } else {
      console.error('Invalid PDF selection');
    }
  };

  // Handlers for settings
  const toggleTTS = () => {
    const newTTSEnabled = !useTTS;
    setUseTTS(newTTSEnabled);
    updateSettings({ ttsEnabled: newTTSEnabled });
  };
  
  const handleHighlightColorChange = (highlight: string) => {
    setColorScheme({...colorScheme, highlight});
    // Also update reader settings color scheme
    updateSettings({ 
      colorScheme: { 
        ...settings.colorScheme, 
        highlight 
      } 
    });
  };
  
  const handleFontChange = (font: string) => {
    setColorScheme({...colorScheme, font});
  };
  
  const handleColorSchemeChange = (scheme: ModelColorScheme) => {
    setColorScheme(scheme);
    // Also update reader settings color scheme
    updateSettings({ 
      colorScheme: { 
        background: scheme.background,
        text: scheme.text,
        highlight: scheme.highlight || '#FF3B30'
      } 
    });
  };

  // Handle button clicks that need to call reader methods
  const handleRewindClick = (e: React.MouseEvent) => {
    e.preventDefault();
    rewind();
  };
  
  const handleForwardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    forward();
  };

  // Render
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: colorScheme.background,
        color: colorScheme.text,
      }}
    >
      {/* Main content */}
      <div className="min-h-screen flex flex-col">
        {/* PDF Management - Corner Upload and Sidebar only */}
        {/* Upload Corner */}
        <FileUploadCornerAdapter
          colorScheme={{
            background: colorScheme.background,
            text: colorScheme.text,
            highlight: colorScheme.highlight || '#FF3B30'
          }}
          reader={reader as any}
        />
        
        {/* Saved PDFs Panel */}
        <SavedPDFsPanelAdapter
          isOpen={showSavedPDFs} 
          onClose={() => setShowSavedPDFs(false)}
          reader={reader}
          colorScheme={{
            background: colorScheme.background,
            text: colorScheme.text,
            highlight: colorScheme.highlight || '#FF3B30'
          }}
        />
        
        {/* Stats Panel */}
        <StatsPanel 
          isOpen={showStats}
          onClose={() => setShowStats(false)}
          stats={stats}
          colorScheme={{
            background: colorScheme.background,
            text: colorScheme.text,
            highlight: colorScheme.highlight || '#FF3B30'
          }}
        />
        
        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={showSubscription}
          onClose={() => setShowSubscription(false)}
          onSubscribe={handleSubscribe}
          colorScheme={{
            background: colorScheme.background,
            text: colorScheme.text,
            highlight: colorScheme.highlight || '#FF3B30'
          }}
          trialDaysLeft={subscriptionInfo.trialDaysLeft}
        />
        
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
        
        {/* Mobile menu button */}
        {isMobile && (
          <button
            onClick={() => setShowSavedPDFs(true)}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40
              w-10 h-10 rounded-xl flex items-center justify-center
              hover:bg-current/10 transition-colors"
          >
            <IoMenu size={24} />
          </button>
        )}
        
        {/* Stats Button */}
        <button
          onClick={() => setShowStats(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-40
            w-10 h-10 rounded-xl flex items-center justify-center
            hover:bg-current/10 transition-colors"
          style={{ 
            color: COLOR_SCHEMES[0].text
          }}
        >
          <IoStatsChart size={24} />
        </button>
        
        {/* Main Reading Area */}
        <div className="flex-grow flex flex-col items-center justify-center px-4 overflow-hidden" 
          style={{ color: COLOR_SCHEMES[0].text }}>
          
          {/* Display mock text instead of reader controls */}
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
                    <IoTime className="mr-2" />
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
            onClick={handleRewindClick}
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
            <BiSkipPrevious size={24} />
          </button>
          <button
            onClick={() => isPlaying ? pause() : play()}
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
            {isPlaying ? <IoPauseSharp size={24} /> : <IoPlaySharp size={24} />}
          </button>
          <button
            onClick={handleForwardClick}
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
            <BiSkipNext size={24} />
          </button>
        </div>

        {/* Reader Settings Modal - Use new component */}
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
        
        {/* Color Schemes Modal */}
        <SettingsModal
          isOpen={showColorSchemes}
          onClose={() => setShowColorSchemes(false)}
          colorScheme={colorScheme as any}
          onHighlightColorChange={handleHighlightColorChange}
          onFontChange={handleFontChange}
          onColorSchemeChange={handleColorSchemeChange}
        />
        
        {/* TTS Settings Modal - Use the adapter */}
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
      </div>
    </div>
  );
}

export default AppWithReaderProvider;