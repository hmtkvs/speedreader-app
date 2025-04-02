import React, { useState, useCallback, useRef } from 'react';
import { IoCloudUploadOutline, IoCheckmarkCircle, IoAlertCircle, IoDocumentText } from 'react-icons/io5';
import { PDFStorageService, PDFStatus } from '../utils/pdfStorage';
import { ErrorHandler } from '../utils/errorHandler';

interface PDFUploaderProps {
  onUploadComplete?: (pdfId: string) => void;
  onUploadError?: (error: string) => void;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function PDFUploader({ onUploadComplete, onUploadError, colorScheme }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<Record<string, any> | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfStorage = PDFStorageService.getInstance();
  const errorHandler = ErrorHandler.getInstance();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const resetUploadState = () => {
    setUploadProgress(null);
    setError(null);
    setFileName(null);
    setValidationDetails(null);
    setUploadStatus('idle');
  };

  const processPDFFile = async (file: File) => {
    try {
      setIsUploading(true);
      setFileName(file.name);
      setUploadStatus('validating');
      setUploadProgress(10);

      // Upload the PDF with validation and processing
      const result = await pdfStorage.uploadPDF(file);

      if (!result.success) {
        setError(result.error || 'Failed to upload PDF');
        setUploadStatus('error');
        setUploadProgress(null);
        
        if (result.validationResult) {
          setValidationDetails({
            fileName: result.validationResult.fileName,
            fileSize: result.validationResult.fileSize,
            mimeType: result.validationResult.mimeType,
            error: result.validationResult.error
          });
        }
        
        if (onUploadError) {
          onUploadError(result.error || 'Unknown error');
        }
        return;
      }

      // Update progress as processing completes
      setUploadProgress(100);
      setUploadStatus('success');
      
      if (onUploadComplete && result.pdfId) {
        onUploadComplete(result.pdfId);
      }
    } catch (error) {
      const errorMessage = errorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown upload error'),
        { context: 'PDFUploader.processPDFFile', fileName: file.name }
      );
      
      setError(errorMessage);
      setUploadStatus('error');
      setUploadProgress(null);
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      processPDFFile(file);
    }
  }, [onUploadComplete, onUploadError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      processPDFFile(file);
    }
  }, [onUploadComplete, onUploadError]);

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-all duration-200 ease-in-out
          ${isDragging ? 'border-orange-500 bg-orange-500/10' : 'border-current/20 hover:border-current/40'}
          ${isUploading ? 'opacity-80 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center text-center gap-4">
          {uploadStatus === 'idle' ? (
            <>
              <IoCloudUploadOutline size={48} className="opacity-60" />
              <div>
                <p className="text-lg mb-2">Drag & drop your PDF here</p>
                <p className="text-sm opacity-60">or click to browse</p>
              </div>
              <div className="text-xs opacity-40">
                Maximum file size: 10MB • PDF files only
              </div>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <IoAlertCircle size={48} className="text-red-500" />
              <div>
                <p className="text-lg mb-2">Upload failed</p>
                <p className="text-sm text-red-500">{error}</p>
                {validationDetails && (
                  <div className="mt-4 text-left bg-red-500/10 p-3 rounded-lg">
                    <p className="text-sm"><strong>File:</strong> {validationDetails.fileName}</p>
                    <p className="text-sm"><strong>Size:</strong> {(validationDetails.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                    <p className="text-sm"><strong>Type:</strong> {validationDetails.mimeType}</p>
                  </div>
                )}
              </div>
              <button
                onClick={resetUploadState}
                className="px-4 py-2 bg-current/10 rounded-lg hover:bg-current/20 transition-colors text-sm"
              >
                Try again
              </button>
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <IoCheckmarkCircle size={48} className="text-green-500" />
              <div>
                <p className="text-lg mb-2">Upload successful</p>
                <p className="text-sm">{fileName}</p>
              </div>
              <button
                onClick={resetUploadState}
                className="px-4 py-2 bg-current/10 rounded-lg hover:bg-current/20 transition-colors text-sm"
              >
                Upload another PDF
              </button>
            </>
          ) : (
            <>
              <IoDocumentText size={48} className="opacity-60" />
              <div className="w-full">
                <p className="text-sm mb-2 truncate">{fileName}</p>
                <div className="w-full h-1 rounded-full bg-current/10">
                  <div
                    className="h-1 rounded-full transition-all duration-200"
                    style={{ 
                      width: `${uploadProgress || 0}%`,
                      background: colorScheme.highlight
                    }}
                  />
                </div>
                <p className="text-xs mt-2 opacity-60">
                  {uploadStatus === 'validating' && 'Validating PDF file...'}
                  {uploadStatus === 'uploading' && 'Uploading PDF file...'}
                  {uploadStatus === 'processing' && 'Processing PDF content...'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}