// Common types used across the application
export interface ColorScheme {
  id: string;
  name: string;
  background: string;
  text: string;
  highlight: string;
}

export interface SecurityOptions {
  maxFileSize: number;
  allowedTypes: string[];
  maxTextLength: number;
}

export interface SecurityValidation {
  valid: boolean;
  error?: string;
}

export interface SecurityContext {
  secure: boolean;
  warnings: string[];
}

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  type: NotificationType;
  message: string;
  duration?: number;
}

export interface FileRecord {
  name: string;
  timestamp: Date;
  status: 'success' | 'error';
  type: string;
  size: number;
}

// Custom error types for better error handling
export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class PDFParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PDFParsingError';
  }
}