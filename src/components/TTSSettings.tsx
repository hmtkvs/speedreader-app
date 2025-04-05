import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoVolumeHigh, IoSpeedometer, IoLanguage, IoCheckmarkCircle, IoPlay } from 'react-icons/io5';
import { ReaderModel } from '../models/reader';
import { TTSService } from '../features/reader/services/TTSService';

interface TTSSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  reader: ReaderModel;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function TTSSettings({ isOpen, onClose, reader, colorScheme }: TTSSettingsProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedVoice, setSelectedVoice] = useState('af_bella');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const tts = TTSService.getInstance();
  const voices = tts.getAvailableVoices();
  
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Focus trap for accessibility
  useEffect(() => {
    if (!isOpen) return;

    // Focus the first focusable element when the modal opens
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }, [isOpen]);

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    reader.setTTSVoice(voiceId);
  };

  const playVoiceSample = async (voiceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (playingVoice) {
      // Stop current playback if any
      tts.stop();
    }
    
    setPlayingVoice(voiceId);
    
    // Temporarily set the voice
    const currentVoice = tts.getOptions().voice;
    tts.setVoice(voiceId);
    
    try {
      await tts.speak("This is a sample of how this voice sounds. How does it sound?", reader.wpm);
      
      // Set up completion callback to reset playing state
      tts.setCompletionCallback(() => {
        setPlayingVoice(null);
        // Restore original voice
        tts.setVoice(currentVoice);
      });
    } catch (error) {
      console.error("Error playing voice sample:", error);
      setPlayingVoice(null);
      // Restore original voice
      tts.setVoice(currentVoice);
    }
  };

  // Group voices by language
  const voicesByLanguage = voices.reduce((groups, voice) => {
    const lang = voice.langCode || 'other';
    if (!groups[lang]) {
      groups[lang] = [];
    }
    groups[lang].push(voice);
    return groups;
  }, {} as Record<string, typeof voices>);

  // Language display names
  const languageNames: Record<string, string> = {
    'en': 'English (US)',
    'en-GB': 'English (UK)',
    'zh': 'Chinese (Mandarin)',
    'ja': 'Japanese',
    'fr': 'French',
    'es': 'Spanish',
    'hi': 'Hindi',
    'it': 'Italian',
    'pt-BR': 'Portuguese (Brazil)',
    'other': 'Other Languages'
  };
  
  // Create a better organized language order and layout
  const languageOrder = ['en', 'en-GB', 'zh', 'ja', 'fr', 'es', 'hi', 'it', 'pt-BR', 'other'];
  
  // Get quality stars without fractions
  const getQualityStars = (quality: string | undefined): string => {
    if (!quality) return '';
    
    // Extract the base grade without + or -
    const baseGrade = quality.charAt(0);
    
    switch (baseGrade) {
      case 'A': return '⭐⭐⭐⭐⭐'; 
      case 'B': return '⭐⭐⭐⭐';
      case 'C': return '⭐⭐⭐';
      case 'D': return '⭐⭐';
      case 'F': return '⭐';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
            onClick={onClose}
            style={{ backdropFilter: 'blur(2px)' }}
          />

          {/* Panel */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 m-auto z-[70]
              max-w-2xl w-[calc(100vw-2rem)] md:w-full mx-4
              max-h-[calc(100vh-4rem)] overflow-auto
              touch-manipulation rounded-lg"
            style={{ 
              background: colorScheme.background,
              color: colorScheme.text,
              boxShadow: `0 10px 25px -5px ${colorScheme.text}30, 0 8px 10px -6px ${colorScheme.text}20`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-current/10">
              <div className="flex justify-between items-center">
                <motion.h2 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-semibold flex items-center gap-2"
                >
                  <IoVolumeHigh size={24} className="opacity-60" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">
                    Text-to-Speech Settings
                  </span>
                </motion.h2>
                <motion.button 
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileFocus={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700
                    w-11 h-11 flex items-center justify-center
                    touch-manipulation rounded-full relative
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ }}
                  aria-label="Close TTS settings"
                >
                  <div className="absolute inset-0 rounded-full hover:bg-current/5 transition-colors" />
                  <IoClose size={24} />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 pb-safe">
              {/* WPM to Speed Mapping Info */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-current/5 p-4 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  <IoSpeedometer size={20} className="opacity-70" />
                  <h3 className="text-base font-medium">Reading Speed Conversion</h3>
                </div>
                
                <p className="text-sm mb-4">
                  The text-to-speech speed is automatically adjusted based on your WPM setting:
                </p>
                
                <div className="overflow-hidden rounded-lg border border-current/10">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-current/10">
                        <td className="py-2 px-3 text-left font-medium border-r border-current/10" style={{ color: colorScheme.highlight }}>WPM</td>
                        <td className="py-2 px-3 text-left font-medium border-r border-current/10">100</td>
                        <td className="py-2 px-3 text-left font-medium border-r border-current/10">200</td>
                        <td className="py-2 px-3 text-left font-medium border-r border-current/10">300</td>
                        <td className="py-2 px-3 text-left font-medium border-r border-current/10">400</td>
                        <td className="py-2 px-3 text-left font-medium border-r border-current/10">600</td>
                        <td className="py-2 px-3 text-left font-medium">1000</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-left font-medium border-r border-current/10" style={{ color: colorScheme.highlight }}>Speed</td>
                        <td className="py-2 px-3 font-mono border-r border-current/10">0.5×</td>
                        <td className="py-2 px-3 font-mono border-r border-current/10">1.0×</td>
                        <td className="py-2 px-3 font-mono border-r border-current/10">1.5×</td>
                        <td className="py-2 px-3 font-mono border-r border-current/10">2.0×</td>
                        <td className="py-2 px-3 font-mono border-r border-current/10">3.0×</td>
                        <td className="py-2 px-3 font-mono">4.0×</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
              
              {/* Voice Selection */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <IoLanguage size={20} className="opacity-70" />
                  <h3 className="text-lg font-medium">Select Voice</h3>
                </div>
                
                {/* Voice by language groups - optimized grid layout */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {languageOrder
                      .filter(lang => voicesByLanguage[lang] && voicesByLanguage[lang].length > 0)
                      .map(langCode => (
                        <motion.div
                          key={langCode}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                          className="rounded-lg border border-current/10 overflow-hidden h-full"
                        >
                          <div className="px-4 py-2 bg-current/10 border-b border-current/10">
                            <h4 className="font-medium">
                              {languageNames[langCode] || langCode}
                              <span className="text-xs opacity-70 ml-2">{voicesByLanguage[langCode].length} voices</span>
                            </h4>
                          </div>
                          
                          <div className="divide-y divide-current/10">
                            {voicesByLanguage[langCode].map(voice => {
                              // Extract gender from voice name
                              const isFemaleName = voice.id.startsWith('af_') || voice.id.startsWith('bf_') || 
                                                  voice.id.startsWith('jf_') || voice.id.startsWith('zf_') ||
                                                  voice.id.startsWith('ef_') || voice.id.startsWith('ff_') ||
                                                  voice.id.startsWith('hf_') || voice.id.startsWith('if_') ||
                                                  voice.id.startsWith('pf_');
                              const genderEmoji = isFemaleName ? '🚺' : '🚹';
                              
                              return (
                                <div
                                  key={voice.id}
                                  className="flex items-center"
                                >
                                  <button
                                    onClick={() => handleVoiceChange(voice.id)}
                                    className={`
                                      flex-grow p-2 text-left relative
                                      transition-all flex items-center gap-2
                                      ${selectedVoice === voice.id ? 
                                        `bg-${colorScheme.highlight}/20` : 
                                        'hover:bg-current/5'}
                                    `}
                                  >
                                    <div className="flex-grow text-sm">
                                      <span className="mr-1.5">{genderEmoji}</span>
                                      <span className={`font-medium ${selectedVoice === voice.id ? `text-${colorScheme.highlight}` : ''}`}>
                                        {voice.name.replace(' (Female)', '').replace(' (Male)', '')}
                                      </span>
                                      {voice.quality && (
                                        <span className="ml-2 text-xs">
                                          {getQualityStars(voice.quality)}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                  <button
                                    onClick={(e) => playVoiceSample(voice.id, e)}
                                    className="p-2 hover:bg-current/10 transition-colors border-l border-current/10"
                                    aria-label={`Play sample of ${voice.name}`}
                                  >
                                    {playingVoice === voice.id ? (
                                      <IoVolumeHigh 
                                        size={18} 
                                        className="animate-pulse"
                                        style={{ color: colorScheme.highlight }} 
                                      />
                                    ) : (
                                      <IoPlay size={18} />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}