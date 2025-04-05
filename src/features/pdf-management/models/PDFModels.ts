/**
 * PDF Management feature models
 */

/**
 * Status of a PDF document in the system
 */
export enum PDFStatus {
  /** PDF is ready for viewing */
  READY = 'ready',
  /** PDF is being processed */
  PROCESSING = 'processing',
  /** Error occurred during PDF processing */
  ERROR = 'error'
}

/**
 * Metadata for a PDF document
 */
export interface PDFMetadata {
  /** Title of the PDF document */
  title?: string;
  /** Author of the PDF document */
  author?: string;
  /** Number of pages in the PDF */
  pageCount: number;
  /** Creation date of the PDF */
  creationDate?: string;
}

/**
 * A record representing a PDF document in the system
 */
export interface PDFRecord {
  /** Unique identifier for the PDF */
  id: string;
  /** Filename of the PDF */
  name: string;
  /** Size of the PDF file in bytes */
  size: number;
  /** Date when the PDF was uploaded */
  uploadDate: Date;
  /** Current status of the PDF */
  status: PDFStatus;
  /** URL to access the PDF */
  url?: string;
  /** PDF metadata */
  metadata?: PDFMetadata;
  /** Any processing logs associated with this PDF */
  processingLogs?: ProcessingLogEntry[];
  /** Extracted text content from the PDF */
  content?: string;
  /** Date when the PDF was last accessed/viewed */
  lastAccessed?: Date;
  /** Reading progress percentage (0-100) */
  readProgress?: number;
}

/**
 * Entry in processing log for a PDF
 */
export interface ProcessingLogEntry {
  /** Timestamp of the log entry */
  timestamp: Date;
  /** Log message */
  message: string;
  /** Type of log entry */
  type: 'info' | 'warning' | 'error';
}

/**
 * Result of validating a PDF file
 */
export interface PDFValidationResult {
  /** Whether the PDF is valid */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Hash of the file content for deduplication */
  fileHash?: string;
}

/**
 * Result of uploading a PDF file
 */
export interface PDFUploadResult {
  /** Whether the upload was successful */
  success: boolean;
  /** PDF record if upload was successful */
  record?: PDFRecord;
  /** Error message if upload failed */
  error?: string;
} 