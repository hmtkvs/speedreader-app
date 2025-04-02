import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoLanguage } from 'react-icons/io5';

interface TranslationTooltipProps {
  word: string;
  translation: {
    text: string;
    example: string;
    language: string;
  } | null;
  position: { x: number; y: number } | null;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function TranslationTooltip({ word, translation, position, colorScheme }: TranslationTooltipProps) {
  if (!position || !translation) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y + 24,
          background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
          color: colorScheme.text,
          boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`,
          zIndex: 1000,
        }}
        className="rounded-2xl backdrop-blur-md p-4 min-w-[200px] max-w-[300px]"
      >
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
          }}
        />
        
        {/* Original Word */}
        <div className="mb-2 font-medium relative z-10">
          {word}
        </div>
        
        {/* Translation */}
        <div className="flex items-start gap-2 relative z-10">
          <div className="flex-grow">
            <div className="text-lg font-serif" style={{ color: colorScheme.highlight }}>
              {translation.text}
            </div>
            <div className="text-sm opacity-60 mt-2 italic">
              {translation.example}
            </div>
          </div>
          
          {/* Language Indicator */}
          <div 
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ background: `${colorScheme.text}1A` }}
          >
            <IoLanguage size={12} />
            <span>{translation.language}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}