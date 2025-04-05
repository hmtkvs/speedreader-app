import { PDFRecord, PDFStatus, PDFMetadata, PDFUploadResult } from '../models/PDFModels';
import { ErrorHandler } from '../../../utils/errorHandler';
import { PDFValidatorService } from './PDFValidatorService';
import { PDFParserService } from './PDFParserService';
import { v4 as uuidv4 } from 'uuid';

// Storage keys
const PDF_STORAGE_KEY = 'speed-reader-pdfs';

/**
 * Service for PDF storage operations
 */
export class PDFStorageService {
  private static instance: PDFStorageService;
  private pdfValidator: PDFValidatorService;
  private pdfParser: PDFParserService;
  private errorHandler: ErrorHandler;
  private pdfs: Map<string, PDFRecord> = new Map();
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.pdfValidator = PDFValidatorService.getInstance();
    this.pdfParser = PDFParserService.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.loadFromStorage();
  }
  
  /**
   * Get singleton instance of PDFStorageService
   */
  static getInstance(): PDFStorageService {
    if (!PDFStorageService.instance) {
      PDFStorageService.instance = new PDFStorageService();
    }
    return PDFStorageService.instance;
  }

  /**
   * Load PDFs from localStorage
   */
  private loadFromStorage(): void {
    try {
      // Get PDFs from localStorage
      const pdfsJson = localStorage.getItem(PDF_STORAGE_KEY);
      
      if (pdfsJson) {
        // Parse JSON
        const pdfsArray = JSON.parse(pdfsJson) as PDFRecord[];
        
        // Convert array to map
        this.pdfs = new Map();
        pdfsArray.forEach(pdf => {
          console.log(`DEBUG: PDF loaded from storage: ${pdf.name}, content length: ${pdf.content?.length || 0}`);
          this.pdfs.set(pdf.id, pdf);
        });
        
        console.log(`DEBUG: Loaded ${this.pdfs.size} PDFs from storage`);
      }
    } catch (error) {
      console.error('Error loading PDFs from storage:', error);
    }
  }

  /**
   * Save PDFs to localStorage
   */
  private saveToStorage(): void {
    try {
      // Convert PDFs map to array
      const pdfsArray = Array.from(this.pdfs.values()).map(pdf => {
        // Create a copy of the PDF record to avoid circular references
        const { ...pdfCopy } = pdf;
        
        // Ensure content is included in storage
        return pdfCopy;
      });
      
      // Save to localStorage
      console.log(`DEBUG: PDFStorageService.saveToStorage - Saving ${pdfsArray.length} PDFs`);
      localStorage.setItem(PDF_STORAGE_KEY, JSON.stringify(pdfsArray));
    } catch (error) {
      console.error('Error saving PDFs to storage:', error);
    }
  }

  /**
   * Upload a PDF file
   * 
   * @param file PDF file to upload
   * @param content Optional pre-extracted text content
   * @returns Upload result with success status and PDF record or error message
   */
  async uploadPDF(file: File, content?: string): Promise<PDFUploadResult> {
    try {
      // Validate PDF file
      const validationResult = await this.pdfValidator.validatePDF(file);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error || 'Invalid PDF file'
        };
      }
      
      // Generate unique ID for the PDF
      const pdfId = uuidv4();
      
      let text = content;
      let parseResult;
      
      // If no content was provided, parse the PDF
      if (!text) {
        // Parse PDF to extract metadata and content
        parseResult = await this.pdfParser.parsePDF(file);
        text = parseResult.text;
      } else {
        // Use provided content but still try to get metadata
        try {
          parseResult = await this.pdfParser.parsePDF(file);
        } catch (error) {
          // If parsing fails, create minimal metadata
          parseResult = {
            text,
            numPages: 1,
            metadata: {
              title: file.name.replace(/\.[^/.]+$/, ''),
              author: '',
              creationDate: new Date().toISOString()
            }
          };
        }
      }
      
      // Create PDF record
      const pdfRecord: PDFRecord = {
        id: pdfId,
        name: file.name,
        size: file.size,
        uploadDate: new Date(),
        lastAccessed: new Date(),
        readProgress: 0,
        status: PDFStatus.READY,
        content: text,
        metadata: {
          pageCount: parseResult.numPages,
          title: parseResult.metadata?.title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          author: parseResult.metadata?.author || '',
          creationDate: parseResult.metadata?.creationDate
        }
      };
      
      // Store the PDF record
      this.pdfs.set(pdfId, pdfRecord);
      this.saveToStorage();
      
      return {
        success: true,
        record: pdfRecord
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.uploadPDF',
        fileName: file.name
      });
      
      return {
        success: false,
        error: 'Failed to upload PDF file'
      };
    }
  }

  /**
   * Download a PDF file
   * 
   * @param pdf PDF record to download
   */
  async downloadPDF(pdf: PDFRecord): Promise<void> {
    try {
      if (!pdf.url && !pdf.content) {
        throw new Error('PDF content not available');
      }
      
      // Create blob from content if available
      if (pdf.content) {
        const blob = new Blob([pdf.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary anchor element
        const link = document.createElement('a');
        link.href = url;
        link.download = pdf.name;
        
        // Append to body and trigger click
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (pdf.url) {
        // Use URL if content not available
        const link = document.createElement('a');
        link.href = pdf.url;
        link.download = pdf.name;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.downloadPDF',
        pdfId: pdf.id
      });
      throw error;
    }
  }

  /**
   * Delete a PDF file
   * 
   * @param pdfId ID of the PDF to delete
   * @returns Whether deletion was successful
   */
  async deletePDF(pdfId: string): Promise<boolean> {
    try {
      // Remove from memory
      const success = this.pdfs.delete(pdfId);
      
      // Save to storage
      if (success) {
        this.saveToStorage();
      }
      
      return success;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.deletePDF',
        pdfId
      });
      
      return false;
    }
  }

  /**
   * Get PDF records for a user
   * 
   * @param userId User ID to get PDFs for
   * @returns Array of PDF records
   */
  async getUserPDFs(userId: string): Promise<PDFRecord[]> {
    try {
      // Get all PDFs
      const allPdfs = Array.from(this.pdfs.values());
      
      // In a real implementation, we would filter by userId
      const userPdfs = allPdfs;
      
      console.log(`DEBUG: PDFStorageService.getUserPDFs - Found ${userPdfs.length} PDFs`);
      // Log some details about the content to help debug
      userPdfs.forEach(pdf => {
        console.log(`DEBUG: PDF ${pdf.name}: content size=${pdf.content?.length || 0}`);
      });
      
      return userPdfs;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.getUserPDFs',
        userId
      });
      
      return [];
    }
  }

  /**
   * Get a PDF by ID
   * 
   * @param pdfId PDF ID
   * @returns PDF record or undefined if not found
   */
  async getPDF(pdfId: string): Promise<PDFRecord | undefined> {
    try {
      const pdf = this.pdfs.get(pdfId);
      
      // Update last accessed time
      if (pdf) {
        pdf.lastAccessed = new Date();
        this.saveToStorage();
      }
      
      return pdf;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.getPDF',
        pdfId
      });
      
      return undefined;
    }
  }

  /**
   * Update PDF metadata and status
   * 
   * @param pdfId ID of the PDF to update
   * @param metadata Updated metadata
   * @param status Updated status
   * @returns Whether update was successful
   */
  async updatePDFMetadata(
    pdfId: string,
    metadata: Partial<PDFMetadata>,
    status?: PDFStatus
  ): Promise<boolean> {
    try {
      const pdf = this.pdfs.get(pdfId);
      
      if (!pdf) {
        return false;
      }
      
      // Update metadata
      if (metadata) {
        pdf.metadata = { ...pdf.metadata || {
          pageCount: 0
        }, ...metadata };
      }
      
      // Update status
      if (status) {
        pdf.status = status;
      }
      
      // Save changes
      this.saveToStorage();
      
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.updatePDFMetadata',
        pdfId
      });
      
      return false;
    }
  }

  /**
   * Update PDF reading progress
   * 
   * @param pdfId ID of the PDF to update
   * @param progress Reading progress (0-100)
   * @returns Whether update was successful
   */
  async updateReadingProgress(pdfId: string, progress: number): Promise<boolean> {
    try {
      const pdf = this.pdfs.get(pdfId);
      
      if (!pdf) {
        return false;
      }
      
      // Update progress
      pdf.readProgress = Math.max(0, Math.min(100, progress));
      
      // Update last accessed
      pdf.lastAccessed = new Date();
      
      // Save changes
      this.saveToStorage();
      
      return true;
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.updateReadingProgress',
        pdfId
      });
      
      return false;
    }
  }
} 