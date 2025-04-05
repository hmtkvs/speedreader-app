import { PDFValidationResult } from '../models/PDFModels';
import { ErrorHandler } from '../../../utils/errorHandler';

/**
 * Service for validating PDF files
 * 
 * Validates PDF files for size, content type, and other criteria
 */
export class PDFValidatorService {
  private static instance: PDFValidatorService;
  private errorHandler: ErrorHandler;
  
  // Maximum file size in bytes (10MB)
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // Allowed PDF MIME types
  private readonly ALLOWED_MIME_TYPES = ['application/pdf'];
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }
  
  /**
   * Get singleton instance of PDFValidatorService
   */
  static getInstance(): PDFValidatorService {
    if (!PDFValidatorService.instance) {
      PDFValidatorService.instance = new PDFValidatorService();
    }
    return PDFValidatorService.instance;
  }
  
  /**
   * Validate a PDF file
   * 
   * Checks file size, content type, and generates a hash for deduplication
   * 
   * @param file PDF file to validate
   * @returns Validation result with success status and error details
   */
  async validatePDF(file: File): Promise<PDFValidationResult> {
    try {
      // Check if file exists
      if (!file) {
        return this.createValidationError('No file provided.');
      }
      
      // Check file size
      if (file.size > this.MAX_FILE_SIZE) {
        return this.createValidationError(
          `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(this.MAX_FILE_SIZE)}).`
        );
      }
      
      // Check MIME type
      if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
        return this.createValidationError(
          `File type '${file.type || 'unknown'}' is not supported. Only PDF files are allowed.`
        );
      }
      
      // Generate hash for deduplication
      const fileHash = await this.generateFileHash(file);
      
      // All validations passed
      return {
        isValid: true,
        fileHash
      };
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        context: 'PDFValidatorService.validatePDF',
        fileName: file.name
      });
      
      return this.createValidationError('An error occurred during file validation.');
    }
  }
  
  /**
   * Create a validation error result
   * 
   * @param errorMessage Error message
   * @returns Validation result with error
   */
  private createValidationError(errorMessage: string): PDFValidationResult {
    return {
      isValid: false,
      error: errorMessage
    };
  }
  
  /**
   * Format file size in bytes to a readable string
   * 
   * @param bytes File size in bytes
   * @returns Formatted file size string
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Generate a hash from file content for deduplication
   * 
   * @param file File to hash
   * @returns SHA-256 hash of the file
   */
  private async generateFileHash(file: File): Promise<string> {
    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Generate hash using SubtleCrypto API
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      
      // Convert hash to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('Failed to generate file hash:', error);
      return '';
    }
  }
} 