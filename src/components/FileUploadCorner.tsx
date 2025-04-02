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
  const [timeoutIds, setTimeoutIds] = useState<number[]>([]);

  // Helper to clear all timeouts
  const clearAllTimeouts = () => {
    timeoutIds.forEach(id => clearTimeout(id));
    setTimeoutIds([]);
  };

  // Helper to add and track a timeout
  const addTimeout = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      callback();
      // Remove this timeout ID from the list
      setTimeoutIds(prev => prev.filter(timeoutId => timeoutId !== id));
    }, delay);
    setTimeoutIds(prev => [...prev, id]);
    return id;
  };

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

  const processFile = async (file: File) => {
    // Prevent multiple uploads simultaneously
    if (isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      clearAllTimeouts(); // Clear any existing timeouts
      
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

      // Add intermediate progress updates to give feedback to the user
      addTimeout(() => setUploadProgress(20), 500);
      addTimeout(() => setUploadProgress(40), 1500);
      
      let text: string;
      
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Parse PDF file
        setUploadProgress(10);
        
        try {
          // Process the PDF file
          text = await parsePDF(file);
          
          // Validate the extracted text
          if (!text || text.trim().length < 20) {
            throw new Error('Extracted text is too short or empty');
          }
          
          setUploadProgress(90);
        } catch (pdfError) {
          console.error('PDF parsing failed:', pdfError);
          
          // Provide a helpful error message based on the error
          let errorMessage = 'Failed to process PDF file';
          if (pdfError instanceof Error) {
            errorMessage = pdfError.message;
          }
          
          // Alert the user
          setNotification({
            type: 'error',
            message: errorMessage
          });
          
          // Create readable fallback message when all parsing methods fail
          text = `
This PDF document (${file.name}, ${(file.size / 1024).toFixed(2)} KB) could not be processed.

Possible reasons:
- The PDF may use advanced features or complex encoding
- It might contain scanned images rather than text
- It could be password-protected or corrupted

Please try a different PDF file or convert this document to a more compatible format.
`;
        }
      } else {
        // Handle as plain text file
        try {
          text = await file.text();
        } catch (textError) {
          console.error('Text file parsing error:', textError);
          throw new Error('Failed to read text file. The file might be corrupted.');
        }
      }

      setUploadProgress(95);
      
      // Add the text to the reader
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
            type: 'warning',
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
      clearAllTimeouts();
      
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