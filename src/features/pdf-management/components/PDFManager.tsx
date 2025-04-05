import React, { useEffect, useState } from 'react';
import { PDFList } from './PDFList';
import { PDFUploader } from './PDFUploader';
import { PDFStorageService } from '../services/pdfStorageService';
import { PDFRecord } from '../models/PDFModels';

interface PDFManagerProps {
  userId: string;
  selectedPdfId?: string;
  onSelectPDF?: (pdf: PDFRecord) => void;
}

/**
 * Component for managing PDFs, including upload and viewing
 */
export const PDFManager: React.FC<PDFManagerProps> = ({
  userId,
  selectedPdfId,
  onSelectPDF
}) => {
  const [pdfs, setPdfs] = useState<PDFRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const pdfStorage = PDFStorageService.getInstance();
  
  // Load PDFs when component mounts
  useEffect(() => {
    loadPDFs();
  }, [userId]);
  
  // Function to load PDFs from storage
  const loadPDFs = async () => {
    setLoading(true);
    try {
      const userPDFs = await pdfStorage.getUserPDFs(userId);
      setPdfs(userPDFs);
    } catch (error) {
      console.error('Failed to load PDFs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle PDF upload completion
  const handleUploadComplete = (newPdf: PDFRecord) => {
    setPdfs(prev => [...prev, newPdf]);
    
    // Automatically select the newly uploaded PDF if onSelectPDF is provided
    if (onSelectPDF) {
      onSelectPDF(newPdf);
    }
  };
  
  // Handle PDF deletion
  const handleDeletePDF = async (pdfId: string) => {
    try {
      const success = await pdfStorage.deletePDF(pdfId);
      
      if (success) {
        setPdfs(prev => prev.filter(pdf => pdf.id !== pdfId));
      }
    } catch (error) {
      console.error('Error deleting PDF:', error);
    }
  };
  
  // Handle PDF selection
  const handleSelectPDF = (pdf: PDFRecord) => {
    if (onSelectPDF) {
      onSelectPDF(pdf);
    }
  };
  
  // Render tab-based interface to choose between upload and view
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">PDF Manager</h2>
      </div>
      
      <div className="flex-grow flex p-4 pt-0 overflow-hidden">
        <div className="w-full flex flex-col h-full">
          {/* Upload UI */}
          <PDFUploader 
            userId={userId}
            onUploadComplete={handleUploadComplete}
          />
          
          {/* List of PDFs */}
          <div className="mt-4 flex-grow overflow-auto">
            <PDFList 
              pdfs={pdfs} 
              loading={loading}
              selectedPdfId={selectedPdfId}
              onSelectPDF={handleSelectPDF} 
              onDeletePDF={handleDeletePDF} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 