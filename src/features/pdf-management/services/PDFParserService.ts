import { ErrorHandler } from '../../../utils/errorHandler';
import * as pdfjs from 'pdfjs-dist';

/**
 * Parsed PDF document metadata
 */
export interface PDFDocumentMetadata {
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Document keywords */
  keywords?: string[];
  /** Document creation date */
  creationDate?: string;
  /** Document modification date */
  modificationDate?: string;
  /** Document producer */
  producer?: string;
  /** Document creator tool */
  creator?: string;
}

/**
 * Result of parsing a PDF file
 */
export interface PDFParseResult {
  /** Number of pages in the document */
  numPages: number;
  /** Number of words in the document */
  wordCount: number;
  /** Extracted document metadata */
  metadata?: PDFDocumentMetadata;
  /** Extracted text content */
  text: string;
}

/**
 * Service for parsing PDF files
 * 
 * Extracts content, metadata, and statistics from PDF files
 */
export class PDFParserService {
  private static instance: PDFParserService;
  private errorHandler: ErrorHandler;
  private workerInitialized = false;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }
  
  /**
   * Get singleton instance of PDFParserService
   */
  static getInstance(): PDFParserService {
    if (!PDFParserService.instance) {
      PDFParserService.instance = new PDFParserService();
    }
    return PDFParserService.instance;
  }

  /**
   * Initialize PDF.js worker
   */
  private async initializeWorker(): Promise<void> {
    if (!this.workerInitialized) {
      try {
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        this.workerInitialized = true;
      } catch (error) {
        this.errorHandler.handleError(error as Error, {
          context: 'PDFParserService.initializeWorker'
        });
      }
    }
  }
  
  /**
   * Parse a PDF file to extract content and metadata
   * 
   * @param file PDF file to parse
   * @returns Parsing result with text, metadata, and statistics
   */
  async parsePDF(file: File): Promise<PDFParseResult> {
    try {
      await this.initializeWorker();
      
      // Convert file to ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdfDocument = await loadingTask.promise;
      
      // Get metadata
      const metadata = await this.extractMetadata(pdfDocument);
      
      // Extract text from all pages
      const numPages = pdfDocument.numPages;
      let text = '';
      let wordCount = 0;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        
        const pageText = content.items
          .filter(item => 'str' in item)
          .map(item => (item as any).str)
          .join(' ');
        
        text += pageText + '\n';
        
        // Count words by splitting on whitespace and filtering empty strings
        const pageWords = pageText.split(/\s+/).filter(word => word.length > 0);
        wordCount += pageWords.length;
      }
      
      return {
        numPages,
        wordCount,
        metadata,
        text
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFParserService.parsePDF',
        fileName: file.name
      });
      
      // Return minimal result on error
      return {
        numPages: 0,
        wordCount: 0,
        text: ''
      };
    }
  }
  
  /**
   * Extract metadata from PDF document
   * 
   * @param pdfDocument PDF.js document
   * @returns Extracted metadata
   */
  private async extractMetadata(pdfDocument: pdfjs.PDFDocumentProxy): Promise<PDFDocumentMetadata> {
    try {
      const metadata = await pdfDocument.getMetadata();
      const info = metadata.info as Record<string, any>;
      
      return {
        title: info.Title,
        author: info.Author,
        keywords: info.Keywords ? info.Keywords.split(',').map((k: string) => k.trim()) : undefined,
        creationDate: info.CreationDate,
        modificationDate: info.ModDate,
        producer: info.Producer,
        creator: info.Creator
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFParserService.extractMetadata'
      });
      
      return {};
    }
  }
  
  /**
   * Extract text from a specific page range
   * 
   * @param file PDF file
   * @param startPage Starting page (1-indexed)
   * @param endPage Ending page (1-indexed)
   * @returns Extracted text from the specified pages
   */
  async extractPageRange(file: File, startPage: number, endPage: number): Promise<string> {
    try {
      await this.initializeWorker();
      
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdfDocument = await loadingTask.promise;
      
      // Validate page range
      const numPages = pdfDocument.numPages;
      startPage = Math.max(1, Math.min(startPage, numPages));
      endPage = Math.max(startPage, Math.min(endPage, numPages));
      
      let text = '';
      
      for (let i = startPage; i <= endPage; i++) {
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        
        const pageText = content.items
          .filter(item => 'str' in item)
          .map(item => (item as any).str)
          .join(' ');
        
        text += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      
      return text;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFParserService.extractPageRange',
        fileName: file.name,
        pages: `${startPage}-${endPage}`
      });
      
      return '';
    }
  }
} 