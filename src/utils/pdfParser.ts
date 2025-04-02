// Import PDF.js as a module
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { validateFile, sanitizeText, SECURITY_CONFIG } from './security';
import { PDFParsingError, FileValidationError } from '../types/common';
import { ErrorHandler } from './errorHandler';

const errorHandler = ErrorHandler.getInstance();

interface PDFParseOptions {
  maxPages?: number;
  timeout?: number;
}

// Define a consistent version - should now match the package.json
const PDFJS_VERSION = '3.11.174';
console.log(`Using PDF.js version: ${PDFJS_VERSION}`);

// Configure the worker directly with the same version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;
console.log(`Worker URL set to: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);

/**
 * Parses a PDF file and extracts text content
 * @param file The PDF file to parse
 * @param options Configuration options for parsing
 * @returns A promise resolving to the extracted text
 */
export async function parsePDF(
  file: File,
  options: PDFParseOptions = { maxPages: 1000, timeout: 30000 }
): Promise<string> {
  try {
    console.log('Starting PDF parsing...');
    
    // Validate file before processing
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new FileValidationError(validation.error || 'Invalid file');
    }

    // Set up timeout
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new PDFParsingError('PDF parsing timed out')), options.timeout);
    });

    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('File read as ArrayBuffer');

    // Load the PDF document with a simple configuration
    const loadPromise = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
      cMapPacked: true 
    }).promise;
    
    console.log('PDF loading started');
    const pdf = await Promise.race([loadPromise, timeoutPromise]) as PDFDocumentProxy;
    
    // Get total pages
    const totalPages = pdf.numPages;
    console.log(`PDF loaded with ${totalPages} pages`);
    
    if (totalPages === 0) {
      throw new PDFParsingError('The PDF has no pages');
    }
    
    if (totalPages > (options.maxPages || 1000)) {
      throw new PDFParsingError(`PDF has too many pages (${totalPages}). Maximum is ${options.maxPages}`);
    }

    let fullText = '';
    let processedText = 0;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${totalPages}`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Simple text extraction - just map and join strings
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        
        processedText += pageText.length;
        if (processedText > SECURITY_CONFIG.maxTextLength) {
          throw new PDFParsingError('PDF content exceeds maximum allowed length');
        }

        fullText += pageText + '\n\n';
      } catch (pageError) {
        console.warn(`Error processing page ${pageNum}:`, pageError);
        // Continue with next page rather than failing entirely
      }
    }

    // Check if we got any meaningful text
    if (!fullText.trim()) {
      throw new PDFParsingError('Could not extract any text from the PDF');
    }

    console.log(`Successfully extracted ${processedText} characters from PDF`);
    
    // Sanitize text before returning
    return sanitizeText(fullText.trim());
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Handle different error types
    let errorMessage = 'Failed to parse PDF';
    
    if (error instanceof PDFParsingError || error instanceof FileValidationError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      // Special handling for common PDF.js errors
      const errorString = error.toString().toLowerCase();
      if (errorString.includes('password')) {
        errorMessage = 'The PDF is password protected. Please provide an unprotected document.';
      } else if (errorString.includes('corrupt') || errorString.includes('invalid')) {
        errorMessage = 'The PDF file appears to be corrupted or invalid.';
      } else if (errorString.includes('timeout')) {
        errorMessage = 'PDF processing timed out. The file might be too large or complex.';
      } else if (errorString.includes('version')) {
        errorMessage = 'PDF.js version mismatch. Please check the console for details.';
      } else {
        errorMessage = `PDF parsing error: ${error.message}`;
      }
    }
    
    // Use the error handler to process the error
    const message = errorHandler.handleError(
      error instanceof Error ? error : new PDFParsingError(errorMessage),
      { fileName: file.name, fileSize: file.size }
    );
    
    throw new PDFParsingError(message || errorMessage);
  }
}