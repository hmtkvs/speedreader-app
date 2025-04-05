import React, { useCallback } from 'react';
import { SavedPDFsPanel } from './SavedPDFsPanel';
import { SimplifiedReaderModel } from '../../../types/simplified';

interface SavedPDFsPanelAdapterProps {
  isOpen: boolean;
  onClose: () => void;
  reader: SimplifiedReaderModel;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

/**
 * Debug adapter for the SavedPDFsPanel that directly uses the reader model
 * without any context providers
 */
export const SavedPDFsPanelAdapter: React.FC<SavedPDFsPanelAdapterProps> = (props) => {
  const { isOpen, onClose, colorScheme, reader } = props;
  
  // Create a direct setText function that uses the reader model
  const handleSetText = useCallback((text: string) => {
    // Make sure we have text before calling setText
    if (!text) {
      console.error("ADAPTER ERROR: Attempted to set empty text");
      return;
    }
    
    try {
      // Now call the actual reader's setText
      if (reader && reader.setText) {
        // Call the reader's setText directly
        reader.setText(text);
      } else {
        console.error("Reader or setText not available");
      }
      
      // Dispatch a direct DOM event with the raw text content
      document.dispatchEvent(new CustomEvent('pdf-direct-content', { 
        detail: { 
          text: text,
          length: text.length,
          preview: text.substring(0, 100) + "..."
        }
      }));
    } catch (err) {
      console.error("ADAPTER ERROR: Failed to set text in reader model", err);
    }
    
    // Close the panel
    onClose();
  }, [reader, onClose]);
  
  return (
    <SavedPDFsPanel
      isOpen={isOpen}
      onClose={onClose}
      colorScheme={colorScheme}
      onSetText={handleSetText}
      debugInfo={{
        readerAvailable: !!reader,
        setTextAvailable: !!(reader && reader.setText)
      }}
    />
  );
}; 