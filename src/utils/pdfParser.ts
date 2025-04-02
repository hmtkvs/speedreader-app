// Import PDF.js as a module
import * as pdfjsLib from 'pdfjs-dist';
import { validateFile, sanitizeText, SECURITY_CONFIG } from './security';
import { PDFParsingError, FileValidationError } from '../types/common';
import { ErrorHandler } from './errorHandler';
import { TextItem, PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

const errorHandler = ErrorHandler.getInstance();

// PDF parsing configuration
const PDF_CONFIG = {
  // Known working version that exists on CDN
  WORKER_VERSION: '3.11.174',
  // CDN URL pattern
  WORKER_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  // CMap URL for handling special characters
  CMAP_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
  // Maximum pages to process for performance
  MAX_PAGES: 1000,
  // Processing timeout in milliseconds
  TIMEOUT: 60000
};

/**
 * Configure the PDF.js worker once at the module level
 */
function setupPDFWorker(): void {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
    return; // Already configured
  }
  
  try {
    console.log(`Configuring PDF.js worker with version ${PDF_CONFIG.WORKER_VERSION}`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_URL;
    console.log(`Worker URL set to: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
  } catch (error) {
    console.error('Error configuring PDF.js worker:', error);
    // Redundant fallback in case the first assignment fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_URL;
  }
}

// Configure the worker immediately when the module loads
setupPDFWorker();

// Type definition for PDF text items to handle inconsistencies in the API
interface PDFTextItem {
  str?: string;
  text?: string;
  transform?: number[];
  y?: number;
  [key: string]: any;
}

/**
 * Extract text from PDF content
 * @param textContent The text content object from PDF.js
 * @returns Extracted text string
 */
function extractText(textContent: any): string {
  if (!textContent || !textContent.items || !Array.isArray(textContent.items)) {
    return '';
  }

  let text = '';
  let lastY: number | null = null;

  // Sort items by vertical position (top to bottom)
  try {
    const sortedItems = [...textContent.items].sort((a: PDFTextItem, b: PDFTextItem) => {
      const aY = a.transform ? a.transform[5] : a.y || 0;
      const bY = b.transform ? b.transform[5] : b.y || 0;
      return bY - aY; // Top to bottom
    });

    for (const item of sortedItems) {
      // Handle different PDF structure formats with explicit typing
      const itemObj = item as PDFTextItem;
      const str = itemObj.str || itemObj.text || '';
      const y = itemObj.transform ? itemObj.transform[5] : itemObj.y || 0;
      
      // Add newline if we're on a new line
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        text += '\n';
      }
      
      text += str + ' ';
      lastY = y;
    }
  } catch (error) {
    console.warn('Error during text extraction, using fallback method:', error);
    
    // Fallback: just concatenate all strings if sorting fails
    for (const item of textContent.items) {
      const itemObj = item as PDFTextItem;
      const str = itemObj.str || itemObj.text || '';
      if (str) {
        text += str + ' ';
      }
    }
  }

  return text.trim();
}

/**
 * Main function to parse a PDF file
 * @param file The PDF file to parse
 * @returns Promise resolving to the extracted text
 */
export async function parsePDF(file: File): Promise<string> {
  try {
    console.log(`Starting PDF parsing with version ${pdfjsLib.version}`);
    
    // Ensure worker is configured
    setupPDFWorker();
    
    // Create a timeout promise
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('PDF parsing timed out')), PDF_CONFIG.TIMEOUT);
    });
    
    // Create the parsing promise
    const parsingPromise = async (): Promise<string> => {
      // Try standard approach first
      try {
        return await standardParsing(file);
      } catch (primaryError) {
        console.warn('Standard parsing failed, trying fallback method:', primaryError);
        
        // Try robust fallback if standard parsing fails
        try {
          return await fallbackParsing(file);
        } catch (fallbackError) {
          console.error('Fallback parsing failed:', fallbackError);
          throw new PDFParsingError('All parsing methods failed. The document may use unsupported features.');
        }
      }
    };
    
    // Execute parsing with timeout
    return Promise.race([parsingPromise(), timeoutPromise]);
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    errorHandler.handleError(error instanceof Error ? error : new Error('PDF parsing error'));
    throw new PDFParsingError('Failed to parse PDF. The file may be corrupted or password-protected.');
  }
}

/**
 * Standard PDF parsing approach
 */
async function standardParsing(file: File): Promise<string> {
  console.log('Attempting standard PDF parsing method...');
  
  // Get fresh array buffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Create loading task with optimal settings
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: PDF_CONFIG.CMAP_URL,
    cMapPacked: true
  });
  
  // Load PDF document
  const pdf = await loadingTask.promise as PDFDocumentProxy;
  const totalPages = Math.min(pdf.numPages, PDF_CONFIG.MAX_PAGES);
  console.log(`PDF loaded. Processing ${totalPages} pages...`);
  
  // Extract text from all pages
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = extractText(textContent);
      if (pageText.trim()) {
        fullText += pageText + '\n\n';
      }
    } catch (pageError) {
      console.warn(`Error extracting text from page ${pageNum}:`, pageError);
      // Continue with next page
    }
  }
  
  const result = fullText.trim();
  if (!result) {
    throw new Error('No text could be extracted using standard method');
  }
  
  return sanitizeText(result);
}

/**
 * Fallback PDF parsing approach with different options
 */
async function fallbackParsing(file: File): Promise<string> {
  console.log('Attempting fallback PDF parsing method...');
  
  // Get fresh array buffer - critical to avoid detached buffer issues
  const freshArrayBuffer = await file.arrayBuffer();
  
  // Try with different loading options
  const loadingTask = pdfjsLib.getDocument({
    data: freshArrayBuffer,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
    cMapUrl: PDF_CONFIG.CMAP_URL,
    cMapPacked: true
  });
  
  // Load PDF document
  const pdf = await loadingTask.promise as PDFDocumentProxy;
  const pageLimit = Math.min(pdf.numPages, 50); // Process fewer pages for fallback
  console.log(`Fallback method: Processing ${pageLimit} pages`);
  
  // Extract text with simplified approach
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Simplified text extraction for fallback
      let pageText = '';
      if (textContent && textContent.items) {
        for (const item of textContent.items) {
          const itemObj = item as PDFTextItem;
          if (typeof itemObj.str === 'string') {
            pageText += itemObj.str + ' ';
          } else if (typeof itemObj.text === 'string') {
            pageText += itemObj.text + ' ';
          }
        }
      }
      
      if (pageText.trim()) {
        fullText += pageText.trim() + '\n\n';
      }
    } catch (pageError) {
      console.warn(`Fallback: Error on page ${pageNum}:`, pageError);
      // Continue with next page
    }
  }
  
  const result = fullText.trim();
  if (!result) {
    throw new Error('No text could be extracted with fallback method');
  }
  
  return sanitizeText(result);
}