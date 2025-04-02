import { createClient } from '@supabase/supabase-js';
import { validatePDFFile, createValidationReport, generateFileHash, PDFValidationResult } from './pdfValidator';
import { ErrorHandler } from './errorHandler';
import { parsePDF } from './pdfParser';
import { AuthService } from './auth';
import { getSupabaseClient, useSupabaseQuery } from './supabase';

const errorHandler = ErrorHandler.getInstance();

// PDF processing states
export enum PDFStatus {
  VALIDATING = 'validating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected'
}

interface PDFMetadata {
  pageCount?: number;
  wordCount?: number;
  title?: string;
  author?: string;
  keywords?: string[];
  creationDate?: string;
  modificationDate?: string;
}

export interface PDFRecord {
  id: string;
  fileName: string;
  fileSize: number;
  status: PDFStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  metadata?: PDFMetadata;
  fileUrl?: string;
}

interface ProcessingLogEntry {
  status: string;
  message: string;
  timestamp: string;
  processor: string;
  details?: Record<string, any>;
}

export class PDFStorageService {
  private static instance: PDFStorageService;
  private auth: AuthService;
  private query: ReturnType<typeof useSupabaseQuery>;
  private initialized = false;

  private constructor() {
    this.auth = AuthService.getInstance();
    this.query = useSupabaseQuery();
  }

  static getInstance(): PDFStorageService {
    if (!PDFStorageService.instance) {
      PDFStorageService.instance = new PDFStorageService();
    }
    return PDFStorageService.instance;
  }

