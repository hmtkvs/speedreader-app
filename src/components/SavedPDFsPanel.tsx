import React, { useEffect } from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoDocument } from 'react-icons/io5';
import { ReaderModel } from '../models/reader';

interface SavedPDFsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  reader: ReaderModel;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function SavedPDFsPanel({ 
  isOpen, 
  onClose, 
  reader,
  colorScheme 
}: SavedPDFsPanelProps) {
  const [books, setBooks] = useState<Array<{
    id: string;
    title: string;
    lastRead: number;
    progress: number;
  }>>([]);

  useEffect(() => {
    if (isOpen) {
      loadBooks();
    }
  }, [isOpen]);

  const loadBooks = async () => {
    const loadedBooks = await reader.getAllBooks();
    setBooks(loadedBooks);
  };

  const handleBookSelect = async (bookId: string) => {
    await reader.loadBook(bookId);
    onClose();
  };

  const handleDeleteBook = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (await reader.deleteBook(bookId)) {
      await loadBooks();
    }
  };

  // Handle touch gestures
  useEffect(() => {
    if (!isOpen) return;

    let startX: number;
    let currentX: number;
    const panel = document.getElementById('saved-pdfs-panel');
    
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      currentX = startX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startX) return;
      currentX = e.touches[0].clientX;
      
      const diff = currentX - startX;
      if (diff < 0) return; // Only allow sliding to close

      if (panel) {
        panel.style.transform = `translateX(${diff}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (!startX || !currentX) return;

      const diff = currentX - startX;
      if (diff > 100) { // If dragged more than 100px, close the panel
        onClose();
      } else if (panel) {
        panel.style.transform = ''; // Reset position
      }

      startX = 0;
      currentX = 0;
    };

    panel?.addEventListener('touchstart', handleTouchStart);
    panel?.addEventListener('touchmove', handleTouchMove);
    panel?.addEventListener('touchend', handleTouchEnd);

    return () => {
      panel?.removeEventListener('touchstart', handleTouchStart);
      panel?.removeEventListener('touchmove', handleTouchMove);
      panel?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose]);
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            id="saved-pdfs-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-full sm:w-96 z-50
              touch-manipulation"
            style={{ 
              background: colorScheme.background,
              color: colorScheme.text
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-current/10">
              <h2 className="text-lg font-semibold">Saved Documents</h2>
              <button
                onClick={onClose}
                className="p-2 hover:opacity-70 transition-opacity"
              >
                <IoClose size={24} />
              </button>
            </div>

            {/* File List */}
            <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-4rem)]">
              {books.length === 0 ? (
                <div className="text-center py-8 opacity-60">
                  <IoDocument size={48} className="mx-auto mb-4" />
                  <p>No documents yet</p>
                  <p className="text-sm mt-2">
                  Upload documents using the button in the top-left corner
                  </p>
                </div>
              ) : (
                books.map((book, index) => (
                  <motion.button
                    key={`${book.id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full text-left p-4 rounded-lg hover:bg-current/5
                      transition-colors flex items-start gap-3
                      min-h-[44px] touch-manipulation"
                    onClick={() => handleBookSelect(book.id)}
                  >
                    <IoDocument 
                      size={20} 
                      className="flex-shrink-0 mt-1"
                      style={{ color: colorScheme.highlight }}
                    />
                    <div className="flex-grow min-w-0">
                      <p className="font-medium truncate">{book.title}</p>
                      <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                        <span>{new Date(book.lastRead).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{book.progress.toFixed(1)}% read</span>
                      </div>
                    </div>                    
                  </motion.button>
                ))
              )}
            </div>
            {/* Separate Delete Buttons */}
            <div className="absolute right-0 top-[4rem] h-[calc(100%-4rem)] pointer-events-none">
              <div className="p-4 space-y-2 h-full">
                {books.map((book, index) => (
                  <div 
                    key={`delete-${book.id}-${index}`}
                    className="h-[76px] flex items-center justify-end pointer-events-auto"
                  >
                    <div
                      onClick={(e) => handleDeleteBook(book.id, e)}
                      className="p-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <IoClose size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}