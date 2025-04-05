import React, { useState, useEffect, useCallback } from 'react';
import { ReaderContainer, FullscreenReader, InlineReader, ReaderSettingsModal, useReader, ReaderProvider } from './features/reader';
import { TTSSettingsAdapter } from './features/reader/components/TTSSettingsAdapter';
import { PDFManagerAdapter, SavedPDFsPanelAdapter, FileUploadAdapter } from './features/pdf-management';
import { UploadNotification } from './features/ui';
import { StatisticsService } from './utils/statistics';
import { SubscriptionService } from './utils/subscription';
import { IoPlaySharp, IoPauseSharp } from 'react-icons/io5';
import { BiSkipPrevious, BiSkipNext } from 'react-icons/bi';
import { IoChevronUpOutline, IoChevronDownOutline, IoMenu, IoExpand, IoStatsChart, IoTime } from 'react-icons/io5';
import { IoSettingsOutline, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import { MdContentPaste } from 'react-icons/md';
import { COLOR_SCHEMES, Translation, ColorScheme as ModelColorScheme } from './models/types';
import { TranslationService } from './utils/translation';
import { LandingPage } from './components/LandingPage';
import { StatsPanel } from './components/StatsPanel';
import { SlideIndicator } from './components/SlideIndicator';
import { TranslationTooltip } from './components/TranslationTooltip';
import { SubscriptionModal } from './components/SubscriptionModal';
import { initializeMonitoring } from './monitoring';
import { DatabaseService } from './utils/database';
import { SettingsModal } from './components/SettingsModal';
import { SimplifiedReaderModel } from './types/simplified';
import { MainLayout } from './features/layout/components/MainLayout';

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
    loadBook: async (id: string) => {
      setText(id); // Use the id as the text content for now
      return Promise.resolve(true);
    },
    getAllBooks: async () => Promise.resolve([]),
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
  const [showPDFManager, setShowPDFManager] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(() => StatisticsService.getInstance().getReadingStats());

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
    }
  };
  
  const toggleTTS = () => {
    setUseTTS(!useTTS);
    updateSettings({ ttsEnabled: !useTTS });
  };
  
  const handleHighlightColorChange = (highlight: string) => {
    setColorScheme(prev => ({
      ...prev,
      highlight
    }));
  };
  
  const handleFontChange = (font: string) => {
    setColorScheme(prev => ({
      ...prev,
      font
    }));
  };
  
  const handleColorSchemeChange = (scheme: ModelColorScheme) => {
    // Preserve the current highlight color when changing schemes
    setColorScheme({
      ...scheme,
      highlight: colorScheme.highlight || scheme.highlight || '#FF3B30'
    });
  };
  
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
    <div className="min-h-screen">
      {/* Using MainLayout for consistent structure */}
      <div 
        style={{ 
          backgroundColor: colorScheme.background,
          color: colorScheme.text,
        }}
      >
        {/* PDF Upload Corner */}
        <FileUploadAdapter
          colorScheme={{
            background: colorScheme.background,
            text: colorScheme.text,
            highlight: colorScheme.highlight || '#FF3B30'
          }}
          reader={reader as any}
        />
        
        {/* Main Layout with integrated sidebar */}
        <MainLayout 
          reader={reader}
          showSidebarToggle={true}
          showStatsButton={true}
        >
          {/* Main Reading Area */}
          <div className="flex-grow flex flex-col items-center justify-center px-4 overflow-hidden" 
            style={{ color: colorScheme.text }}>
            
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
            >
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: `radial-gradient(circle at top left, ${colorScheme.highlight || '#FF3B30'}0A, transparent)`,
                }}
              />
              <IoSettingsOutline size={24} />
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
          </div>
          
          {/* Main Reading Control Panel */}
          <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center">
            <div 
              className="flex items-center justify-between py-3 px-4 rounded-full backdrop-blur-md shadow-2xl"
              style={{ 
                backgroundColor: `${colorScheme.background}CC`,
                boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`,
                maxWidth: 'min(95%, 500px)',
                width: '100%'
              }}
            >
              {/* Speed Controls */}
              <div className="flex flex-col items-center">
                <button 
                  className="text-xs opacity-70 rounded-md py-1 px-1 hover:bg-current hover:bg-opacity-10"
                  onClick={() => updateSettings({ wpm: Math.min(settings.wpm + 25, 1000) })}
                >
                  <IoChevronUpOutline size={16} />
                </button>
                <div className="text-center text-lg font-bold">
                  {settings.wpm}
                </div>
                <button 
                  className="text-xs opacity-70 rounded-md py-1 px-1 hover:bg-current hover:bg-opacity-10"
                  onClick={() => updateSettings({ wpm: Math.max(settings.wpm - 25, 100) })}
                >
                  <IoChevronDownOutline size={16} />
                </button>
                <div className="text-xs opacity-50 mt-1">WPM</div>
              </div>
              
              {/* Play/Pause and Skip Controls */}
              <div className="flex items-center gap-4">
                <button 
                  className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-current hover:bg-opacity-10"
                  onClick={handleRewindClick}
                >
                  <BiSkipPrevious size={32} />
                </button>
                <button 
                  className="w-16 h-16 rounded-full flex items-center justify-center
                    bg-current bg-opacity-10 hover:bg-opacity-20 active:scale-95 transition-all"
                  onClick={isPlaying ? pause : play}
                >
                  {isPlaying ? <IoPauseSharp size={32} /> : <IoPlaySharp size={32} />}
                </button>
                <button 
                  className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-current hover:bg-opacity-10"
                  onClick={handleForwardClick}
                >
                  <BiSkipNext size={32} />
                </button>
              </div>
              
              {/* Font Size Controls */}
              <div className="flex flex-col items-center">
                <button 
                  className="text-xs opacity-70 rounded-md py-1 px-1 hover:bg-current hover:bg-opacity-10"
                  onClick={() => updateSettings({ fontSize: Math.min(settings.fontSize + 1, 24) })}
                >
                  <IoChevronUpOutline size={16} />
                </button>
                <div className="text-center text-lg font-bold">
                  {settings.fontSize}
                </div>
                <button 
                  className="text-xs opacity-70 rounded-md py-1 px-1 hover:bg-current hover:bg-opacity-10"
                  onClick={() => updateSettings({ fontSize: Math.max(settings.fontSize - 1, 12) })}
                >
                  <IoChevronDownOutline size={16} />
                </button>
                <div className="text-xs opacity-50 mt-1">Size</div>
              </div>
            </div>
          </div>
          
          {/* Slide indicators */}
          <SlideIndicator 
            direction="left" 
            colorScheme={{
              background: colorScheme.background,
              text: colorScheme.text,
              highlight: colorScheme.highlight || '#FF3B30'
            }}
            onClick={() => rewind()}
          />
          <SlideIndicator 
            direction="right" 
            colorScheme={{
              background: colorScheme.background,
              text: colorScheme.text,
              highlight: colorScheme.highlight || '#FF3B30'
            }}
            onClick={() => forward()}
          />
        </MainLayout>
      </div>
      
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
      
      {/* Modals */}
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
      
      {/* PDF Manager Modal */}
      {showPDFManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div 
            className="w-full max-w-2xl h-[80vh] rounded-xl overflow-hidden shadow-2xl"
          >
            <PDFManagerAdapter 
              onSelectPDF={handlePDFSelection}
              colorScheme={{
                background: colorScheme.background,
                text: colorScheme.text,
                highlight: colorScheme.highlight || '#FF3B30'
              }}
            />
          </div>
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-black bg-opacity-30 text-white"
            onClick={() => setShowPDFManager(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default AppWithReaderProvider;