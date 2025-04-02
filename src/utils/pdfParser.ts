// Import PDF.js as a module
import * as pdfjsLib from 'pdfjs-dist';
import { validateFile, sanitizeText, SECURITY_CONFIG } from './security';
import { PDFParsingError, FileValidationError } from '../types/common';
import { ErrorHandler } from './errorHandler';
import { TextItem, PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

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

export interface PDFPage {
  text: string;
  pageNumber: number;
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

// This function explicitly sets the worker source to match the PDF.js version
function loadWorker() {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
    return; // Worker already set
  }

  try {
    // Force a specific version to avoid mismatches
    const pdfVersion = '5.1.91'; // Set a fixed version
    console.log(`Setting PDF.js worker with version ${pdfVersion}`);
    
    // Use CDN for the worker file with the exact same version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.js`;
    console.log(`Set worker URL: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
  } catch (error) {
    console.error('Error setting PDF.js worker:', error);
    // Fallback to the same hardcoded version
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.1.91/build/pdf.worker.min.js';
    console.log('Using fallback worker URL with version 5.1.91');
  }
}

function extractTextFromPDFPage(textContent: any): string {
  if (!textContent || !textContent.items || !Array.isArray(textContent.items)) {
    return '';
  }

  // Position tracking for better paragraph detection
  let lastY: number | null = null;
  let text = '';

  // Sort items by y position (top to bottom)
  const sortedItems = [...textContent.items].sort((a, b) => {
    // Handle different PDF structure formats
    const aY = a.transform ? a.transform[5] : a.y;
    const bY = b.transform ? b.transform[5] : b.y;
    return bY - aY; // Reverse sort (top to bottom)
  });

  for (const item of sortedItems) {
    // Handle different PDF structure formats
    const str = (item as TextItem).str || item.text || '';
    const y = item.transform ? item.transform[5] : item.y;
    
    // Add a newline if this is a new line/paragraph
    if (lastY !== null && Math.abs(y - lastY) > 5) {
      text += '\n';
    }
    
    text += str + ' ';
    lastY = y;
  }

  return text.trim();
}

function isValidContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  // Basic content validation
  if (text.length < 10) return false;
  
  // Check for readable content (more than just numbers and symbols)
  const wordPattern = /[a-zA-Z]{3,}/g;
  const words = text.match(wordPattern);
  
  return words !== null && words.length > 5;
}

export async function parsePDF(
  file: File,
  options: PDFParseOptions = DEFAULT_OPTIONS
): Promise<PDFPage[]> {
  try {
    // Load the worker before processing
    loadWorker();
    
    console.log(`Starting PDF parsing with PDF.js version ${pdfjsLib.version}`);
    
    // Get the array buffer for the PDF file
    const arrayBuffer = await file.arrayBuffer();
    
    try {
      // Attempt to extract text with primary method
      console.log('Attempting to extract text using primary method...');
      
      // Load the PDF with optimal settings
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.1.91/cmaps/',
        cMapPacked: true,
      });
      
      const pdf = await loadingTask.promise as PDFDocumentProxy;
      const totalPages = Math.min(pdf.numPages, options.maxPages);
      console.log(`PDF loaded. Processing ${totalPages} pages...`);
      
      // Extract text from each page with better error handling
      const pages: PDFPage[] = [];
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          console.log(`Processing page ${pageNum}/${totalPages}`);
          const page = await pdf.getPage(pageNum);
          
          const textContent = await page.getTextContent({
            normalizeWhitespace: true
          });
          
          if (!isPDFStructureData(textContent)) {
            console.warn(`Page ${pageNum} does not contain valid text structure`);
            continue;
          }
          
          const pageText = extractTextFromPDFPage(textContent);
          
          // Only add non-empty pages
          if (pageText.trim().length > 0) {
            pages.push({
              text: pageText.trim(),
              pageNumber: pageNum
            });
          }
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
          errorHandler.logError('PDF page processing error', { pageNum, error: pageError });
        }
      }
      
      // Check if we found readable content
      const allText = pages.map(p => p.text).join(' ');
      if (pages.length > 0 && isValidContent(allText)) {
        return pages;
      }
      
      // If we didn't get good results, try an alternative approach
      console.log('Primary parsing method did not produce valid content. Trying alternative method...');
      return await alternativeParsePDF(file, options.alternativePageLimit);
      
    } catch (primaryError) {
      console.error('Primary PDF parsing method failed:', primaryError);
      errorHandler.logError('Primary PDF parsing failed', { error: primaryError });
      
      // Try alternative approach if primary method fails
      try {
        console.log('Attempting to extract text using alternative method...');
        const alternativeText = await extractTextWithAlternativeMethod(file, options);
        
        console.log(`Alternative PDF parsing succeeded with ${alternativeText.length} characters`);
        return alternativeText.trim().split('\n\n').map((text, index) => ({
          text,
          pageNumber: index + 1
        }));
      } catch (alternativeError) {
        console.error('Alternative PDF parsing method failed:', alternativeError);
        throw new PDFParsingError('All PDF parsing methods failed. The document might be using an unsupported format or encoding.', alternativeError as Error);
      }
    }
  } catch (error) {
    console.error('PDF parsing failed:', error);
    errorHandler.logError('PDF parsing error', { error });
    throw new PDFParsingError('Failed to parse PDF. The file may be corrupted or password-protected.', error as Error);
  }
}

/**
 * Alternative method to parse a PDF when the primary method fails.
 * Uses a fresh ArrayBuffer and different parsing options.
 */
export async function alternativeParsePDF(file: File, pageLimit?: number): Promise<PDFPage[]> {
  console.log(`Starting alternative PDF parsing with PDF.js version ${pdfjsLib.version}`);
  loadWorker();
  
  try {
    // Create a fresh ArrayBuffer (important to avoid detached buffer issues)
    const arrayBuffer = await file.arrayBuffer();
    
    // Different loading options for the alternative approach
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      disableRange: true,
      disableStream: true,
      disableAutoFetch: true,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.1.91/cmaps/',
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise as PDFDocumentProxy;
    const pageCount = Math.min(pdf.numPages, pageLimit || 30); // Limit page count
    console.log(`Alternative parsing: PDF loaded. Processing ${pageCount} pages.`);
    
    const pages: PDFPage[] = [];
    
    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        
        // Try with different options
        const textContent = await page.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: true
        });
        
        // Simpler text extraction to avoid structure issues
        let text = '';
        if (textContent && textContent.items) {
          for (const item of textContent.items) {
            if ('str' in item) {
              text += (item as any).str + ' ';
            }
          }
        }
        
        // Only add non-empty pages
        if (text.trim().length > 0) {
          pages.push({
            text: text.trim(),
            pageNumber: i
          });
        }
      } catch (error) {
        console.warn(`Alternative parsing: Error on page ${i}:`, error);
      }
    }
    
    if (pages.length === 0) {
      throw new PDFParsingError('Could not extract any text from the document.');
    }
    
    return pages;
  } catch (error: any) {
    console.error('Alternative PDF parsing failed:', error);
    throw new PDFParsingError('Alternative parsing method failed.', error);
  }
}