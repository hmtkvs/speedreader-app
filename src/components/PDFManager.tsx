import React, { useState } from 'react';
import { PDFUploader } from './PDFUploader';
import { PDFList } from './PDFList';
import { PDFStorageService } from '../utils/pdfStorage';

interface PDFManagerProps {
  onSelectPDF?: (pdfId: string, content: string) => void;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function PDFManager({ onSelectPDF, colorScheme }: PDFManagerProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pdfStorage = PDFStorageService.getInstance();

  const handleTabChange = (tab: 'upload' | 'library') => {
    setActiveTab(tab);
  };

  const handleUploadComplete = (pdfId: string) => {
    // Switch to the library tab after successful upload
    setActiveTab('library');
  };

  const handlePDFSelection = async (pdfId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const content = await pdfStorage.getPDFContent(pdfId);
      
      if (!content) {
        throw new Error('Failed to load PDF content');
      }
      
      if (onSelectPDF) {
        onSelectPDF(pdfId, content);
      }
    } catch (err) {
      setError('Failed to load PDF content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex border-b border-current/10 mb-6">
        <button
          className={`px-4 py-2 ${activeTab === 'library' ? 'border-b-2 border-current font-medium' : 'opacity-70'}`}
          onClick={() => handleTabChange('library')}
        >
          Library
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'upload' ? 'border-b-2 border-current font-medium' : 'opacity-70'}`}
          onClick={() => handleTabChange('upload')}
        >
          Upload New
        </button>
      </div>

      {/* Content */}
      <div className="mb-6">
        {activeTab === 'upload' ? (
          <PDFUploader 
            onUploadComplete={handleUploadComplete}
            onUploadError={(error) => setError(error)}
            colorScheme={colorScheme}
          />
        ) : (
          <PDFList 
            onSelectPDF={handlePDFSelection}
            colorScheme={colorScheme}
          />
        )}
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="text-center p-4">
          <div className="inline-block w-6 h-6 border-2 border-current rounded-full border-b-transparent animate-spin mb-2" />
          <p>Loading PDF content...</p>
        </div>
      )}

      {error && (
        <div className="text-center p-4">
          <p className="text-red-500 mb-2">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="px-4 py-2 bg-current/10 rounded-lg hover:bg-current/20 transition-colors text-sm"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}