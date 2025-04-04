import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloseOutline } from 'react-icons/io5';
import { ReaderSettings } from '../models/ReaderModel';

/**
 * Props for the ReaderSettingsModal component
 */
export interface ReaderSettingsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Current reader settings */
  settings: ReaderSettings;
  /** Callback when settings are updated */
  onUpdateSettings: (settings: Partial<ReaderSettings>) => void;
  /** Color scheme for the reader UI */
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

/**
 * Modal for adjusting reader settings
 */
export function ReaderSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  colorScheme,
}: ReaderSettingsModalProps): React.ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null);
  
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with fade animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
            onClick={onClose}
            style={{ backdropFilter: 'blur(2px)' }}
          />
          
          {/* Modal Content */}
          <motion.div 
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ 
              duration: 0.2,
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
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
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-semibold flex items-center gap-2"
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">
                    Reader Settings
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
                  aria-label="Close settings"
                >
                  <div className="absolute inset-0 rounded-full hover:bg-current/5 transition-colors" />
                  <IoCloseOutline size={24} />
                </motion.button>
              </div>
              
              <div className="space-y-6">
                {/* Reading Speed */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <label className="block mb-2 text-sm font-medium opacity-70">
                    Reading Speed: {settings.wpm} WPM
                  </label>
                  <div className="relative pt-1">
                    <input
                      type="range"
                      min="100"
                      max="800"
                      step="10"
                      value={settings.wpm}
                      onChange={(e) => onUpdateSettings({ wpm: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ 
                        accentColor: colorScheme.highlight,
                        background: `linear-gradient(to right, ${colorScheme.highlight}, ${colorScheme.highlight} ${(settings.wpm - 100) / 7}%, ${colorScheme.text}20 ${(settings.wpm - 100) / 7}%, ${colorScheme.text}20)` 
                      }}
                    />
                    <div className="flex justify-between text-xs mt-1 opacity-60">
                      <span>100 WPM</span>
                      <span>800 WPM</span>
                    </div>
                  </div>
                </motion.div>
                
                {/* Font Size */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="block mb-2 text-sm font-medium opacity-70">
                    Font Size: {settings.fontSize}px
                  </label>
                  <div className="relative pt-1">
                    <input
                      type="range"
                      min="12"
                      max="48"
                      step="2"
                      value={settings.fontSize}
                      onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ 
                        accentColor: colorScheme.highlight,
                        background: `linear-gradient(to right, ${colorScheme.highlight}, ${colorScheme.highlight} ${(settings.fontSize - 12) / 36 * 100}%, ${colorScheme.text}20 ${(settings.fontSize - 12) / 36 * 100}%, ${colorScheme.text}20)` 
                      }}
                    />
                    <div className="flex justify-between text-xs mt-1 opacity-60">
                      <span>12px</span>
                      <span>48px</span>
                    </div>
                  </div>
                </motion.div>
                
                {/* Words At Time */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <label className="block mb-2 text-sm font-medium opacity-70">
                    Words At Once: {settings.wordsAtTime}
                  </label>
                  <select
                    value={settings.wordsAtTime}
                    onChange={(e) => onUpdateSettings({ wordsAtTime: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-md bg-transparent transition-all hover:border-current"
                    style={{ 
                      borderColor: colorScheme.text + '40',
                      boxShadow: `0 2px 4px ${colorScheme.text}10`
                    }}
                  >
                    <option value="1">1 Word</option>
                    <option value="2">2 Words</option>
                    <option value="3">3 Words</option>
                    <option value="5">5 Words</option>
                  </select>
                </motion.div>
                
                {/* TTS Enabled */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center"
                >
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input
                      id="tts-toggle"
                      type="checkbox"
                      checked={settings.ttsEnabled}
                      onChange={(e) => onUpdateSettings({ ttsEnabled: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`block h-6 rounded-full w-10 transition-colors ${settings.ttsEnabled ? 'bg-current opacity-80' : 'bg-current opacity-20'}`}>
                    </div>
                    <div 
                      className={`absolute left-1 top-1 bg-white rounded-full h-4 w-4 transition transform ${settings.ttsEnabled ? 'translate-x-4' : ''}`}
                      style={{ background: settings.ttsEnabled ? colorScheme.highlight : '#FFF' }}
                    ></div>
                  </div>
                  <label htmlFor="tts-toggle" className="text-sm font-medium">
                    Enable Text-to-Speech
                  </label>
                </motion.div>
                
                {/* TTS Voice (conditionally rendered) */}
                {settings.ttsEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block mb-2 text-sm font-medium opacity-70">
                      Voice
                    </label>
                    <select
                      value={settings.ttsVoice || 'default'}
                      onChange={(e) => onUpdateSettings({ ttsVoice: e.target.value })}
                      className="w-full p-2 border rounded-md bg-transparent transition-all hover:border-current"
                      style={{ 
                        borderColor: colorScheme.text + '40',
                        boxShadow: `0 2px 4px ${colorScheme.text}10`
                      }}
                    >
                      <option value="default">Default</option>
                      <option value="en-US-female">US English (Female)</option>
                      <option value="en-US-male">US English (Male)</option>
                      <option value="en-GB-female">British English (Female)</option>
                      <option value="en-GB-male">British English (Male)</option>
                    </select>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 