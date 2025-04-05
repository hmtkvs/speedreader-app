/**
 * PDF Management Feature
 * 
 * Handles managing and processing PDF files
 */

// Export components
export { PDFManager } from './components/PDFManager';
export { PDFManagerAdapter } from './components/PDFManagerAdapter';
export { SavedPDFsPanel } from './components/SavedPDFsPanel';
export { SavedPDFsPanelAdapter } from './components/SavedPDFsPanelAdapter';
export { FileUploadCorner } from './components/FileUploadCorner';

// Export service interfaces (not implementations)
export type { PDFParseResult, PDFDocumentMetadata } from './services/PDFParserService';

// Export models
export type { PDFRecord, PDFStatus, PDFMetadata } from './models/PDFModels';

// Components
export { PDFList } from './components/PDFList';
export { PDFUploader } from './components/PDFUploader';
export { FileUploadAdapter, fileUploadAdapter } from './components/FileUploadAdapter';

// Export services
export { PDFValidatorService } from './services/PDFValidatorService';
export { PDFParserService } from './services/PDFParserService';
export { PDFStorageService } from './services/pdfStorageService';

// Testing utilities
export { PdfMigrationTest } from './test/PdfMigrationTest';

// Adapters - new simplified adapters
export { SimplifiedReaderAdapter } from './adapters/SimplifiedReaderAdapter';

// Pages
export { TestPage } from './pages/TestPage'; 