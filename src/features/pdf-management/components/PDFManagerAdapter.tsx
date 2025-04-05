import React, { useState } from 'react';
import { PDFManager } from './PDFManager';
import { PDFRecord } from '../models/PDFModels';
import { PDFParserService } from '../services/PDFParserService';

interface PDFManagerAdapterProps {
  onSelectPDF?: (pdfId: string, content: string) => void;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

/**
 * Adapter component to bridge between the old and new PDFManager APIs
 */
export const PDFManagerAdapter: React.FC<PDFManagerAdapterProps> = ({
  onSelectPDF,
  colorScheme
}) => {
  const [isLoading, setIsLoading] = useState<string | undefined>(undefined);
  const pdfParser = PDFParserService.getInstance();
  
  // Adapter function to convert from new API to old API
  const handlePDFSelection = async (pdf: PDFRecord) => {
    if (onSelectPDF && pdf && pdf.id) {
      setIsLoading(pdf.id);
      try {
        // If we already have the content, use it
        if (pdf.content) {
          onSelectPDF(pdf.id, pdf.content);
        } 
        // If we have a URL, fetch and parse it
        else if (pdf.url) {
          try {
            const response = await fetch(pdf.url);
            const blob = await response.blob();
            const parseResult = await pdfParser.parsePDF(new File([blob], pdf.name));
            onSelectPDF(pdf.id, parseResult.text);
          } catch (error) {
            console.error("Error loading PDF:", error);
            // Use a placeholder message as fallback
            onSelectPDF(pdf.id, `Failed to load content for ${pdf.name}. The PDF might be corrupted or use unsupported features.`);
          }
        } 
        // Fallback with placeholder
        else {
          onSelectPDF(pdf.id, `Content of ${pdf.name} could not be loaded. Please try uploading again.`);
        }
      } finally {
        setIsLoading(undefined);
      }
    }
  };

  return (
    <div style={{ 
      background: colorScheme.background, 
      color: colorScheme.text,
      height: '100%',
      borderRadius: '0.5rem',
      overflow: 'hidden'
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '0.5rem',
          textAlign: 'center',
          background: colorScheme.highlight,
          color: 'white',
          zIndex: 10
        }}>
          Loading PDF content...
        </div>
      )}
      <PDFManager
        userId="current-user" // Replace with actual user ID when authentication is integrated
        onSelectPDF={handlePDFSelection}
        selectedPdfId={isLoading}
      />
    </div>
  );
}; 