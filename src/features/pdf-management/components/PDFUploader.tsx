import React, { useState, useCallback } from 'react';
import { 
  Box, Button, Typography, CircularProgress, 
  Alert, Paper, LinearProgress
} from '@mui/material';
import { 
  CloudUpload as UploadIcon, 
  PictureAsPdf as PdfIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { PDFStorageService } from '../services/pdfStorageService';
import { PDFStatus, PDFRecord } from '../models/PDFModels';
import { formatFileSize } from '../../../utils/formatters';

export interface PDFUploaderProps {
  /** User ID for the current user */
  userId: string;
  /** Maximum allowed file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Callback when upload is complete */
  onUploadComplete?: (pdf: PDFRecord) => void;
}

/**
 * Component for uploading PDF files
 */
export const PDFUploader: React.FC<PDFUploaderProps> = ({
  userId,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  onUploadComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pdfStorageService = PDFStorageService.getInstance();
  
  // Reset the component state
  const resetUploader = () => {
    setFile(null);
    setUploading(false);
    setUploadProgress(0);
    setError(null);
  };
  
  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Reset previous state
    setError(null);
    
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const selectedFile = acceptedFiles[0];
    
    // Check file type
    if (!selectedFile.type.includes('pdf')) {
      setError('Only PDF files are allowed.');
      return;
    }
    
    // Check file size
    if (selectedFile.size > maxFileSize) {
      setError(`File is too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
      return;
    }
    
    setFile(selectedFile);
  }, [maxFileSize]);
  
  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading
  });
  
  // Handle upload button click
  const handleUpload = async () => {
    if (!file) return;
    
    try {
      setUploading(true);
      setUploadProgress(10);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      // Upload the file
      const result = await pdfStorageService.uploadPDF(file);
      
      clearInterval(progressInterval);
      
      if (result.success && result.record) {
        setUploadProgress(100);
        
        // Call the callback with the uploaded PDF
        if (onUploadComplete) {
          onUploadComplete(result.record);
        }
        
        // Reset the uploader after a short delay
        setTimeout(resetUploader, 1500);
      } else {
        setError(result.error || 'Failed to upload PDF.');
        setUploading(false);
        setUploadProgress(0);
      }
    } catch (error) {
      setError('An unexpected error occurred during upload.');
      setUploading(false);
      setUploadProgress(0);
      console.error('PDF upload error:', error);
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      <Paper
        elevation={0}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 3,
          mb: 2,
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          cursor: uploading ? 'not-allowed' : 'pointer',
        }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '150px'
        }}>
          {!file ? (
            <>
              <UploadIcon 
                fontSize="large" 
                color={isDragActive ? 'primary' : 'disabled'} 
                sx={{ mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse files
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Maximum file size: {formatFileSize(maxFileSize)}
              </Typography>
            </>
          ) : (
            <>
              <PdfIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>{file.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatFileSize(file.size)}
              </Typography>
              
              {uploading && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
                  >
                    {uploadProgress}%
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={(e) => {
            e.stopPropagation();
            resetUploader();
          }}
          disabled={!file || uploading}
        >
          Clear
        </Button>
        
        <Button
          variant="contained"
          disableElevation
          startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
          onClick={(e) => {
            e.stopPropagation();
            handleUpload();
          }}
          disabled={!file || uploading}
          color="primary"
        >
          {uploading ? 'Uploading...' : 'Upload PDF'}
        </Button>
      </Box>
    </Box>
  );
}; 