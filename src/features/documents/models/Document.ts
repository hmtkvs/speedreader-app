/**
 * Represents a document in the application
 */
export interface Document {
  id: string;
  title: string;
  description?: string;
  pageCount: number;
  thumbnail?: string;
  uploadedAt: string;
  updatedAt?: string;
  fileType: string;
  fileSize: number;
  lastReadPage?: number;
  coverImage?: string;
  metadata?: Record<string, any>;
} 