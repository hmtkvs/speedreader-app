import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IoDocumentText, IoTrash, IoEye, IoCloudDownload, IoInformation } from 'react-icons/io5';
import { PDFStorageService, PDFRecord, PDFStatus } from '../utils/pdfStorage';

interface PDFListProps {
  onSelectPDF?: (pdfId: string) => void;
  onDeletePDF?: (pdfId: string) => void;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function PDFList({ onSelectPDF, onDeletePDF, colorScheme }: PDFListProps) {
  const [pdfs, setPdfs] = useState<PDFRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [detailsPDF, setDetailsPDF] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  const pdfStorage = PDFStorageService.getInstance();

  const loadPDFs = async () => {
    try {
      setLoading(true);
      setError(null);
      const userPDFs = await pdfStorage.getUserPDFs();
      setPdfs(userPDFs);
    } catch (err) {
      setError('Failed to load PDFs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPDFs();
  }, []);

  const handleViewPDF = (pdfId: string) => {
    setSelectedPDF(pdfId);
    if (onSelectPDF) {
      onSelectPDF(pdfId);
    }
  };

  const handleDeleteClick = (pdfId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(pdfId);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    
    try {
      const success = await pdfStorage.deletePDF(confirmDelete);
      if (success) {
        setPdfs(currentPdfs => currentPdfs.filter(pdf => pdf.id !== confirmDelete));
        if (onDeletePDF) {
          onDeletePDF(confirmDelete);
        }
      } else {
        setError('Failed to delete PDF');
      }
    } catch (err) {
      setError('Failed to delete PDF');
      console.error(err);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleViewDetails = async (pdfId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailsPDF(pdfId);
    
    try {
      const processingLogs = await pdfStorage.getPDFProcessingLogs(pdfId);
      setLogs(processingLogs);
    } catch (err) {
      console.error('Failed to load processing logs:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block w-6 h-6 border-2 border-current rounded-full border-b-transparent animate-spin mb-2" />
        <p>Loading PDFs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <button 
          onClick={loadPDFs}
          className="px-4 py-2 bg-current/10 rounded-lg hover:bg-current/20 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (pdfs.length === 0) {
    return (
      <div className="p-6 text-center">
        <IoDocumentText size={48} className="mx-auto mb-4 opacity-60" />
        <p className="text-lg mb-2">No PDFs found</p>
        <p className="text-sm opacity-60">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* PDF List */}
      <div className="space-y-3">
        {pdfs.map((pdf, index) => (
          <motion.div
            key={pdf.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`w-full p-4 rounded-lg transition-colors cursor-pointer
              ${selectedPDF === pdf.id ? 'bg-current/15' : 'hover:bg-current/5'}`}
            onClick={() => handleViewPDF(pdf.id)}
          >
            <div className="flex items-start gap-3">
              <IoDocumentText size={24} className="flex-shrink-0 mt-1" style={{ color: colorScheme.highlight }} />
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                  <p className="font-medium truncate">{pdf.fileName}</p>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={(e) => handleViewDetails(pdf.id, e)}
                      className="p-1.5 rounded-full hover:bg-current/10 transition-colors"
                      title="View details"
                    >
                      <IoInformation size={18} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(pdf.id, e)}
                      className="p-1.5 rounded-full hover:bg-current/10 transition-colors"
                      title="Delete PDF"
                    >
                      <IoTrash size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-1 text-xs opacity-70">
                  <span>{formatFileSize(pdf.fileSize)}</span>
                  <span>•</span>
                  <span>v{pdf.version}</span>
                  <span>•</span>
                  <span>
                    {pdf.status === PDFStatus.COMPLETED ? (
                      <span className="text-green-500">Completed</span>
                    ) : pdf.status === PDFStatus.FAILED || pdf.status === PDFStatus.REJECTED ? (
                      <span className="text-red-500">{pdf.status.charAt(0).toUpperCase() + pdf.status.slice(1)}</span>
                    ) : (
                      <span className="text-yellow-500">{pdf.status.charAt(0).toUpperCase() + pdf.status.slice(1)}</span>
                    )}
                  </span>
                </div>
                
                <div className="text-xs opacity-60 mt-2">
                  <span>Uploaded: {formatDate(pdf.createdAt)}</span>
                </div>
                
                {pdf.metadata && (
                  <div className="flex flex-wrap gap-4 mt-2">
                    {pdf.metadata.pageCount && (
                      <div className="text-xs bg-current/10 px-2 py-1 rounded">
                        {pdf.metadata.pageCount} pages
                      </div>
                    )}
                    {pdf.metadata.wordCount && (
                      <div className="text-xs bg-current/10 px-2 py-1 rounded">
                        {pdf.metadata.wordCount.toLocaleString()} words
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
            style={{ background: colorScheme.background, color: colorScheme.text }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete this PDF? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg hover:bg-current/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg text-white transition-colors"
                style={{ background: '#ef4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Details Modal */}
      {detailsPDF && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
            style={{ background: colorScheme.background, color: colorScheme.text }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">PDF Details</h3>
              <button
                onClick={() => setDetailsPDF(null)}
                className="p-2 hover:bg-current/10 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* PDF Info */}
            {pdfs.find(p => p.id === detailsPDF) && (
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(pdfs.find(p => p.id === detailsPDF) || {}).map(([key, value]) => {
                    // Skip complex objects and irrelevant fields
                    if (key === 'metadata' || key === 'id' || !value) return null;
                    
                    return (
                      <div key={key} className="mb-2">
                        <p className="text-sm font-semibold opacity-70">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </p>
                        <p className="break-words">
                          {key.includes('Date') || key.includes('date') || key.includes('At')
                            ? formatDate(value as string)
                            : key === 'fileSize' 
                              ? formatFileSize(value as number)
                              : String(value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                {/* Metadata */}
                {pdfs.find(p => p.id === detailsPDF)?.metadata && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-2">Metadata</h4>
                    <div className="bg-current/5 p-3 rounded-lg">
                      {Object.entries(pdfs.find(p => p.id === detailsPDF)?.metadata || {}).map(([key, value]) => (
                        <div key={key} className="mb-2">
                          <p className="text-sm font-semibold opacity-70">
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                          </p>
                          <p className="break-words">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Download button */}
                {pdfs.find(p => p.id === detailsPDF)?.fileUrl && (
                  <div className="mt-4">
                    <a 
                      href={pdfs.find(p => p.id === detailsPDF)?.fileUrl || ''}
                      download={pdfs.find(p => p.id === detailsPDF)?.fileName}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-current/10 transition-colors"
                    >
                      <IoCloudDownload size={18} />
                      <span>Download PDF</span>
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {/* Processing Logs */}
            <div>
              <h4 className="text-lg font-semibold mb-2">Processing History</h4>
              {logs.length === 0 ? (
                <p className="text-sm opacity-70">No processing logs available</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, i) => (
                    <div key={i} className="bg-current/5 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <p className="text-sm font-semibold">
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </p>
                        <p className="text-xs opacity-70">{formatDate(log.timestamp)}</p>
                      </div>
                      <p className="text-sm mt-1">{log.message}</p>
                      <p className="text-xs mt-2 opacity-70">Processor: {log.processor}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}