import React, { useState } from 'react';
import { ReaderProvider } from '../contexts/ReaderContext';
import { FullscreenReader } from '../components/FullscreenReader';
import { useReaderContext } from '../contexts/ReaderContext';

/**
 * Container component for the fullscreen reader experience
 * 
 * Handles integration between reader context and UI components
 */
export function ReaderContainer(): React.ReactElement {
  return (
    <ReaderProvider>
      <ReaderContainerContent />
    </ReaderProvider>
  );
}

/**
 * Internal component that uses the reader context
 */
function ReaderContainerContent(): React.ReactElement {
  const {
    currentWords,
    isPlaying,
    settings,
    play,
    pause,
    forward,
    rewind
  } = useReaderContext();
  
  const [isOpen, setIsOpen] = useState(false);
  
  const handleClose = () => {
    setIsOpen(false);
    pause();
  };
  
  const handleOpen = () => {
    setIsOpen(true);
  };
  
  return (
    <>
      <button 
        onClick={handleOpen}
        className="px-4 py-2 bg-blue-600 text-white rounded-md"
      >
        Open Reader
      </button>
      
      <FullscreenReader
        isOpen={isOpen}
        onClose={handleClose}
        currentWords={currentWords}
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
        onForward={() => forward(1)}
        onRewind={() => rewind(1)}
        colorScheme={settings.colorScheme}
        fontSize={settings.fontSize}
      />
    </>
  );
} 