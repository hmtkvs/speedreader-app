import {
  SecurityOptions,
  SecurityValidation,
  SecurityContext,
  FileValidationError,
  SecurityError
} from '../types/common';

export const SECURITY_CONFIG: SecurityOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['application/pdf', 'text/plain'],
  maxTextLength: 1000000, // 1M characters
};

export function validateFile(file: { size: number; type: string }): SecurityValidation {
  // Check file size
  if (file.size > SECURITY_CONFIG.maxFileSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  // Validate file type
  if (!SECURITY_CONFIG.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only PDF and text files are allowed' };
  }

  return { valid: true };
}

export function sanitizeText(text: string): string {
  // Truncate if text is too long
  if (text.length > SECURITY_CONFIG.maxTextLength) {
    return text.slice(0, SECURITY_CONFIG.maxTextLength);
  }

  // Remove potentially harmful characters
  return text.replace(/[<>]/g, '');
}

// Web-specific security checks
function validateWebSecurityContext(): SecurityContext {
  const warnings: string[] = [];

  // Check if running in a secure context (HTTPS)
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    warnings.push('Application is not running in a secure context (HTTPS)');
  }

  if (!crypto.subtle) {
    throw new SecurityError('Cryptographic features are not available');
  }

  // Check for dev tools
  if (process.env.NODE_ENV === 'development') {
    warnings.push('Application is running in development mode');
  }

  // Check for browser security features
  if (!window.isSecureContext) {
    warnings.push('Secure context is not available');
  }

  return {
    secure: warnings.length === 0,
    warnings,
  };
}