import React, { useState, useEffect } from 'react';
import { 
  List, ListItem, Typography, IconButton, 
  Box, Tooltip, CircularProgress,
  Menu, MenuItem 
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  MoreVert as MoreIcon,
  Description as PdfIcon,
  CloudDownload as DownloadIcon
} from '@mui/icons-material';
import { PDFRecord, PDFStatus } from '../models/PDFModels';
import { PDFStorageService } from '../services/pdfStorageService';
import { formatFileSize, formatDate } from '../../../utils/formatters';

export interface PDFListProps {
  /** List of PDF records to display */
  pdfs: PDFRecord[];
  /** Callback when a PDF is selected */
  onSelectPDF: (pdf: PDFRecord) => void;
  /** Callback when a PDF is deleted */
  onDeletePDF: (pdfId: string) => void;
  /** Current selected PDF ID */
  selectedPdfId?: string;
  /** Whether to show detailed information about each PDF */
  showDetails?: boolean;
}

/**
 * Component for displaying a list of uploaded PDFs
 */
export const PDFList: React.FC<PDFListProps> = ({
  pdfs,
  onSelectPDF,
  onDeletePDF,
  selectedPdfId,
  showDetails = true
}) => {
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionPdf, setActionPdf] = useState<PDFRecord | null>(null);
  const pdfStorageService = PDFStorageService.getInstance();
  
  // Handle click on PDF item
  const handlePDFClick = (pdf: PDFRecord) => {
    if (pdf.status === PDFStatus.READY) {
      onSelectPDF(pdf);
    }
  };
  
  // Open actions menu
  const handleOpenActions = (event: React.MouseEvent<HTMLElement>, pdf: PDFRecord) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setActionPdf(pdf);
  };
  
  // Close actions menu
  const handleCloseActions = () => {
    setActionMenuAnchor(null);
    setActionPdf(null);
  };
  
  // Handle PDF deletion
  const handleDelete = () => {
    if (actionPdf) {
      onDeletePDF(actionPdf.id);
      handleCloseActions();
    }
  };
  
  // Handle PDF download
  const handleDownload = async () => {
    if (actionPdf) {
      try {
        await pdfStorageService.downloadPDF(actionPdf);
      } catch (error) {
        console.error('Failed to download PDF:', error);
      }
      handleCloseActions();
    }
  };
  
  // Get status indicator based on PDF status
  const getStatusIndicator = (status: PDFStatus) => {
    switch (status) {
      case PDFStatus.PROCESSING:
        return <CircularProgress size={16} />;
      case PDFStatus.ERROR:
        return <Typography color="error" variant="caption">Error</Typography>;
      case PDFStatus.READY:
        return <Typography color="success.main" variant="caption">Ready</Typography>;
      default:
        return <Typography variant="caption">Unknown</Typography>;
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {pdfs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No PDFs uploaded yet
          </Typography>
        ) : (
          pdfs.map((pdf) => (
            <ListItem
              key={pdf.id}
              alignItems="flex-start"
              sx={{
                cursor: pdf.status === PDFStatus.READY ? 'pointer' : 'default',
                bgcolor: selectedPdfId === pdf.id ? 'action.selected' : 'inherit',
                '&:hover': {
                  bgcolor: 'action.hover',
                }
              }}
              onClick={() => handlePDFClick(pdf)}
              secondaryAction={
                <IconButton 
                  edge="end" 
                  aria-label="actions"
                  onClick={(e) => handleOpenActions(e, pdf)}
                >
                  <MoreIcon />
                </IconButton>
              }
              disablePadding
            >
              <Box sx={{ display: 'flex', width: '100%', p: 1 }}>
                <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                  <PdfIcon color="primary" />
                </Box>
                <Box sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <Typography
                    component="div"
                    variant="subtitle1"
                    noWrap
                    sx={{ 
                      fontWeight: pdf.status === PDFStatus.READY ? 'medium' : 'normal',
                      opacity: pdf.status === PDFStatus.READY ? 1 : 0.7
                    }}
                  >
                    {pdf.name}
                  </Typography>
                  
                  {showDetails && (
                    <Box sx={{ display: 'flex', mt: 0.5, flexWrap: 'wrap' }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mr: 2 
                      }}>
                        {getStatusIndicator(pdf.status)}
                      </Box>
                      
                      {pdf.metadata && (
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                            {pdf.metadata.pageCount} pages
                          </Typography>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                            {formatFileSize(pdf.size)}
                          </Typography>
                          
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(pdf.uploadDate)}
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            </ListItem>
          ))
        )}
      </List>
      
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActions}
      >
        <MenuItem onClick={handleDownload} disabled={!actionPdf || actionPdf.status !== PDFStatus.READY}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}; 