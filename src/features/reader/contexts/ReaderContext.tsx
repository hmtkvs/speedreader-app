import React, { createContext, useContext, ReactNode } from 'react';
import { useReader, UseReaderOptions, UseReaderResult } from '../hooks/useReader';
import { ReaderSettings } from '../models/ReaderModel';

/**
 * Context for the Reader feature
 */
const ReaderContext = createContext<UseReaderResult | undefined>(undefined);

/**
 * Props for ReaderProvider component
 */
export interface ReaderProviderProps {
  /** Child components */
  children: ReactNode;
  /** Initial reader settings */
  initialSettings?: Partial<ReaderSettings>;
  /** Whether to enable TTS by default */
  enableTTS?: boolean;
}

/**
 * Provider component for reader context
 * 
 * Makes reader functionality available to all child components
 */
export function ReaderProvider({
  children,
  initialSettings,
  enableTTS
}: ReaderProviderProps): React.ReactElement {
  const readerOptions: UseReaderOptions = {
    initialSettings,
    enableTTS
  };
  
  const readerValue = useReader(readerOptions);
  
  return (
    <ReaderContext.Provider value={readerValue}>
      {children}
    </ReaderContext.Provider>
  );
}

/**
 * Hook to access the reader context
 * 
 * @returns Reader state and control methods
 * @throws Error if used outside of a ReaderProvider
 */
export function useReaderContext(): UseReaderResult {
  const context = useContext(ReaderContext);
  
  if (context === undefined) {
    throw new Error('useReaderContext must be used within a ReaderProvider');
  }
  
  return context;
} 