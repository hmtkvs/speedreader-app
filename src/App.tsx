import React, { useState, useEffect, useCallback } from 'react';
import { ReaderModel } from './models/reader';
import { SubscriptionService } from './utils/subscription';
import { IoPlaySharp, IoPauseSharp } from 'react-icons/io5';
import { BiSkipPrevious, BiSkipNext } from 'react-icons/bi';
import { IoChevronUpOutline, IoChevronDownOutline, IoMenu, IoExpand, IoStatsChart, IoTime } from 'react-icons/io5';
import { IoSettingsOutline, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import { MdContentPaste } from 'react-icons/md';
import { COLOR_SCHEMES, Translation } from './models/types';
import { TranslationService } from './utils/translation';
import { FileUploadCorner } from './components/FileUploadCorner';
import { FullscreenReader } from './components/FullscreenReader';
import { LandingPage } from './components/LandingPage';
import { PDFManager } from './components/PDFManager';
import { SavedPDFsPanel } from './components/SavedPDFsPanel';
import { StatisticsService } from './utils/statistics';
import { StatsPanel } from './components/StatsPanel';
import { SlideIndicator } from './components/SlideIndicator';
import { TranslationTooltip } from './components/TranslationTooltip';
import { TTSSettings } from './components/TTSSettings';
import { SubscriptionModal } from './components/SubscriptionModal';
import { initializeMonitoring } from './monitoring';
import { DatabaseService } from './utils/database';
import { SettingsModal } from './components/SettingsModal';
import { ColorScheme } from './types/common';

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    hasAccess: boolean;
    trialDaysLeft: number | null;
    subscriptionDaysLeft: number | null;
  }>({ hasAccess: false, trialDaysLeft: null, subscriptionDaysLeft: null });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const [reader] = useState(() => new ReaderModel());
  const [currentWords, setCurrentWords] = useState([{ before: '', highlight: '', after: '' }]);
  const [readText, setReadText] = useState('');
  const [unreadText, setUnreadText] = useState('');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('0:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [fontSize, setFontSize] = useState(60);
  const [colorScheme, setColorScheme] = useState(COLOR_SCHEMES[0]);
  const [wordsAtTime, setWordsAtTime] = useState(2);
  const [showColorSchemes, setShowColorSchemes] = useState(false);
  const [useTTS, setUseTTS] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSavedPDFs, setShowSavedPDFs] = useState(false);
  const [showPDFManager, setShowPDFManager] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(() => StatisticsService.getInstance().getReadingStats());

  useEffect(() => {
    const handleUpdate = () => {
      setCurrentWords(reader.currentWords);
      setReadText(reader.readText);
      setUnreadText(reader.unreadText);
      setProgress(reader.progress);
      setTimeRemaining(reader.timeRemaining);
      setIsPlaying(reader.isPlaying);
      setWpm(reader.wpm);
      setWordsAtTime(reader.wordsAtTime);
      setColorScheme(reader.colorScheme);
    };

    reader.on('propertyChange', handleUpdate);
    reader.setText("Welcome to Speed Reader! Tap the play button to start reading at your own pace. You can adjust the speed using the controls above.");
    
    // Initialize TTS state
    setUseTTS(reader.useTTS);

    return () => {
      reader.off('propertyChange', handleUpdate);
    };
  }, [reader]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      reader.setText(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, [reader]);

  const adjustWpm = (increment: boolean) => {
    const step = 25;
    const newWpm = increment ? wpm + step : wpm - step;
    if (newWpm >= 100 && newWpm <= 1000) {
      setWpm(newWpm);
      reader.wpm = newWpm;
    }
  };

  const adjustWordsAtTime = (increment: boolean) => {
    const newValue = increment ? wordsAtTime + 1 : wordsAtTime - 1;
    if (newValue >= 1 && newValue <= 5) {
      setWordsAtTime(newValue);
      reader.wordsAtTime = newValue;
    }
  };

  const adjustFontSize = (increment: boolean) => {
    const step = 4;
    const newSize = increment ? fontSize + step : fontSize - step;
    if (newSize >= 32 && newSize <= 96) {
      setFontSize(newSize);
    }
  };

  const handleColorSchemeChange = (scheme: typeof COLOR_SCHEMES[0]) => {
    setColorScheme(scheme);
    reader.colorScheme = scheme;
  };

  const handleHighlightColorChange = (color: string) => {
    reader.setHighlightColor(color);
    setColorScheme(prev => ({ ...prev, highlight: color }));
  };

  const handleFontChange = (fontFamily: string) => {
    reader.setFont(fontFamily);
    setColorScheme(prev => ({ ...prev, font: fontFamily }));
  };

  const handlePDFSelection = (pdfId: string, pdfContent: string) => {
    reader.setText(pdfContent);
    setShowPDFManager(false);
  };

  const handleWordClick = (word: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
    
    // Pause reading when clicking a word
    if (isPlaying) {
      reader.pause();
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

  const toggleTTS = () => {
    const newValue = !useTTS;
    setUseTTS(newValue);
    reader.useTTS = newValue;
    
    // Show TTS settings when enabling
    if (newValue && !showTTSSettings) {
      setShowTTSSettings(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.clickable-word')) {
        // Resume reading if it was playing before clicking a word
        if (selectedWord && isPlaying) {
          reader.play();
        }
        setSelectedWord(null);
        setTranslation(null);
        setTooltipPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedWord, isPlaying, reader]);

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: colorScheme.background,
        color: colorScheme.text
      }}
    >
      <div className="p-4 flex flex-col h-screen">
        {/* Subscription Status */}
        {(subscriptionInfo.trialDaysLeft !== null || subscriptionInfo.subscriptionDaysLeft !== null) && (
          <div className="fixed right-4 top-4 z-40">
            <div 
              className="px-4 py-2 rounded-xl relative"
              style={{ 
                background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
                boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
              }}
            >
              <span className="relative z-10">
                {subscriptionInfo.trialDaysLeft !== null
                  ? `Trial: ${subscriptionInfo.trialDaysLeft} days left`
                  : `Pro: ${subscriptionInfo.subscriptionDaysLeft} days left`
                }
              </span>
            </div>
          </div>
        )}

        {/* Settings Bar */}
        <div className="flex justify-end items-center mb-8 text-sm">
          <div 
            className="flex items-center gap-8 p-4 rounded-2xl relative backdrop-blur-md"
            style={{ 
              background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
              boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`,
              zIndex: 50,
              fontSize: `${Math.min(14, Math.max(11, window.innerWidth / 50))}px`
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
              }}
            />
            {/* WPM Control */}
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => adjustWpm(true)}
                className="hover:opacity-100 opacity-60 transition-colors p-1"
              >
                <IoChevronUpOutline size={Math.min(20, Math.max(16, window.innerWidth / 40))} />
              </button>
              <div className="flex items-center gap-0.5 text-xs sm:text-sm whitespace-nowrap">
                <span>{isMobile ? 'W' : 'WPM'}</span>
                <span className="opacity-100 tabular-nums">{wpm}×{wordsAtTime}</span>
              </div>
              <button 
                onClick={() => adjustWpm(false)}
                className="hover:opacity-100 opacity-60 transition-colors p-1"
              >
                <IoChevronDownOutline size={Math.min(20, Math.max(16, window.innerWidth / 40))} />
              </button>
            </div>

            {/* Words at a time */}
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => adjustWordsAtTime(true)}
                className="hover:opacity-100 opacity-60 transition-colors p-1"
              >
                <IoChevronUpOutline size={Math.min(20, Math.max(16, window.innerWidth / 40))} />
              </button>
              <div className="flex items-center gap-0.5 text-xs sm:text-sm whitespace-nowrap">
                <span>{isMobile ? '×' : 'Words'}</span>
                <span className="opacity-100 tabular-nums">{wordsAtTime}</span>
              </div>
              <button 
                onClick={() => adjustWordsAtTime(false)}
                className="hover:opacity-100 opacity-60 transition-colors p-1"
              >
                <IoChevronDownOutline size={Math.min(20, Math.max(16, window.innerWidth / 40))} />
              </button>
            </div>

            {/* Font size */}
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => adjustFontSize(true)}
                className="hover:opacity-100 opacity-60 transition-colors p-1"
              >
                <IoChevronUpOutline size={Math.min(20, Math.max(16, window.innerWidth / 40))} />
              </button>
              <div className="flex items-center gap-0.5 text-xs sm:text-sm whitespace-nowrap">
                <span>{isMobile ? 'F' : 'Font'}</span>
                <span className="opacity-100 tabular-nums">{fontSize}</span>
              </div>
              <button 
                onClick={() => adjustFontSize(false)}
                className="hover:opacity-100 opacity-60 transition-colors p-1"
              >
                <IoChevronDownOutline size={Math.min(20, Math.max(16, window.innerWidth / 40))} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Time Remaining */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
          <div 
            className="px-4 py-2 rounded-xl relative flex items-center gap-2"
            style={{ 
              background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
              boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
            }}
          >
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
              }}
            />
            <IoTime size={16} className="relative z-10 opacity-60" />
            <span className="relative z-10 text-sm">
              <span className="opacity-60">remaining: </span>
              <span className="tabular-nums">{timeRemaining}</span>
            </span>
          </div>
        </div>

        {/* Menu Button */}
        {!isMobile && (
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
            color: colorScheme.text
          }}
        >
          <IoStatsChart size={24} />
        </button>
        
        {/* Main Reading Area */}
        <div className="flex-grow flex flex-col items-center justify-center px-4 overflow-hidden" 
          style={{ color: colorScheme.text }}>
          {/* Read Text */}
          <div className="text-sm opacity-50 mb-8 w-full max-w-2xl text-center line-clamp-2 overflow-hidden">
            {readText.split(' ').map((word, index) => (
              <span
                key={index}
                onClick={(e) => handleWordClick(word, e)}
                className="clickable-word inline-block mx-0.5 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {word}
              </span>
            ))}
          </div>

          {/* Current Words */}
          <div className="mb-8 font-serif flex justify-center gap-4 w-full max-w-[90vw] md:max-w-2xl overflow-hidden whitespace-nowrap">
            {currentWords.map((word, index) => (
              <div
                key={index}
                onClick={(e) => handleWordClick(word.before + word.highlight + word.after, e)}
                className="clickable-word cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap"
                style={{ 
                  fontFamily: colorScheme.font,
                  fontSize: `${Math.min(
                    fontSize, 
                    Math.min(
                      window.innerWidth / (wordsAtTime * Math.max(4, Math.max(...currentWords.map(w => 
                        (w.before + w.highlight + w.after).length
                      )) / 2)),
                      window.innerHeight / 4
                    )
                  )}px`,
                  maxWidth: '100%'
                }}
              >
                <span>{word.before}</span>
                <span style={{ color: colorScheme.highlight }}>{word.highlight}</span>
                <span>{word.after}</span>
              </div>
            ))}
          </div>

          {/* Unread Text */}
          <div className="text-sm opacity-40 mt-4 w-full max-w-2xl text-center line-clamp-2 overflow-hidden">
            {unreadText.split(' ').map((word, index) => (
              <span
                key={index}
                onClick={(e) => handleWordClick(word, e)}
                className="clickable-word inline-block mx-0.5 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {word}
              </span>
            ))}
          </div>

          <div className="w-full rounded-full h-1 mt-8 opacity-20">
            <div
              className="h-1 rounded-full transition-all duration-200"
              onClick={() => setIsFullscreen(true)}
              style={{ 
                width: `${progress}%`,
                background: colorScheme.highlight
              }}
            />
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
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
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
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
              }}
            />
            {useTTS ? <IoVolumeHigh size={24} /> : <IoVolumeMute size={24} />}
          </button>
          <button
            onClick={() => setShowColorSchemes(true)}
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
            style={{ 
              background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
              boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
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
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
              }}
            />
            <MdContentPaste size={24} />
          </button>
          <button
            onClick={() => reader.rewind()}
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
            style={{ 
              background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
              boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
              }}
            />
            <BiSkipPrevious size={24} />
          </button>
          <button
            onClick={() => isPlaying ? reader.pause() : reader.play()}
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
            style={{ 
              background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
              boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
              }}
            />
            {isPlaying ? <IoPauseSharp size={24} /> : <IoPlaySharp size={24} />}
          </button>
          <button
            onClick={() => reader.forward()}
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300"
            style={{ 
              background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
              boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
              }}
            />
            <BiSkipNext size={24} />
          </button>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showColorSchemes}
          onClose={() => setShowColorSchemes(false)}
          colorScheme={colorScheme}
          onHighlightColorChange={handleHighlightColorChange}
          onFontChange={handleFontChange}
          onColorSchemeChange={handleColorSchemeChange}
        />
        
        {/* TTS Settings Modal */}
        <TTSSettings
          isOpen={showTTSSettings}
          onClose={() => setShowTTSSettings(false)}
          reader={reader}
          colorScheme={colorScheme}
        />
        
        {/* Corner File Upload */}
        <FileUploadCorner colorScheme={colorScheme} reader={reader} />
        
        {/* PDF Manager Modal */}
        {showPDFManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div 
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl 
                max-w-4xl w-[calc(100vw-2rem)] md:w-full mx-4
                max-h-[calc(100vh-4rem)] overflow-auto
                touch-manipulation"
              onClick={e => e.stopPropagation()}
              style={{ background: colorScheme.background, color: colorScheme.text }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">PDF Manager</h2>
                <button 
                  onClick={() => setShowPDFManager(false)}
                  className="text-gray-500 hover:text-gray-700
                    w-11 h-11 flex items-center justify-center
                    touch-manipulation"
                >
                  ✕
                </button>
              </div>
              
              <PDFManager
                onSelectPDF={handlePDFSelection}
                colorScheme={colorScheme}
              />
            </div>
          </div>
        )}

        {/* Translation Tooltip */}
        <TranslationTooltip
          word={selectedWord || ''}
          translation={translation}
          position={tooltipPosition}
          colorScheme={colorScheme}
        />

        {/* Slide Indicator (mobile only) */}
        {isMobile && !showSavedPDFs && (
          <SlideIndicator
            direction="left"
            colorScheme={colorScheme}
            onClick={() => setShowSavedPDFs(true)}
          />
        )}
        {/* Stats Slide Indicator (mobile only) */}
        {isMobile && !showStats && (
          <SlideIndicator
            direction="right"
            colorScheme={colorScheme}
            onClick={() => setShowStats(true)}
          />
        )}

        {/* Saved PDFs Panel */}
        <SavedPDFsPanel
          isOpen={showSavedPDFs}
          onClose={() => setShowSavedPDFs(false)}
          reader={reader}
          colorScheme={colorScheme}
        />

        {/* Fullscreen Reader */}
        <FullscreenReader
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          currentWords={currentWords}
          isPlaying={isPlaying}
          onPlay={() => reader.play()}
          onPause={() => reader.pause()}
          onForward={() => reader.forward()}
          onRewind={() => reader.rewind()}
          colorScheme={colorScheme}
          fontSize={fontSize}
          onWordClick={handleWordClick}
        />

        {/* Stats Panel */}
        <StatsPanel
          isOpen={showStats}
          onClose={() => setShowStats(false)}
          stats={stats}
          colorScheme={colorScheme}
        />

        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={showSubscription}
          onClose={() => setShowSubscription(false)}
          onSubscribe={handleSubscribe}
          trialDaysLeft={subscriptionInfo.trialDaysLeft}
          colorScheme={colorScheme}
        />
      </div>
    </div>
  );
}

export default App;