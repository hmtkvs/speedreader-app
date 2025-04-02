import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoContract } from 'react-icons/io5';
import { BiSkipPrevious, BiSkipNext } from 'react-icons/bi';
import { IoPlaySharp, IoPauseSharp } from 'react-icons/io5';

interface FullscreenReaderProps {
  isOpen: boolean;
  onClose: () => void;
  currentWords: Array<{
    before: string;
    highlight: string;
    after: string;
  }>;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onForward: () => void;
  onRewind: () => void;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
  fontSize: number;
  onWordClick?: (word: string, event: React.MouseEvent) => void;
}

export function FullscreenReader({
  isOpen,
  onClose,
  currentWords,
  isPlaying,
  onPlay,
  onPause,
  onForward,
  onRewind,
  colorScheme,
  fontSize,
  onWordClick
}: FullscreenReaderProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100]"
          style={{ background: colorScheme.background }}
        >
          {/* Main Content */}
          <div className="h-full flex flex-col items-center justify-center px-4">
            {/* Current Words */}
            <div className="mb-8 font-serif flex justify-center gap-4 w-full max-w-[90vw] md:max-w-2xl overflow-hidden whitespace-nowrap">
              {currentWords.map((word, index) => (
                <div
                  key={index}
                  className={`whitespace-nowrap ${onWordClick ? 'clickable-word cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={(e) => {
                    if (onWordClick) {
                      onWordClick(word.before + word.highlight + word.after, e);
                    }
                  }}
                  style={{ 
                    fontSize: `${Math.min(
                      fontSize * 1.5, // Larger font in fullscreen
                      Math.min(
                        window.innerWidth / (currentWords.length * Math.max(4, Math.max(...currentWords.map(w => 
                          (w.before + w.highlight + w.after).length
                        )) / 2)),
                        window.innerHeight / 3
                      )
                    )}px`
                  }}
                >
                  <span>{word.before}</span>
                  <span style={{ color: colorScheme.highlight }}>{word.highlight}</span>
                  <span>{word.after}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls Overlay */}
          <div 
            className="fixed inset-x-0 bottom-0 p-8 flex justify-center items-center gap-6
              opacity-0 hover:opacity-100 transition-opacity duration-300
              sm:opacity-0 sm:hover:opacity-100"
            style={{ 
              background: `linear-gradient(to top, ${colorScheme.background}, transparent)`
            }}
          >
            <button
              onClick={onClose}
              className="w-16 h-16 rounded-2xl flex items-center justify-center relative
                hover:scale-105 active:scale-95 transition-all duration-300"
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
              <IoContract size={24} style={{ color: colorScheme.text }} />
            </button>
            <button
              onClick={onRewind}
              className="w-16 h-16 rounded-2xl flex items-center justify-center relative
                hover:scale-105 active:scale-95 transition-all duration-300"
              style={{ 
                background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
                boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
              }}
            >
              <BiSkipPrevious size={32} style={{ color: colorScheme.text }} />
            </button>
            <button
              onClick={isPlaying ? onPause : onPlay}
              className="w-16 h-16 rounded-2xl flex items-center justify-center relative
                hover:scale-105 active:scale-95 transition-all duration-300"
              style={{ 
                background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
                boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
              }}
            >
              {isPlaying ? (
                <IoPauseSharp size={32} style={{ color: colorScheme.text }} />
              ) : (
                <IoPlaySharp size={32} style={{ color: colorScheme.text }} />
              )}
            </button>
            <button
              onClick={onForward}
              className="w-16 h-16 rounded-2xl flex items-center justify-center relative
                hover:scale-105 active:scale-95 transition-all duration-300"
              style={{ 
                background: `linear-gradient(135deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
                boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
              }}
            >
              <BiSkipNext size={32} style={{ color: colorScheme.text }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}