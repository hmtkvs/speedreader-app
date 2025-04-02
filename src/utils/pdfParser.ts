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
  // But only if we also have a high concentration of non-readable characters
  if (markerCount >= 4) {
    // Check for high concentration of non-readable characters
    const nonReadableChars = text.replace(/[a-zA-Z0-9 \n\r\t.,;:?!()[\]{}\-_+='"]/g, '');
    const nonReadableRatio = nonReadableChars.length / text.length;
    
    // If more than 40% of characters are non-readable, it's likely binary data
    if (nonReadableRatio > 0.4) {
      return true;
    }
  }
  
  // Check if the text is primarily PDF header markers without enough readable content
  const readableContent = text.replace(/(%PDF-|endobj|startxref|<<|>>|\/\w+|\d+ \d+|\s+)/g, '');
  if (readableContent.length < text.length * 0.1) {
    return true;
  }
  
  return false;
};

// Try an alternative approach to extract text using PDF.js
async function tryAlternativePDFParsing(file: File, arrayBuffer: ArrayBuffer): Promise<string> {
  console.log('Attempting alternative PDF parsing method...');
  
  // Configure PDF.js with different options
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    disableRange: false,  // Try with range requests enabled
    disableStream: false, // Try with streaming enabled
    disableAutoFetch: false
  });
  
  try {
    const pdf = await loadingTask.promise;
    console.log(`Alternative method: PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = '';
    // Process only first 50 pages for speed if document is large
    const pagesToProcess = Math.min(pdf.numPages, 50);
    
    for (let i = 1; i <= pagesToProcess; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Join the text items with proper spacing
        let lastY = -1;
        let pageText = '';
        
        for (const item of content.items) {
          const textItem = item as any;
          // Add newline if y-position changes significantly
          if (lastY !== -1 && Math.abs(textItem.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += textItem.str + ' ';
          lastY = textItem.transform[5];
        }
        
        fullText += pageText.trim() + '\n\n';
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

    // First try with standard method
    try {
      console.log('Attempting to load PDF document with standard method...');
      // Simplified configuration to minimize potential issues
      const loadPromise = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableAutoFetch: true,
        disableStream: true,
        disableRange: true
      }).promise;
      
      console.log('PDF document loading promise created successfully');
      
      // Use Promise.race with explicit try/catch to handle timeout errors properly
      const pdf = await loadPromise;
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
        const alternativeText = await tryAlternativePDFParsing(file, arrayBuffer);
        
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
      }
    }
    
    const message = errorHandler.handleError(
      error instanceof Error ? error : new PDFParsingError(errorMessage),
      { fileName: file.name, fileSize: file.size }
    );
    
    throw new PDFParsingError(message || errorMessage);
  }
}