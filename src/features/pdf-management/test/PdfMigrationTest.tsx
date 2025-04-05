import React, { useState, useEffect } from 'react';
import { useReaderContext } from '../../reader/contexts/ReaderContext';
import { ReaderModel } from '../../../models/reader';
import { PDFStorageService } from '../services/pdfStorageService';
import { PDFParserService } from '../services/PDFParserService';

/**
 * Test component for verifying PDF and Reader migration
 * 
 * This component provides UI and tools for testing PDF upload,
 * text setting, and saved PDF functionality
 */
export function PdfMigrationTest() {
  const { currentWords, setText } = useReaderContext();
  const [results, setResults] = useState<{[key: string]: {passed: boolean, message: string}}>(
    {
      'Initial State': { passed: false, message: 'Not tested' },
      'Direct Text Set': { passed: false, message: 'Not tested' },
      'PDF Storage': { passed: false, message: 'Not tested' },
      'PDF Upload': { passed: false, message: 'Not tested' },
      'Reader Model': { passed: false, message: 'Not tested' }
    }
  );
  const [reader] = useState(() => new ReaderModel());
  const [pdfStorage] = useState(() => PDFStorageService.getInstance());
  const [pdfParser] = useState(() => PDFParserService.getInstance());
  const [isVisible, setIsVisible] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Test adding text directly to the reader context
  const testDirectTextSet = () => {
    const testText = "This is a test of the direct text setting functionality";
    addLog(`Setting text directly: ${testText.length} chars`);
    
    setText(testText);
    
    setTimeout(() => {
      if (currentWords.length > 0) {
        setResults(prev => ({
          ...prev,
          'Direct Text Set': { 
            passed: true, 
            message: `Success: ${currentWords.length} words set` 
          }
        }));
        addLog(`Direct text set test passed: ${currentWords.length} words`);
      } else {
        setResults(prev => ({
          ...prev,
          'Direct Text Set': { 
            passed: false, 
            message: 'Failed: No words set in reader' 
          }
        }));
        addLog('Direct text set test failed: No words set');
      }
    }, 500);
  };

  // Test the reader model directly
  const testReaderModel = () => {
    const testText = "Testing reader model functionality directly";
    addLog(`Testing reader model with: ${testText.length} chars`);
    
    // Listen for changes to the reader model
    let wordChangeDetected = false;
    reader.onWordsChange(() => {
      wordChangeDetected = true;
    });
    
    // Set text in the reader model
    reader.setText(testText);
    
    setTimeout(() => {
      if (wordChangeDetected && reader.currentWords.length > 0) {
        setResults(prev => ({
          ...prev,
          'Reader Model': { 
            passed: true, 
            message: `Success: ${reader.currentWords.length} words in model` 
          }
        }));
        addLog(`Reader model test passed: ${reader.currentWords.length} words`);
      } else {
        setResults(prev => ({
          ...prev,
          'Reader Model': { 
            passed: false, 
            message: 'Failed: Reader model not updating words' 
          }
        }));
        addLog('Reader model test failed');
      }
    }, 500);
  };

  // Test PDF storage service
  const testPdfStorage = async () => {
    addLog('Testing PDF storage...');
    const testText = "Test content for PDF storage";
    const testFile = new File([testText], "test.pdf", { type: "application/pdf" });
    
    try {
      const result = await pdfStorage.uploadPDF(testFile, testText);
      
      if (result.success && result.record) {
        setResults(prev => ({
          ...prev,
          'PDF Storage': { 
            passed: true, 
            message: `Success: PDF stored with ID: ${result.record.id}` 
          }
        }));
        addLog(`PDF storage test passed: PDF ID ${result.record.id}`);
        
        // Now try to get the PDFs
        const pdfs = await pdfStorage.getUserPDFs('current-user');
        addLog(`Found ${pdfs.length} PDFs in storage`);
      } else {
        setResults(prev => ({
          ...prev,
          'PDF Storage': { 
            passed: false, 
            message: `Failed: ${result.error || 'Unknown error'}` 
          }
        }));
        addLog(`PDF storage test failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        'PDF Storage': { 
          passed: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }));
      addLog(`PDF storage test threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test complete PDF upload and display flow
  const testPdfUpload = async () => {
    addLog('Testing PDF upload to reader flow...');
    
    // Create a test PDF with known content
    const testText = "This is test content that should display in the reader component after upload";
    const testFile = new File([testText], "upload-test.pdf", { type: "application/pdf" });
    
    try {
      // Mock the upload flow
      const uploadResult = await pdfStorage.uploadPDF(testFile, testText);
      
      if (uploadResult.success && uploadResult.record) {
        // Now try to load the content into the reader
        setText(uploadResult.record.content || "");
        
        setTimeout(() => {
          if (currentWords.length > 0) {
            setResults(prev => ({
              ...prev,
              'PDF Upload': { 
                passed: true, 
                message: `Success: PDF uploaded and ${currentWords.length} words displayed` 
              }
            }));
            addLog(`PDF upload test passed: ${currentWords.length} words displayed`);
          } else {
            setResults(prev => ({
              ...prev,
              'PDF Upload': { 
                passed: false, 
                message: 'Failed: PDF uploaded but no text displayed' 
              }
            }));
            addLog('PDF upload test failed: No words displayed');
          }
        }, 500);
      } else {
        setResults(prev => ({
          ...prev,
          'PDF Upload': { 
            passed: false, 
            message: `Failed to upload: ${uploadResult.error || 'Unknown error'}` 
          }
        }));
        addLog(`PDF upload test failed: ${uploadResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        'PDF Upload': { 
          passed: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }));
      addLog(`PDF upload test threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Check initial state
  useEffect(() => {
    // Check if the context is available and working
    if (typeof setText === 'function') {
      setResults(prev => ({
        ...prev,
        'Initial State': { 
          passed: true, 
          message: 'Reader context available' 
        }
      }));
      addLog('Initial state test passed: Reader context available');
    } else {
      setResults(prev => ({
        ...prev,
        'Initial State': { 
          passed: false, 
          message: 'Reader context not available' 
        }
      }));
      addLog('Initial state test failed: Reader context not available');
    }
  }, [setText]);

  if (!isVisible) {
    return (
      <button 
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded"
        onClick={() => setIsVisible(true)}
      >
        Show Tests
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded shadow-xl border border-gray-700 w-96 max-h-[80vh] overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">PDF Migration Tests</h2>
        <button 
          className="text-gray-400 hover:text-white"
          onClick={() => setIsVisible(false)}
        >
          Hide
        </button>
      </div>

      <div className="space-y-4 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <button 
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm"
            onClick={testDirectTextSet}
          >
            Test Direct Text
          </button>
          
          <button 
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm"
            onClick={testReaderModel}
          >
            Test Reader Model
          </button>

          <button 
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm"
            onClick={testPdfStorage}
          >
            Test PDF Storage
          </button>

          <button 
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm"
            onClick={testPdfUpload}
          >
            Test PDF Upload
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Test Results:</h3>
          <div className="space-y-2">
            {Object.entries(results).map(([name, result]) => (
              <div 
                key={name} 
                className={`flex justify-between items-center p-2 rounded text-xs ${
                  result.passed ? 'bg-green-900/50' : 'bg-red-900/50'
                }`}
              >
                <span>{name}</span>
                <span>{result.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Debug Logs:</h3>
          <div className="bg-gray-900 p-2 rounded text-xs h-40 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400 mt-4">
        Current Reader Words: {currentWords.length}
      </div>
    </div>
  );
} 