import React from 'react';
import { FileUploadCorner } from './FileUploadCorner';
import { SimplifiedReaderModel } from '../../../types/simplified';
import { ReaderProvider } from '../../reader/contexts/ReaderContext';
import { useTheme } from '../../theme/contexts/ThemeContext';

interface FileUploadAdapterProps {
  reader: SimplifiedReaderModel;
  colorScheme?: {
    background: string;
    text: string;
    highlight: string;
  };
}

/**
 * Adapter component for FileUploadCorner that works with the simplified reader model
 */
export const FileUploadAdapter: React.FC<FileUploadAdapterProps> = ({ 
  reader,
  colorScheme
}) => {
  // Get theme if colorScheme is not provided
  const theme = useTheme();
  const effectiveColorScheme = colorScheme || {
    background: theme.colorScheme.background,
    text: theme.colorScheme.text,
    highlight: theme.colorScheme.highlight || '#FF3B30'
  };
  
  // Map the simplified reader model to the options expected by ReaderProvider
  const initialSettings = {
    wpm: reader.wpm || 300,
    fontSize: 16,
    ttsEnabled: false,
    ttsVoice: '',
    colorScheme: {
      background: effectiveColorScheme.background,
      text: effectiveColorScheme.text,
      highlight: effectiveColorScheme.highlight
    }
  };
  
  // Create a ReaderProvider that enables using the FileUploadCorner with context
  return (
    <ReaderProvider 
      initialSettings={initialSettings}
      enableTTS={false}
    >
      <FileUploadCorner
        colorScheme={effectiveColorScheme}
      />
    </ReaderProvider>
  );
};

// Create a singleton instance for compatibility
export const fileUploadAdapter = {
  getInstance: (): { addToReader: (reader: SimplifiedReaderModel) => void } => ({
    addToReader: () => {}
  })
}; 