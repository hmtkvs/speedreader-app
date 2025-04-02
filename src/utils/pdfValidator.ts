import { FileValidationError, SecurityError } from '../types/common';
import { ErrorHandler } from './errorHandler';

const errorHandler = ErrorHandler.getInstance();

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf'
];

// File extensions that should match application/pdf
const PDF_EXTENSIONS = ['.pdf', 'pdf'];

/**
 * Comprehensive PDF validation result
 */
export interface PDFValidationResult {
  valid: boolean;
  fileSize: number;
  mimeType: string;
  fileName: string;
  fileExtension: string;
  hash: string;
  error?: string;
}

/**
 * Validates a PDF file by checking:
 * - File size
 * - MIME type
 * - File extension
 * - PDF header (magic bytes)
 */
export async function validatePDFFile(file: File): Promise<PDFValidationResult> {
  try {
    // Base validation result
    const result: PDFValidationResult = {
      valid: false,
      fileSize: file.size,
      mimeType: file.type,
      fileName: file.name,
      fileExtension: getFileExtension(file.name),
      hash: await generateFileHash(file)
    };

    // 1. Check file size
    if (file.size > MAX_FILE_SIZE) {
      result.error = `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
      return result;
    }

    // 2. Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      result.error = `Invalid file type: ${file.type}. Only PDF files are allowed.`;
      return result;
    }

    // 3. Check file extension
    const fileExt = getFileExtension(file.name);
    if (!PDF_EXTENSIONS.includes(fileExt)) {
      result.error = `Invalid file extension: ${fileExt}. Only .pdf files are allowed.`;
      return result;
    }

    // 4. Check PDF header (magic bytes)
    const isValidPDF = await checkPDFHeader(file);
    if (!isValidPDF) {
      result.error = 'Invalid PDF file format. File header does not match PDF specification.';
      return result;
    }

    // All checks passed
    result.valid = true;
    return result;
  } catch (error) {
    const errorMessage = errorHandler.handleError(
      error instanceof Error ? error : new Error('Unknown validation error'),
      { fileName: file.name, fileSize: file.size }
    );
    
    return {
      valid: false,
      fileSize: file.size,
      mimeType: file.type,
      fileName: file.name,
      fileExtension: getFileExtension(file.name),
      hash: '',
      error: errorMessage
    };
  }
}

/**
 * Check PDF header (magic bytes)
 * PDF files start with %PDF-
 */
async function checkPDFHeader(file: File): Promise<boolean> {
  try {
    const header = await readFileHeader(file, 5);
    const decoder = new TextDecoder('utf-8');
    const headerString = decoder.decode(header);
    return headerString.startsWith('%PDF-');
  } catch {
    return false;
  }
}

/**
 * Read the first n bytes of a file
 */
async function readFileHeader(file: File, n: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as ArrayBuffer);
      } else {
        reject(new Error('Failed to read file header'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file header'));
    
    // Read only the first n bytes
    const blob = file.slice(0, n);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Get file extension without the leading dot
 */
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Generate SHA-256 hash of file content
 */
export async function generateFileHash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    errorHandler.handleError(
      error instanceof Error ? error : new Error('Failed to generate file hash'),
      { fileName: file.name, fileSize: file.size }
    );
    throw new SecurityError('Failed to generate file checksum');
  }
}

/**
 * Create a detailed report of the PDF validation
 */
export function createValidationReport(result: PDFValidationResult): Record<string, any> {
  return {
    fileName: result.fileName,
    fileSize: result.fileSize,
    fileSizeFormatted: formatFileSize(result.fileSize),
    mimeType: result.mimeType,
    fileExtension: result.fileExtension,
    hash: result.hash,
    valid: result.valid,
    error: result.error || null,
    validationTimestamp: new Date().toISOString(),
    validationPassed: {
      fileSize: result.fileSize <= MAX_FILE_SIZE,
      mimeType: ALLOWED_MIME_TYPES.includes(result.mimeType),
      fileExtension: PDF_EXTENSIONS.includes(result.fileExtension),
    }
  };
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}