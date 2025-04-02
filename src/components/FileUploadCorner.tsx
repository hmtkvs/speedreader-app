import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { IoDocumentText } from 'react-icons/io5';
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
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [recentFiles, setRecentFiles] = useState<FileRecord[]>([]);

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

  const processFile = async (file: File) => {
    try {
      if (!validateFile(file)) {
        setCurrentFile(null);
        setUploadProgress(null);
        return;
      }

      setCurrentFile(file.name);
      setUploadProgress(0);

      let text: string;
      if (file.type === 'application/pdf') {
        // Parse PDF
        setUploadProgress(10);
        text = await parsePDF(file);
        setUploadProgress(90);
      } else {
        // Handle as text file
        text = await file.text();
      }

      setUploadProgress(100);
      const bookId = await reader.addBook(text, file.name);
      
      if (bookId) {
        await reader.loadBook(bookId);
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

      setUploadProgress(null);
      setCurrentFile(null);
    } catch (error) {
      console.error('Error processing file:', error);
      setNotification({
        type: 'error',
        message: 'Failed to process file'
      });
      setRecentFiles(prev => [{
        name: file.name,
        timestamp: new Date(),
        status: 'error',
        type: file.type,
        size: file.size
      }, ...prev.slice(0, 4)]);
      setCurrentFile(null);
      setUploadProgress(null);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleButtonClick = () => {
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
        className="w-16 h-16 rounded-2xl flex items-center justify-center relative 
          hover:scale-105 active:scale-95 transition-all duration-300
          shadow-2xl backdrop-blur-md"
        style={{ 
          background: `linear-gradient(135deg, 
            ${colorScheme.background}E6, 
            ${colorScheme.background}99
          )`,
          boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
        }}
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
        />
        <IoDocumentText size={24} />
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