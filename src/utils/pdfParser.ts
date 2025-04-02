// Import PDF.js as a module
import * as pdfjsLib from 'pdfjs-dist';
import { validateFile, sanitizeText, SECURITY_CONFIG } from './security';
import { PDFParsingError, FileValidationError } from '../types/common';
import { ErrorHandler } from './errorHandler';

const errorHandler = ErrorHandler.getInstance();

interface PDFParseOptions {
  maxPages?: number;
  timeout?: number;
  alternativePageLimit?: number;
}

const DEFAULT_OPTIONS: PDFParseOptions = {
  maxPages: 1000,
  timeout: 60000,
  alternativePageLimit: 50
};

// Helper to check if text appears to be PDF structure data rather than actual content
const isPDFStructureData = (text: string): boolean => {
  // Check for typical PDF structure markers
  const pdfMarkers = [
    '%PDF-',        // PDF header
    'endobj',       // Object end marker
    'startxref',    // Cross-reference table
    '<<',           // Dictionary start
    '>>',           // Dictionary end
    '/Filter',      // Common filter indicator
    '/FlateDecode', // Common compression method
    '/Length',      // Length indicator
    'stream',       // Stream marker
    'endstream'     // End stream marker
  ];
  
  // Only consider it PDF structure if there are multiple markers AND high concentration
  const markerCount = pdfMarkers.filter(marker => text.includes(marker)).length;
  
  // If we find multiple PDF structure markers, it may be raw PDF data
  if (markerCount >= 5) {
    // Check for high concentration of non-readable characters
    const nonReadableChars = text.replace(/[a-zA-Z0-9 \n\r\t.,;:?!()[\]{}\-_+='"]/g, '');
    const nonReadableRatio = nonReadableChars.length / text.length;
    
    // If more than 40% of characters are non-readable, it's likely binary data
    if (nonReadableRatio > 0.5) {
      return true;
    }
  }
  
  // Check if the text is primarily PDF header markers without enough readable content
  const readableContent = text.replace(/(%PDF-|endobj|startxref|<<|>>|\/\w+|\d+ \d+|\s+)/g, '');
  if (readableContent.length < text.length * 0.15) {
    return true;
  }
  
  return false;
};

// Enhanced text extraction from PDF text content items
function extractTextFromItems(items: any[]): string {
  let pageText = '';
  let currentLine = '';
  let lastY = -Infinity;

  // Sort items by vertical position (y) then horizontal (x)
  items.sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    return yDiff !== 0 ? yDiff : a.transform[4] - b.transform[4];
  });

  for (const item of items) {
    const y = item.transform[5];
    const str = item.str.trim();
    
    if (!str) continue;

    if (Math.abs(y - lastY) > 5) {
      pageText += currentLine + '\n';
      currentLine = str;
    } else {
      currentLine += (currentLine ? ' ' : '') + str;
    }
    lastY = y;
  }

  return pageText + currentLine;
}

// Try an alternative approach to extract text using PDF.js
async function tryAlternativePDFParsing(file: File, options: PDFParseOptions = DEFAULT_OPTIONS): Promise<string> {
  console.log('Attempting alternative PDF parsing method...');
  
  // Create a fresh ArrayBuffer from the file
  // This is crucial to avoid the "detached ArrayBuffer" error
  const freshArrayBuffer = await file.arrayBuffer();
  
  // Configure PDF.js with different options
  const loadingTask = pdfjsLib.getDocument({
    data: freshArrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    disableRange: false,
    disableStream: false,
    disableAutoFetch: false
  });
  
  try {
    const pdf = await loadingTask.promise as pdfjsLib.PDFDocumentProxy;
    console.log(`Alternative method: PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = '';
    // Process only a limited number of pages for speed if document is large
    const pagesToProcess = Math.min(pdf.numPages, options.alternativePageLimit || 50);
    
    for (let i = 1; i <= pagesToProcess; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Use enhanced text extraction
        const pageText = extractTextFromItems(content.items);
        fullText += pageText + '\n\n';
      } catch (pageError) {
        console.warn(`Alternative method: Error on page ${i}`, pageError);
      }
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Alternative PDF parsing method failed:', error);
    throw error;
  }
}

// Configure the worker - use direct path for better reliability
let workerLoaded = false;
const loadWorker = () => {
  if (!workerLoaded) {
    try {
      // Try to use the local worker first
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      workerLoaded = true;
      console.log('PDF.js worker initialized successfully');
    } catch (err) {
      console.error('Failed to set up PDF.js worker:', err);
      
      try {
        // Use version-specific CDN as fallback
        const pdfWorkerVersion = pdfjsLib.version;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfWorkerVersion}/build/pdf.worker.min.js`;
        workerLoaded = true;
        console.log('PDF.js worker initialized via version-specific CDN');
      } catch (versionError) {
        console.error('Failed to set up version-specific worker:', versionError);
        
        // Last resort fallback
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        workerLoaded = true;
        console.log('PDF.js worker initialized via generic CDN fallback');
      }
    }
  }
};

