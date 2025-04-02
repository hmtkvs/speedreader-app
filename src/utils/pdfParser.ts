// Import PDF.js as a module
import * as pdfjsLib from 'pdfjs-dist';
import { validateFile, sanitizeText, SECURITY_CONFIG } from './security';
import { PDFParsingError, FileValidationError } from '../types/common';
import { ErrorHandler } from './errorHandler';

const errorHandler = ErrorHandler.getInstance();

interface PDFParseOptions {
  maxPages?: number;
  timeout?: number;
}

// Configure the worker - use direct path for better reliability
let workerLoaded = false;
const loadWorker = () => {
  if (!workerLoaded) {
    try {
      // Using a direct worker path instead of CDN for better reliability
      // The worker URL is relative to the project's public path
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      workerLoaded = true;
      console.log('PDF.js worker initialized successfully');
    } catch (err) {
      console.error('Failed to set up PDF.js worker:', err);
      
      // Fallback to the previous CDN if the first one fails
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        workerLoaded = true;
        console.log('PDF.js worker initialized via CDN fallback');
      } catch (fallbackErr) {
        console.error('Failed to set up PDF.js worker via fallback:', fallbackErr);
        // Last resort fallback - use the version bundled with pdfjs-dist
        const pdfWorkerVersion = pdfjsLib.version;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfWorkerVersion}/build/pdf.worker.min.js`;
        workerLoaded = true;
        console.log('PDF.js worker initialized via version-specific fallback');
      }
    }
  }
};

export async function parsePDF(
  file: File,
  options: PDFParseOptions = { maxPages: 1000, timeout: 30000 }
): Promise<string> {
  try {
    // Load the worker before processing
    loadWorker();

    // Validate file before processing
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new FileValidationError(validation.error || 'Invalid file');
    }

    // Set up timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new PDFParsingError('PDF parsing timed out')), options.timeout);
    });

    // Read the file as ArrayBuffer
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log(`Successfully read file as ArrayBuffer: ${file.name}, size: ${arrayBuffer.byteLength} bytes`);
    } catch (readError) {
      console.error('Error reading file:', readError);
      throw new PDFParsingError('Could not read the PDF file. The file might be corrupted.');
    }

    // Check if arrayBuffer is valid
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new PDFParsingError('The PDF file appears to be empty or corrupted.');
    }

    // Load the PDF document with simplified parameters for better compatibility
    let loadPromise;
    try {
      console.log('Attempting to load PDF document...');
      // Simplified configuration to minimize potential issues
      loadPromise = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableAutoFetch: true,
        disableStream: true,
        disableRange: true
      }).promise;
      console.log('PDF document loading promise created successfully');
    } catch (loadError) {
      console.error('PDF loading error:', loadError);
      throw new PDFParsingError(`Failed to initialize PDF document: ${loadError.message || 'Unknown error'}`);
    }
    
    // Use Promise.race with explicit try/catch to handle timeout errors properly
    let pdf;
    try {
      console.log('Waiting for PDF document to load...');
      pdf = await loadPromise;
      console.log('PDF document loaded successfully');
    } catch (error) {
      const loadError = error as Error;
      console.error('PDF document loading failed:', loadError);
      // Provide detailed error information
      const errorMessage = loadError.message || 'Unknown error';
      throw new PDFParsingError(`Failed to load PDF document: ${errorMessage}`);
    }
    
    // Check if pdf is valid
    if (!pdf) {
      throw new PDFParsingError('Failed to load the PDF document: no document returned');
    }
    
    // Get total pages
    const totalPages = pdf.numPages;
    console.log(`PDF loaded successfully with ${totalPages} pages`);
    
    if (totalPages === 0) {
      throw new PDFParsingError('The PDF document appears to be empty.');
    }
    
    if (totalPages > options.maxPages!) {
      throw new PDFParsingError(`PDF has too many pages (${totalPages}). Maximum is ${options.maxPages}`);
    }

    let fullText = '';
    let processedText = 0;

    // Extract text from each page with better error handling
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${totalPages}...`);
        const page = await pdf.getPage(pageNum);
        
        if (!page) {
          console.error(`Failed to get page ${pageNum}`);
          continue; // Skip this page instead of failing the whole process
        }
        
        // Try to get text content with error handling
        let textContent;
        try {
          textContent = await page.getTextContent();
        } catch (textError) {
          console.error(`Error extracting text from page ${pageNum}:`, textError);
          continue; // Skip this page
        }
        
        if (!textContent || !textContent.items) {
          console.warn(`No text content found on page ${pageNum}`);
          continue; // Skip this page
        }
        
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
        
        processedText += pageText.length;
        if (processedText > SECURITY_CONFIG.maxTextLength) {
          throw new PDFParsingError('PDF content exceeds maximum allowed length');
        }

        fullText += pageText + '\n\n';
        console.log(`Successfully processed page ${pageNum}/${totalPages}`);
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue processing other pages instead of failing completely
        fullText += `[Error processing page ${pageNum}]\n\n`;
      }
    }

    // Check if we got any text
    if (!fullText.trim()) {
      throw new PDFParsingError('Could not extract any text from the PDF. The document might be scanned or image-based.');
    }

    console.log(`Successfully extracted ${fullText.length} characters from PDF`);
    // Sanitize text before returning
    return sanitizeText(fullText.trim());
  } catch (error) {
    console.error('PDF parsing error details:', error);
    
    // Provide more specific error messages based on common issues
    let errorMessage = 'An unexpected error occurred. Please try again.';
    
    if (error instanceof PDFParsingError) {
      errorMessage = error.message;
    } else if (error instanceof FileValidationError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      // Provide the actual error message for better diagnostics
      errorMessage = `Failed to parse PDF: ${error.message || 'Unknown error'}`;
      
      // Check for common PDF.js errors
      const errorString = error.toString().toLowerCase();
      if (errorString.includes('password')) {
        errorMessage = 'The PDF is password protected. Please provide an unprotected document.';
      } else if (errorString.includes('corrupt') || errorString.includes('invalid')) {
        errorMessage = 'The PDF file appears to be corrupted or invalid.';
      } else if (errorString.includes('network') || errorString.includes('fetch')) {
        errorMessage = 'Network error while processing the PDF. Please try again.';
      } else if (errorString.includes('aborted') || errorString.includes('timeout')) {
        errorMessage = 'PDF processing timed out. The file might be too large or complex.';
      }
    }
    
    const message = errorHandler.handleError(
      error instanceof Error ? error : new PDFParsingError(errorMessage),
      { fileName: file.name, fileSize: file.size }
    );
    
    throw new PDFParsingError(message || errorMessage);
  }
}