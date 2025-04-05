import React from 'react';
import { MainLayout } from '../../layout/components/MainLayout';
import { PdfMigrationTest } from '../test/PdfMigrationTest';
import { useReaderContext } from '../../reader/contexts/ReaderContext';
import { FileUploadCorner } from '../components/FileUploadCorner';
import { ReaderModel } from '../../../models/reader';
import { useTheme } from '../../theme/contexts/ThemeContext';
import { SimplifiedReaderAdapter } from '../adapters/SimplifiedReaderAdapter';
import { SavedPDFsPanel } from '../components/SavedPDFsPanel';

/**
 * Test Page for verifying PDF and Reader migration
 * 
 * This page provides a minimal environment to test PDF uploads,
 * text reading, and context communication.
 */
export function TestPage() {
  const readerContext = useReaderContext();
  const { colorScheme } = useTheme();
  const [readerModel] = React.useState(() => new ReaderModel());
  const [simplifiedReader] = React.useState(() => new SimplifiedReaderAdapter(readerModel));
  const [showSavedPDFs, setShowSavedPDFs] = React.useState(false);
  
  // Directly connect the simplified reader to the reader context
  const handleDirectSetText = React.useCallback((text: string) => {
    console.log("DIRECT TEXT SET called with:", text.substring(0, 100) + "...");
    // Set text both in the simplified reader and in the reader context
    simplifiedReader.setText(text);
    
    // Also update the reader context for testing
    if (readerContext && readerContext.setText) {
      readerContext.setText(text);
    }
  }, [simplifiedReader, readerContext]);
  
  return (
    <MainLayout 
      showSidebarToggle={true}
      showStatsButton={true}
      reader={simplifiedReader}
    >
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">PDF and Reader Migration Test</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Test Instructions</h2>
          <ol className="list-decimal ml-5 space-y-2">
            <li>Use the test panel in the bottom right to run individual tests</li>
            <li>Use the file uploader in the corner to test manual PDF uploads</li>
            <li>Check the console logs for detailed debugging information</li>
          </ol>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-300 rounded p-4">
            <h2 className="text-lg font-semibold mb-2">Reader Context Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Context Available:</span>
                <span>{readerContext ? '✅ Yes' : '❌ No'}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Words:</span>
                <span>{readerContext?.currentWords?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Text Set Function:</span>
                <span>{typeof readerContext?.setText === 'function' ? '✅ Available' : '❌ Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span>Play Function:</span>
                <span>{typeof readerContext?.play === 'function' ? '✅ Available' : '❌ Missing'}</span>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-300 rounded p-4">
            <h2 className="text-lg font-semibold mb-2">Current Reader Content</h2>
            <div className="mt-2 text-sm max-h-32 overflow-y-auto bg-gray-100 p-2 rounded">
              {readerContext?.currentWords?.length ? 
                readerContext.currentWords.slice(0, 30).map((word, idx) => (
                  <span key={idx}>
                    {word.before || ''}{word.highlight || ''}{word.after || ''} {' '}
                  </span>
                )) : 
                <span className="text-gray-500">No content loaded</span>
              }
              {readerContext?.currentWords?.length > 30 && <span>...</span>}
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Manual Testing</h2>
          <div className="flex space-x-4">
            <button 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => handleDirectSetText("Manual test text for the reader component. This should display in the reader preview above.")}
            >
              Set Test Text
            </button>
            
            <button 
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => readerContext?.play()}
            >
              Play
            </button>
            
            <button 
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => readerContext?.pause()}
            >
              Pause
            </button>
            
            <button 
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => setShowSavedPDFs(true)}
            >
              Show Saved PDFs
            </button>
          </div>
        </div>
      </div>
      
      {/* File upload corner for testing */}
      <FileUploadCorner colorScheme={colorScheme} directSetText={handleDirectSetText} />
      
      {/* Saved PDFs panel */}
      <SavedPDFsPanel 
        isOpen={showSavedPDFs} 
        onClose={() => setShowSavedPDFs(false)} 
        colorScheme={colorScheme}
        onSetText={handleDirectSetText}
        debugInfo={{
          readerAvailable: !!simplifiedReader,
          setTextAvailable: typeof handleDirectSetText === 'function'
        }}
      />
      
      {/* Migration test panel */}
      <PdfMigrationTest />
    </MainLayout>
  );
} 