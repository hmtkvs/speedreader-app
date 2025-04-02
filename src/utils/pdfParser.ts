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

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export async function parsePDF(
  file: File,
  options: PDFParseOptions = { maxPages: 1000, timeout: 30000 }
): Promise<string> {
  try {
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
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const loadPromise = pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pdf = await Promise.race([loadPromise, timeoutPromise]);
    
    // Get total pages
    const totalPages = pdf.numPages;
    if (totalPages > options.maxPages!) {
      throw new PDFParsingError(`PDF has too many pages (${totalPages}). Maximum is ${options.maxPages}`);
    }

    let fullText = '';
    let processedText = 0;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      processedText += pageText.length;
      if (processedText > SECURITY_CONFIG.maxTextLength) {
        throw new PDFParsingError('PDF content exceeds maximum allowed length');
      }

      fullText += pageText + '\n\n';
    }

    // Sanitize text before returning
    return sanitizeText(fullText.trim());
  } catch (error) {
    const message = errorHandler.handleError(
      error instanceof Error ? error : new PDFParsingError('Unknown PDF parsing error'),
      { fileName: file.name, fileSize: file.size }
    );
    throw new PDFParsingError(message);
  }
}