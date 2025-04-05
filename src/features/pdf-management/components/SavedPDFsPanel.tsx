import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoDocument, IoCloudUploadOutline } from 'react-icons/io5';
import { PDFStorageService } from '../services/pdfStorageService';
import { PDFRecord } from '../models/PDFModels';
import { useReaderContext } from '../../reader/contexts/ReaderContext';

interface SavedPDFsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
  onSetText?: (text: string) => void; // Optional prop for direct text setting
  debugInfo?: {
    readerAvailable: boolean;
    setTextAvailable: boolean;
  };
}

/**
 * Panel displaying a list of saved PDFs
 */
export function SavedPDFsPanel({ 
  isOpen, 
  onClose, 
  colorScheme,
  onSetText,
  debugInfo
}: SavedPDFsPanelProps) {
  // Get reader context and services
  const { setText } = useReaderContext();
  const pdfStorage = PDFStorageService.getInstance();
  
  // Remove debug info logging
  React.useEffect(() => {
    // Debug info logging removed
  }, [debugInfo]);

  // State for PDFs
  const [pdfs, setPdfs] = useState<PDFRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDFs when panel opens
  useEffect(() => {
    if (isOpen) {
      loadPDFs();
    }
  }, [isOpen]);

  const loadPDFs = async () => {
    try {
      // In a real implementation, we would have a user ID
      const userId = "current-user";
      const userPDFs = await pdfStorage.getUserPDFs(userId);
      setPdfs(userPDFs);
    } catch (error) {
      console.error("Error loading PDFs:", error);
    }
  };

  const handlePDFSelect = async (pdf: PDFRecord) => {
    try {
      if (pdf.content) {
        // If we have the content cached, use it
        
        // Set the text without timeouts
        if (onSetText) {
          // Use the provided setText function if available
          onSetText(pdf.content);
        } else if (setText) {
          // Otherwise use the context
          setText(pdf.content);
        } else {
          console.error("ERROR: No text setting mechanism available!");
        }
        
        // Also dispatch a DOM event for components that don't have direct access
        document.dispatchEvent(new CustomEvent('pdf-content-selected', {
          detail: {
            text: pdf.content,
            name: pdf.name,
            length: pdf.content.length,
            preview: pdf.content.substring(0, 100) + "..."
          }
        }));
        
        // Close panel directly
        onClose();
        return;
      }
      
      // If we have a URL, fetch and parse it
      if (pdf.url) {
        const response = await fetch(pdf.url);
        const blob = await response.blob();
        const file = new File([blob], pdf.name);
        
        // Upload the file to get content
        const uploadResult = await pdfStorage.uploadPDF(file);
        if (uploadResult.success && uploadResult.record?.content) {
          // Use a timeout to ensure UI updates first
          setTimeout(() => {
            try {
              if (onSetText) {
                // Use the provided setText function if available
                onSetText(uploadResult.record?.content || "");
              } else {
                // Otherwise use the context
                setText(uploadResult.record?.content || "");
              }
              
              // Close panel after a small delay
              setTimeout(() => onClose(), 300);
            } catch (err) {
              console.error("ERROR setting text:", err);
            }
          }, 100);
          
          return;
        }
      }
      
      // If we couldn't get content, show an error message
      console.error("Could not get content for PDF");
      const errorMessage = `Could not load content for ${pdf.name}. Please try uploading again.`;
      if (onSetText) {
        onSetText(errorMessage);
      } else {
        setText(errorMessage);
        onClose();
      }
    } catch (error) {
      console.error("Error selecting PDF:", error);
      const errorMessage = `Error loading ${pdf.name}. Please try again.`;
      if (onSetText) {
        onSetText(errorMessage);
      } else {
        setText(errorMessage);
        onClose();
      }
    }
  };

  const handleDeletePDF = async (pdfId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const success = await pdfStorage.deletePDF(pdfId);
      if (success) {
        await loadPDFs();
      }
    } catch (error) {
      console.error("Error deleting PDF:", error);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload the file
      const result = await pdfStorage.uploadPDF(file);
      
      if (result.success && result.record) {
        // Refresh the PDF list
        await loadPDFs();
      }
      
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  // Handle touch gestures
  useEffect(() => {
    if (!isOpen) return;

    let startX: number;
    let currentX: number;
    const panel = document.getElementById('saved-pdfs-panel');
    
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      currentX = startX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startX) return;
      currentX = e.touches[0].clientX;
      
      const diff = currentX - startX;
      if (diff < 0) return; // Only allow sliding to close

      if (panel) {
        panel.style.transform = `translateX(${diff}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (!startX || !currentX) return;

      const diff = currentX - startX;
      if (diff > 100) { // If dragged more than 100px, close the panel
        onClose();
      } else if (panel) {
        panel.style.transform = ''; // Reset position
      }

      startX = 0;
      currentX = 0;
    };

    panel?.addEventListener('touchstart', handleTouchStart);
    panel?.addEventListener('touchmove', handleTouchMove);
    panel?.addEventListener('touchend', handleTouchEnd);

    return () => {
      panel?.removeEventListener('touchstart', handleTouchStart);
      panel?.removeEventListener('touchmove', handleTouchMove);
      panel?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            id="saved-pdfs-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-full sm:w-96 z-50
              touch-manipulation"
            style={{ 
              background: colorScheme.background,
              color: colorScheme.text
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-current/10">
              <h2 className="text-lg font-semibold">Saved Documents</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUploadClick}
                  className="p-2 hover:opacity-70 transition-opacity"
                  title="Upload PDF"
                >
                  <IoCloudUploadOutline size={24} style={{ color: colorScheme.highlight }} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:opacity-70 transition-opacity"
                >
                  <IoClose size={24} />
                </button>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File List */}
            <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-4rem)]">
              {pdfs.length === 0 ? (
                <div className="text-center py-8 opacity-60">
                  <IoDocument size={48} className="mx-auto mb-4" />
                  <p>No documents yet</p>
                  <p className="text-sm mt-2">
                    Upload documents using the button in the top-left corner
                  </p>
                </div>
              ) : (
                pdfs.map((pdf, index) => (
                  <motion.button
                    key={`${pdf.id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full text-left p-4 rounded-lg hover:bg-current/5
                      transition-colors flex items-start gap-3
                      min-h-[44px] touch-manipulation"
                    onClick={() => handlePDFSelect(pdf)}
                  >
                    <IoDocument 
                      size={20} 
                      className="flex-shrink-0 mt-1"
                      style={{ color: colorScheme.highlight }}
                    />
                    <div className="flex-grow min-w-0">
                      <p className="font-medium truncate">{pdf.name}</p>
                      <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                        <span>{pdf.lastAccessed ? new Date(pdf.lastAccessed).toLocaleDateString() : 'Never accessed'}</span>
                        <span>•</span>
                        <span>{pdf.readProgress ? `${pdf.readProgress.toFixed(1)}% read` : 'New'}</span>
                      </div>
                    </div>                    
                  </motion.button>
                ))
              )}
            </div>
            {/* Separate Delete Buttons */}
            <div className="absolute right-0 top-[4rem] h-[calc(100%-4rem)] pointer-events-none">
              <div className="p-4 space-y-2 h-full">
                {pdfs.map((pdf, index) => (
                  <div 
                    key={`delete-${pdf.id}-${index}`}
                    className="h-[76px] flex items-center justify-end pointer-events-auto"
                  >
                    <div
                      onClick={(e) => handleDeletePDF(pdf.id, e)}
                      className="p-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <IoClose size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 