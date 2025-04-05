import { useState, useEffect, useCallback } from 'react';
import { Document } from '../models/Document';
import { pdfStorage, PDFStatus } from '../services/pdfStorageAdapter';

interface UseDocumentLibraryResult {
  documents: Document[];
  isLoading: boolean;
  error: Error | null;
  refreshDocuments: () => Promise<void>;
  deleteDocument: (documentId: string) => Promise<boolean>;
}

export function useDocumentLibrary(): UseDocumentLibraryResult {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const records = await pdfStorage.getAllDocuments();
      
      // Convert storage records to Document type
      const docs = records
        .filter(record => record.status === PDFStatus.READY)
        .map(record => ({
          id: record.id,
          title: record.title || 'Untitled Document',
          description: record.description,
          pageCount: record.pageCount || 0,
          thumbnail: record.thumbnailUrl,
          uploadedAt: record.createdAt,
          updatedAt: record.updatedAt,
          fileType: 'pdf',
          fileSize: record.fileSize || 0,
          lastReadPage: record.lastReadPage,
          coverImage: record.coverImageUrl,
          metadata: record.metadata
        }));
      
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshDocuments = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      await pdfStorage.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      return true;
    } catch (err) {
      console.error("Failed to delete document:", err);
      setError(err instanceof Error ? err : new Error('Failed to delete document'));
      return false;
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    error,
    refreshDocuments,
    deleteDocument
  };
} 