export async function parsePDF(
  file: File,
  options: PDFParseOptions = DEFAULT_OPTIONS
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
      setTimeout(() => reject(new PDFParsingError('PDF parsing timed out')), options.timeout || DEFAULT_OPTIONS.timeout);
    });

    // First try with standard method
    try {
      console.log('Attempting to load PDF document with standard method...');
      
      // Create a fresh ArrayBuffer for the standard method
      const arrayBuffer = await file.arrayBuffer();
      
      // Check if arrayBuffer is valid
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new PDFParsingError('The PDF file appears to be empty or corrupted.');
      }
      
      // Simplified configuration to minimize potential issues
      const loadPromise = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableAutoFetch: true,
        disableStream: true,
        disableRange: true
      }).promise;
      
      console.log('PDF document loading promise created successfully');
      
      // Use Promise.race with explicit try/catch to handle timeout errors properly
      const pdfPromise = Promise.race([loadPromise, timeoutPromise]);
      const pdf = await pdfPromise;
      console.log('PDF document loaded successfully');
      
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
      
      if (totalPages > (options.maxPages || DEFAULT_OPTIONS.maxPages)!) {
        throw new PDFParsingError(`PDF has too many pages (${totalPages}). Maximum is ${options.maxPages || DEFAULT_OPTIONS.maxPages}`);
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
          
          // Use enhanced text extraction
          const pageText = extractTextFromItems(textContent.items);
          
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
        console.warn('No text extracted with standard method, trying alternative method');
        throw new Error('Empty text extracted');
      }

      // Check if the extracted text seems to be PDF structure data
      if (isPDFStructureData(fullText)) {
        console.warn('PDF structure data detected, trying alternative method');
        throw new Error('PDF structure data detected');
      }

      console.log(`Successfully extracted ${fullText.length} characters from PDF`);
      // Sanitize text before returning
      return sanitizeText(fullText.trim());
      
    } catch (primaryError) {
      // If standard method fails, try alternative method
      console.log('Primary PDF parsing method failed, trying alternative approach...');
      
      try {
        // Never reuse the original ArrayBuffer - always create a fresh one in the alternative method
        const alternativeText = await tryAlternativePDFParsing(file, options);
        
        if (!alternativeText || alternativeText.trim().length < 20) {
          throw new Error('Alternative parsing returned insufficient text');
        }
        
        if (isPDFStructureData(alternativeText)) {
          throw new Error('Alternative parsing returned PDF structure data');
        }
        
        console.log(`Alternative PDF parsing succeeded with ${alternativeText.length} characters`);
        return sanitizeText(alternativeText.trim());
      } catch (alternativeError) {
        console.error('Alternative PDF parsing method failed:', alternativeError);
        throw new PDFParsingError('All PDF parsing methods failed. The document might be using an unsupported format or encoding.');
      }
    }
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
      } else if (errorString.includes('detached')) {
        errorMessage = 'PDF processing error: Unable to process the PDF data buffer.';
      }
    }
    
    const message = errorHandler.handleError(
      error instanceof Error ? error : new PDFParsingError(errorMessage),
      { fileName: file.name, fileSize: file.size }
    );
    
    throw new PDFParsingError(message || errorMessage);
  }
}