  private async initialize() {
    if (this.initialized) return;
    
    try {
      // Check if tables exist
      const { error } = await this.query({
        table: 'pdf_files',
        operation: 'select',
        limit: 1
      });
        
      if (error) {
        console.error('Error initializing PDFStorageService:', error);
        throw new Error('PDF storage tables not available');
      }
      
      this.initialized = true;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.initialize'
      });
      throw error;
    }
  }

  /**
   * Upload a PDF file with validation and processing
   */
  async uploadPDF(file: File): Promise<{
    success: boolean;
    pdfId?: string;
    error?: string;
    validationResult?: PDFValidationResult;
  }> {
    try {
      await this.initialize();
      
      // Get current user
      const user = await this.auth.getCurrentUser();
      if (!user) {
        return { 
          success: false, 
          error: 'User not authenticated' 
        };
      }

      // 1. Validate the PDF file
      const validationResult = await validatePDFFile(file);
      
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error || 'PDF validation failed',
          validationResult
        };
      }

      // 2. Check for duplicates
      const isDuplicate = await this.checkDuplicate(validationResult.hash, user.id);
      if (isDuplicate) {
        return {
          success: false,
          error: 'This PDF file has already been uploaded',
          validationResult
        };
      }

      // 3. Create a record in pdf_files table
      const { data: pdfRecord, error: insertError } = await this.query({
        table: 'pdf_files',
        operation: 'insert',
        filters: {
          file_name: file.name,
          file_size: file.size,
          file_hash: validationResult.hash,
          mime_type: file.type,
          uploader_id: user.id,
          status: PDFStatus.VALIDATING,
          version: 1
        }
      });

      if (insertError || !pdfRecord) {
        throw new Error(`Failed to create PDF record: ${insertError?.message}`);
      }

      const pdfId = pdfRecord[0]?.id;
      if (!pdfId) {
        throw new Error('Failed to get PDF record ID');
      }

      // 4. Log the validation process
      await this.logProcessingEvent(
        pdfId,
        'validation',
        'PDF validation completed successfully',
        'validator',
        createValidationReport(validationResult)
      );

      const supabase = getSupabaseClient();
      
      // 5. Upload the file to storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('pdf_files')
        .upload(`${user.id}/${pdfId}/${file.name}`, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError || !uploadData) {
        // Update record status to failed
        await this.updatePDFStatus(pdfId, PDFStatus.FAILED, 'File upload failed');
        throw new Error(`Failed to upload PDF file: ${uploadError?.message}`);
      }

      // 6. Get public URL for the file
      const { data: publicURL } = supabase
        .storage
        .from('pdf_files')
        .getPublicUrl(`${user.id}/${pdfId}/${file.name}`);

      // 7. Extract PDF content and metadata
      const { metadata, wordCount } = await this.processPDFContent(file);

      // 8. Update record with file URL and metadata
      await this.query({
        table: 'pdf_files',
        operation: 'update',
        filters: {
          original_file_url: publicURL.publicUrl,
          status: PDFStatus.COMPLETED,
          updated_at: new Date().toISOString(),
          metadata,
          word_count: wordCount,
          page_count: metadata.pageCount,
          id: pdfId
        }
      });

      // 9. Log completion
      await this.logProcessingEvent(
        pdfId,
        'processing',
        'PDF processing completed successfully',
        'processor',
        { pageCount: metadata.pageCount, wordCount }
      );

      return {
        success: true,
        pdfId,
        validationResult
      };
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.uploadPDF',
        fileName: file.name,
        fileSize: file.size
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during PDF upload',
      };
    }
  }

  /**
   * Check if a PDF with the same hash already exists for this user
   */
  private async checkDuplicate(fileHash: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.query({
        table: 'pdf_files',
        operation: 'select',
        fields: 'id',
        filters: { 
          file_hash: fileHash,
          uploader_id: userId
        },
        limit: 1
      });

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.checkDuplicate'
      });
      return false; // Safer to return false in case of error
    }
  }

  /**
   * Process PDF content to extract metadata and word count
   */
  private async processPDFContent(file: File): Promise<{
    metadata: PDFMetadata;
    wordCount: number;
  }> {
    try {
      // Extract text from PDF
      const text = await parsePDF(file);
      
      // Calculate word count
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

      // Extract metadata (could be enhanced with actual PDF.js metadata extraction)
      const metadata: PDFMetadata = {
        pageCount: 0, // Will be populated by PDF.js
        wordCount,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        creationDate: new Date().toISOString()
      };

      // Load the PDF to get page count
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      metadata.pageCount = pdf.numPages;

      return { metadata, wordCount };
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.processPDFContent',
        fileName: file.name
      });
      
      // Return defaults in case of error
      return {
        metadata: { title: file.name.replace(/\.[^/.]+$/, "") },
        wordCount: 0
      };
    }
  }

  /**
   * Update PDF status
   */
  private async updatePDFStatus(
    pdfId: string,
    status: PDFStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      await this.query({
        table: 'pdf_files',
        operation: 'update',
        filters: {
          ...updateData,
          id: pdfId
        }
      });
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.updatePDFStatus',
        pdfId,
        status
      });
    }
  }

  /**
   * Log a PDF processing event
   */
  private async logProcessingEvent(
    pdfId: string,
    status: string,
    message: string,
    processor: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await this.query({
        table: 'pdf_processing_logs',
        operation: 'insert',
        filters: {
          pdf_id: pdfId,
          status,
          message,
          processor,
          details
        }
      });
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.logProcessingEvent',
        pdfId,
        status
      });
    }
  }

  /**
   * Get all PDFs for current user
   */
  async getUserPDFs(): Promise<PDFRecord[]> {
    try {
      await this.initialize();
      
      const user = await this.auth.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('pdf_files')
        .select('*')
        .eq('uploader_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(pdf => ({
        id: pdf.id,
        fileName: pdf.file_name,
        fileSize: pdf.file_size,
        status: pdf.status as PDFStatus,
        createdAt: pdf.created_at,
        updatedAt: pdf.updated_at,
        version: pdf.version,
        metadata: pdf.metadata,
        fileUrl: pdf.original_file_url
      }));
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.getUserPDFs'
      });
      return [];
    }
  }

  /**
   * Get a specific PDF by ID
   */
  async getPDFById(pdfId: string): Promise<PDFRecord | null> {
    try {
      await this.initialize();
      
      const user = await this.auth.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('pdf_files')
        .select('*')
        .eq('id', pdfId)
        .eq('uploader_id', user.id)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        fileName: data.file_name,
        fileSize: data.file_size,
        status: data.status as PDFStatus,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        version: data.version,
        metadata: data.metadata,
        fileUrl: data.original_file_url
      };
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.getPDFById',
        pdfId
      });
      return null;
    }
  }

  /**
   * Delete a PDF by ID
   */
  async deletePDF(pdfId: string): Promise<boolean> {
    try {
      await this.initialize();
      
      const user = await this.auth.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const supabase = getSupabaseClient();

      // Get the PDF first to verify ownership and get filename
      const { data: pdf, error: fetchError } = await supabase
        .from('pdf_files')
        .select('*')
        .eq('id', pdfId)
        .eq('uploader_id', user.id)
        .single();

      if (fetchError || !pdf) {
        throw new Error(`PDF not found or access denied: ${fetchError?.message}`);
      }

      // Begin a transaction - cascading deletes should handle processing logs automatically
      // but we'll still handle file storage cleanup manually

      // Delete from storage first
      const { error: storageError } = await supabase
        .storage
        .from('pdf_files')
        .remove([`${user.id}/${pdfId}/${pdf.file_name}`]);

      if (storageError) {
        // Log the error but continue with database deletion
        errorHandler.handleError(new Error(`Failed to delete PDF file from storage: ${storageError.message}`), {
          context: 'PDFStorageService.deletePDF',
          pdfId
        });
      }

      // Delete PDF record - this should cascade to delete processing logs
      const { error: deleteError } = await supabase
        .from('pdf_files')
        .delete()
        .eq('id', pdfId)
        .eq('uploader_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to delete PDF record: ${deleteError.message}`);
      }

      return true;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.deletePDF',
        pdfId
      });
      return false;
    }
  }

  /**
   * Get processing logs for a PDF
   */
  async getPDFProcessingLogs(pdfId: string): Promise<ProcessingLogEntry[]> {
    try {
      await this.initialize();
      
      const user = await this.auth.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const supabase = getSupabaseClient();

      // Verify PDF ownership
      const { data: pdf, error: pdfError } = await supabase
        .from('pdf_files')
        .select('id')
        .eq('id', pdfId)
        .eq('uploader_id', user.id)
        .single();

      if (pdfError || !pdf) {
        throw new Error('PDF not found or access denied');
      }

      // Get logs
      const { data: logs, error: logsError } = await supabase
        .from('pdf_processing_logs')
        .select('*')
        .eq('pdf_id', pdfId)
        .order('created_at', { ascending: true });

      if (logsError) throw logsError;

      return (logs || []).map(log => ({
        status: log.status,
        message: log.message,
        timestamp: log.created_at,
        processor: log.processor,
        details: log.details
      }));
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.getPDFProcessingLogs',
        pdfId
      });
      return [];
    }
  }

  /**
   * Get content of a PDF file
   */
  async getPDFContent(pdfId: string): Promise<string | null> {
    try {
      await this.initialize();
      
      const pdf = await this.getPDFById(pdfId);
      if (!pdf || !pdf.fileUrl) {
        throw new Error('PDF not found or file URL not available');
      }

      // Fetch the PDF file
      const response = await fetch(pdf.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], pdf.fileName, { type: 'application/pdf' });

      // Parse the PDF
      const content = await parsePDF(file);
      return content;
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'PDFStorageService.getPDFContent',
        pdfId
      });
      return null;
    }
  }
}