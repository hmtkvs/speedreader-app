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

// Configure the worker with proper error handling
// Ensure worker is loaded only once
let workerLoaded = false;
const loadWorker = () => {
  if (!workerLoaded) {
    try {
      // Use a more reliable CDN source for the worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      workerLoaded = true;
    } catch (err) {
      console.error('Failed to set up PDF.js worker:', err);
      // Fallback to the previous CDN if the first one fails
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      workerLoaded = true;
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
    } catch (readError) {
      console.error('Error reading file:', readError);
      throw new PDFParsingError('Could not read the PDF file. The file might be corrupted.');
    }

    // Check if arrayBuffer is valid
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new PDFParsingError('The PDF file appears to be empty or corrupted.');
    }

    // Load the PDF document with additional parameters for better compatibility
    let loadPromise;
    try {
      loadPromise = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
        disableRange: true, // Disable range requests to avoid network issues
        disableStream: true, // Disable streaming for better compatibility
        disableAutoFetch: true // Disable auto-fetching for better compatibility
      }).promise;
    } catch (loadError) {
      console.error('PDF loading error:', loadError);
      throw new PDFParsingError('Failed to load PDF document. The file may be corrupted or password protected.');
    }
    
    // Use Promise.race with try/catch to handle timeout errors properly
    let pdf;
    try {
      pdf = await Promise.race([loadPromise, timeoutPromise]) as pdfjsLib.PDFDocumentProxy;
    } catch (raceError) {
      console.error('PDF loading race error:', raceError);
      if (raceError instanceof PDFParsingError && raceError.message.includes('timed out')) {
        throw new PDFParsingError('PDF processing timed out. The file might be too large or complex.');
      }
      throw new PDFParsingError('Failed to process the PDF document.');
    }
    
    // Check if pdf is valid
    if (!pdf) {
      throw new PDFParsingError('Failed to load the PDF document.');
    }
    
    // Get total pages
    const totalPages = pdf.numPages;
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