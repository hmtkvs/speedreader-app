import { FileValidationError, SecurityError, PDFParsingError } from '../types/common';

interface ErrorLog {
  timestamp: Date;
  error: Error;
  context?: Record<string, unknown>;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private readonly maxLogs = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error, context?: Record<string, unknown>): string {
    // Log the error
    this.logError(error, context);

    // Handle specific error types
    if (error instanceof FileValidationError) {
      return this.handleFileValidationError(error);
    } else if (error instanceof SecurityError) {
      return this.handleSecurityError(error);
    } else if (error instanceof PDFParsingError) {
      return this.handlePDFParsingError(error);
    }

    // Handle unknown errors
    console.error('Unexpected error:', error);
    return 'An unexpected error occurred. Please try again.';
  }

  private handleFileValidationError(error: FileValidationError): string {
    return `File validation failed: ${error.message}`;
  }

  private handleSecurityError(error: SecurityError): string {
    console.error('Security violation:', error);
    return 'A security check failed. Please ensure you\'re using the app securely.';
  }

  private handlePDFParsingError(error: PDFParsingError): string {
    return `Failed to parse PDF: ${error.message}`;
  }

  private logError(error: Error, context?: Record<string, unknown>) {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      error,
      context
    };

    this.errorLogs.unshift(errorLog);
    
    // Keep only the most recent logs
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.pop();
    }

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog);
    }
  }

  public getRecentErrors(): ErrorLog[] {
    return [...this.errorLogs];
  }

  public clearLogs(): void {
    this.errorLogs = [];
  }
}

export { ErrorHandler }