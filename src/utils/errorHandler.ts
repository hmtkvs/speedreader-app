import { FileValidationError, SecurityError, PDFParsingError } from '../types/common';

/**
 * Context information for error handling
 */
export interface ErrorContext {
  /** Component or service where the error occurred */
  context: string;
  /** Optional additional metadata about the error */
  [key: string]: any;
}

/**
 * Error log entry
 */
interface ErrorLog {
  /** When the error occurred */
  timestamp: Date;
  /** The error object */
  error: Error;
  /** Context information */
  context: ErrorContext;
}

/**
 * Centralized error handler for the application
 * 
 * Provides consistent error logging, tracking, and formatting
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private readonly maxLogs = 100;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Get singleton instance of ErrorHandler
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }
  
  /**
   * Handle an error with context information
   * 
   * @param error Error object
   * @param context Context information about where the error occurred
   * @returns Formatted error message for display
   */
  handleError(error: Error, context: ErrorContext): string {
    // Extract message and stack trace
    const message = error.message || 'Unknown error';
    const stack = error.stack || '';
    
    // Log the error
    this.logError(error, context);
    
    // Format context information for logging
    const contextInfo = Object.entries(context)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    // Log the error with context
    console.error(`Error in ${context.context}: ${message}`);
    console.error(`Context: ${contextInfo}`);
    
    if (stack) {
      console.error('Stack trace:', stack);
    }
    
    // In a production app, we would send this to an error tracking service
    // this.reportToErrorService(error, context);
    
    // Return a user-friendly message
    return this.formatErrorMessage(message, context);
  }
  
  /**
   * Format an error message for display to users
   * 
   * @param message Raw error message
   * @param context Error context
   * @returns User-friendly error message
   */
  private formatErrorMessage(message: string, context: ErrorContext): string {
    // Format error based on context
    switch (context.context) {
      case 'PDFParserService.parsePDF':
        return `Failed to parse PDF file${context.fileName ? ` "${context.fileName}"` : ''}: ${message}`;
        
      case 'PDFValidatorService.validatePDF':
        return `PDF validation failed${context.fileName ? ` for "${context.fileName}"` : ''}: ${message}`;
        
      case 'PDFStorageService.uploadPDF':
        return `Failed to upload PDF${context.fileName ? ` "${context.fileName}"` : ''}: ${message}`;
        
      case 'PDFStorageService.downloadPDF':
        return `Failed to download PDF: ${message}`;
        
      case 'PDFStorageService.deletePDF':
        return `Failed to delete PDF: ${message}`;
        
      // Add more context-specific error messages as needed
        
      default:
        return `An error occurred: ${message}`;
    }
  }
  
  /**
   * Log error to internal history
   * 
   * @param error Error object
   * @param context Error context
   */
  private logError(error: Error, context: ErrorContext): void {
    // Add to internal logs
    this.errorLogs.unshift({
      timestamp: new Date(),
      error,
      context
    });
    
    // Trim logs if needed
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }
  }
  
  /**
   * Get recent error logs
   * 
   * @param count Number of logs to retrieve (default: 10)
   * @returns Array of recent error logs
   */
  getRecentLogs(count: number = 10): ErrorLog[] {
    return this.errorLogs.slice(0, count);
  }
  
  /**
   * Report error to an external error tracking service
   * 
   * @param error Error object
   * @param context Error context
   */
  private reportToErrorService(error: Error, context: ErrorContext): void {
    // In a real app, this would send the error to a service like Sentry, LogRocket, etc.
    // Example:
    // Sentry.captureException(error, { extra: context });
  }
}