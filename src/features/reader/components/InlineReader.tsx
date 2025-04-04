import React from 'react';
import { IoPlaySharp, IoPauseSharp } from 'react-icons/io5';
import { BiSkipPrevious, BiSkipNext } from 'react-icons/bi';
import { ReadingWord } from '../models/ReaderModel';

/**
 * Props for InlineReader component
 */
export interface InlineReaderProps {
  /** Current words to display */
  currentWords: ReadingWord[];
  /** Whether the reader is currently playing */
  isPlaying: boolean;
  /** Progress value between 0 and 1 */
  progress?: number;
  /** Callback for play button click */
  onPlay: () => void;
  /** Callback for pause button click */
  onPause: () => void;
  /** Callback for forward button click */
  onForward: () => void;
  /** Callback for rewind button click */
  onRewind: () => void;
  /** Color scheme for the reader */
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
  /** Font size in pixels */
  fontSize: number;
  /** Optional callback for when a word is clicked */
  onWordClick?: (word: string, event: React.MouseEvent) => void;
}

/**
 * Inline reading component for embedded use
 * 
 * Displays words inline with minimal controls for reading
 */
export function InlineReader({
  currentWords,
  isPlaying,
  progress = 0,
  onPlay,
  onPause,
  onForward,
  onRewind,
  colorScheme,
  fontSize,
  onWordClick
}: InlineReaderProps): React.ReactElement {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      {progress > 0 && (
        <div className="w-full h-1 bg-gray-200 rounded mb-4">
          <div 
            className="h-full rounded" 
            style={{
              width: `${progress * 100}%`,
              background: colorScheme.highlight
            }}
          />
        </div>
      )}
      
      {/* Words display */}
      <div className="mb-4 font-serif flex justify-center gap-2 w-full overflow-hidden whitespace-nowrap">
        {currentWords.length > 0 ? (
          currentWords.map((word, index) => (
            <div
              key={index}
              className={`whitespace-nowrap ${onWordClick ? 'clickable-word cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              onClick={(e) => {
                if (onWordClick) {
                  onWordClick(word.before + word.highlight + word.after, e);
                }
              }}
              style={{ 
                fontSize: `${fontSize}px`,
                color: colorScheme.text
              }}
            >
              <span>{word.before}</span>
              <span style={{ color: colorScheme.highlight }}>{word.highlight}</span>
              <span>{word.after}</span>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500">No text to display</div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex justify-center items-center gap-4">
        <button
          onClick={onRewind}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Rewind"
        >
          <BiSkipPrevious size={24} style={{ color: colorScheme.text }} />
        </button>
        
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <IoPauseSharp size={24} style={{ color: colorScheme.text }} />
          ) : (
            <IoPlaySharp size={24} style={{ color: colorScheme.text }} />
          )}
        </button>
        
        <button
          onClick={onForward}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Forward"
        >
          <BiSkipNext size={24} style={{ color: colorScheme.text }} />
        </button>
      </div>
    </div>
  );
} 