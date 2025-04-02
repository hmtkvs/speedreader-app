import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoCheckmarkCircle } from 'react-icons/io5';
import { COLOR_SCHEMES, FONT_FAMILIES, ColorScheme } from '../models/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme: ColorScheme;
  onHighlightColorChange: (color: string) => void;
  onFontChange: (fontFamily: string) => void;
  onColorSchemeChange: (scheme: typeof COLOR_SCHEMES[0]) => void;
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  colorScheme,
  onHighlightColorChange,
  onFontChange,
  onColorSchemeChange
}: SettingsModalProps) {
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
                    Appearance
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
                  className={`text-gray-500 hover:text-gray-700
                    w-11 h-11 flex items-center justify-center
                    touch-manipulation rounded-full relative
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                    focus-visible:ring-${colorScheme.highlight}`}
                  style={{}}
                  aria-label="Close settings"
                >
                  <div className="absolute inset-0 rounded-full hover:bg-current/5 transition-colors" />
                  <IoClose size={24} />
                </motion.button>
              </div>
              
              {/* Highlight Color */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6"
              >
                <h3 className="text-sm font-medium opacity-60 mb-2">Highlight Color</h3>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    '#FF3B30', // Red (default)
                    '#FF9500', // Orange
                    '#FFCC00', // Yellow
                    '#34C759', // Green
                    '#5856D6', // Purple
                    '#007AFF', // Blue
                  ].map((color, index) => (
                    <motion.button
                      key={color}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      onClick={() => onHighlightColorChange(color)}
                      whileHover={{ scale: 1.15 }}
                      whileFocus={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        w-full aspect-square rounded-lg relative
                        transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                        ${colorScheme.highlight === color ? 'ring-2 ring-offset-2' : ''}
                      `}
                      style={{ 
                        background: color
                      }}
                      aria-label={`Select ${color} as highlight color`}
                      aria-pressed={colorScheme.highlight === color}
                    >
                      <AnimatePresence>
                        {colorScheme.highlight === color && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.3 }}
                              className="w-1.5 h-1.5 rounded-full bg-white" 
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Font Family */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-6"
              >
                <h3 className="text-sm font-medium opacity-60 mb-2">Font Family</h3>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_FAMILIES.map((font, index) => (
                    <motion.button
                      key={font.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      onClick={() => onFontChange(font.value)}
                      whileHover={{ y: -2, backgroundColor: `${colorScheme.highlight}15` }}
                      whileFocus={{ y: -2, backgroundColor: `${colorScheme.highlight}15` }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        p-3 rounded-lg text-center relative
                        transition-all focus:outline-none focus-visible:ring-2
                        ${colorScheme.font === font.value ? '' : ''}
                      `}
                      style={{
                        background: colorScheme.font === font.value ? colorScheme.highlight + '33' : undefined,
                        borderColor: colorScheme.highlight
                      }}
                      aria-pressed={colorScheme.font === font.value}
                    >
                      <div
                        className="text-sm"
                        style={{ fontFamily: font.value }}
                      >
                        {font.name}
                      </div>
                      
                      {colorScheme.font === font.value && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-1 right-1"
                        >
                          <IoCheckmarkCircle 
                            size={14} 
                            style={{ color: colorScheme.highlight }} 
                          />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Color Schemes */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <h3 className="text-sm font-medium opacity-60 mb-2">Color Schemes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 touch-manipulation">
                  {COLOR_SCHEMES.map((scheme, index) => (
                    <motion.button
                      key={scheme.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      onClick={() => onColorSchemeChange(scheme)}
                      whileHover={{ scale: 1.05 }}
                      whileFocus={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative w-full h-20 rounded-lg overflow-hidden border-2 
                        min-h-[44px]
                        transition-all focus:outline-none focus-visible:ring-2
                        ${
                        colorScheme.id === scheme.id 
                          ? 'border-orange-500 scale-105' 
                          : 'border-transparent hover:scale-102'
                      }`}
                      style={{ 
                        background: scheme.background,
                        borderColor: colorScheme.highlight
                      }}
                      aria-pressed={colorScheme.id === scheme.id}
                      aria-label={`${scheme.name} color scheme`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span style={{ color: scheme.text }}>read</span>
                      </div>
                      
                      {colorScheme.id === scheme.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-2 right-2 z-10"
                        >
                          <div className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: colorScheme.highlight }}>
                            <IoCheckmarkCircle 
                              size={14} 
                              color="white" 
                            />
                          </div>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}