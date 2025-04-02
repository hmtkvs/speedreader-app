import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { IoDocumentText, IoAlertCircle } from 'react-icons/io5';
import { UploadNotification } from './UploadNotification';
import { ReaderModel } from '../models/reader';
import { FileRecord } from '../types/common';
import { parsePDF } from '../utils/pdfParser';
import { Platform } from '../utils/platform';

interface FileUploadCornerProps {
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  },
  reader: ReaderModel;
}

export function FileUploadCorner({ colorScheme, reader }: FileUploadCornerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [recentFiles, setRecentFiles] = useState<FileRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'text/plain'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (!allowedTypes.includes(file.type) && !['pdf', 'txt'].includes(fileExtension || '')) {
      setNotification({
        type: 'error',
        message: 'Please upload a PDF or text file'
      });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large');
      setNotification({
        type: 'error',
        message: 'File size must be less than 10MB'
      });
      return false;
    }
    return true;
  };

  const clearInput = () => {
    // Reset the file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fallback method to read text content directly without PDF.js
  const extractTextWithoutPdfJs = async (file: File): Promise<string> => {
    try {
      console.log('Using text extraction fallback method...');
      // For simplicity, we'll just read the PDF as text
      // This might not give perfect results but is better than nothing
      const text = await file.text();
      
      // Clean the text - remove binary characters that might appear
      const cleanedText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
      
      if (cleanedText.length < 50) {
        throw new Error('Could not extract meaningful text from the PDF');
      }
      
      return cleanedText;
    } catch (error) {
      console.error('Fallback text extraction failed:', error);
      throw new Error('Both primary and fallback PDF processing methods failed');
    }
  };

  const processFile = async (file: File) => {
    // Prevent multiple uploads simultaneously
    if (isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      
      if (!validateFile(file)) {
        setCurrentFile(null);
        setUploadProgress(null);
        clearInput();
        setIsProcessing(false);
        return;
      }

      setCurrentFile(file.name);
      setUploadProgress(0);
      
      // Show initial processing notification
      setNotification({
        type: 'success',
        message: `Processing ${file.name}...`
      });

      let text: string;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Parse PDF with progress updates
        setUploadProgress(10);
        
        try {
          // Add intermediate progress updates to give feedback to the user
          const progressTimeout1 = setTimeout(() => {
            setUploadProgress(prev => prev === 10 ? 30 : prev);
          }, 1000);
          
          const progressTimeout2 = setTimeout(() => {
            setUploadProgress(prev => prev === 30 ? 50 : prev);
          }, 2000);
          
          // Try parsing with PDF.js
          try {
            text = await parsePDF(file);
            // Clear timeouts if successful
            clearTimeout(progressTimeout1);
            clearTimeout(progressTimeout2);
            
            setUploadProgress(90);
          } catch (pdfJsError) {
            // Clear timeouts on error
            clearTimeout(progressTimeout1);
            clearTimeout(progressTimeout2);
            
            console.error('Primary PDF parsing failed, trying fallback method:', pdfJsError);
            
            // Let the user know we're using a fallback method
            setNotification({
              type: 'warning',
              message: 'PDF processing issues detected, using fallback method...'
            });
            
            setUploadProgress(60);
            
            // Try fallback method
            text = await extractTextWithoutPdfJs(file);
            setUploadProgress(90);
          }
        } catch (finalError) {
          console.error('All PDF parsing methods failed:', finalError);
          throw new Error('Unable to process this PDF file. It might be corrupted or incompatible.');
        }
      } else {
        // Handle as text file
        try {
          text = await file.text();
        } catch (textError) {
          console.error('Text file parsing error:', textError);
          throw new Error('Failed to read text file. The file might be corrupted.');
        }
      }

      setUploadProgress(95);
      
      // Add the book to the reader
      let bookId;
      try {
        bookId = await reader.addBook(text, file.name);
      } catch (addError) {
        console.error('Error adding book:', addError);
        throw new Error('Failed to process the file for reading');
      }
      
      setUploadProgress(100);
      
      if (bookId) {
        try {
          await reader.loadBook(bookId);
        } catch (loadError) {
          console.error('Error loading book:', loadError);
          // We still consider this a success since the upload worked,
          // but we'll note the loading issue
          setNotification({
            type: 'success',
            message: `Uploaded ${file.name}, but couldn't open it automatically`
          });
          setRecentFiles(prev => [{
            name: file.name,
            timestamp: new Date(),
            status: 'success',
            type: file.type,
            size: file.size
          }, ...prev.slice(0, 4)]);
          
          clearInput();
          setCurrentFile(null);
          setUploadProgress(null);
          setIsProcessing(false);
          return;
        }
      }
      
      setNotification({
        type: 'success',
        message: `Successfully uploaded ${file.name}`
      });

      setRecentFiles(prev => [{
        name: file.name,
        timestamp: new Date(),
        status: 'success',
        type: file.type,
        size: file.size
      }, ...prev.slice(0, 4)]);

    } catch (error) {
      console.error('Error processing file:', error);
      
      let errorMessage = 'Failed to process file';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      setNotification({
        type: 'error',
        message: errorMessage
      });
      
      setRecentFiles(prev => [{
        name: file.name,
        timestamp: new Date(),
        status: 'error',
        type: file.type,
        size: file.size
      }, ...prev.slice(0, 4)]);
    } finally {
      // Always clean up, even if there was an error
      clearInput();
      setCurrentFile(null);
      setUploadProgress(null);
      setIsProcessing(false);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleButtonClick = () => {
    if (isProcessing) {
      // Prevent additional uploads while processing
      setNotification({
        type: 'error',
        message: 'Still processing previous file, please wait...'
      });
      return;
    }
    
    if (Platform.isNative) {
      // Native file picker will be handled by the platform-specific code
      Platform.pickDocument((file) => processFile(file));
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-4 z-40 touch-manipulation"
    >
      <button
        onClick={handleButtonClick}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center relative 
          hover:scale-105 active:scale-95 transition-all duration-300
          shadow-2xl backdrop-blur-md ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ 
          background: `linear-gradient(135deg, 
            ${colorScheme.background}E6, 
            ${colorScheme.background}99
          )`,
          boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
        }}
        disabled={isProcessing}
      >
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle at top left, ${colorScheme.highlight}0A, transparent)`,
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
        <IoDocumentText size={24} />
        
        {/* Upload progress indicator */}
        {uploadProgress !== null && (
          <motion.div 
            className="absolute inset-0 rounded-2xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div 
              className="absolute bottom-0 left-0 right-0"
              style={{ 
                height: '4px',
                background: colorScheme.highlight,
                width: `${uploadProgress}%`
              }}
            />
          </motion.div>
        )}
      </button>
      
      {/* Upload Notification */}
      {notification && (
        <UploadNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
          colorScheme={colorScheme}
        />
      )}
    </motion.div>
  );
}