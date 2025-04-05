import React, { useState, useEffect } from 'react';
import { ReaderProvider, useReader } from './features/reader';
import { ThemeProvider, useTheme } from './features/theme';
import { AppRouter } from './features/app/router/AppRouter';
import { FileUploadCorner } from './features/pdf-management/components/FileUploadCorner';
import { PDFManagerAdapter } from './features/pdf-management';
import { SubscriptionModal } from './components/SubscriptionModal';
import { SubscriptionService } from './utils/subscription';
import { ReaderModel } from './models/reader';

/**
 * App wrapper component that provides context
 */
const AppWithProviders = () => {
  return (
    <ThemeProvider>
      <ReaderProvider>
        <AppContent />
      </ReaderProvider>
    </ThemeProvider>
  );
};

/**
 * App content component that uses contexts
 */
function AppContent() {
  // Get contexts
  const { colorScheme } = useTheme();
  const { setText, currentWords } = useReader();
  
  // State for PDF manager and subscription modal
  const [showPDFManager, setShowPDFManager] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState({ 
    hasAccess: false, 
    trialDaysLeft: null as number | null, 
    subscriptionDaysLeft: null as number | null 
  });
  
  // Create the reader model (will be passed to AppRouter)
  const [reader] = useState<ReaderModel>({
    addBook: async (text: string, name: string) => {
      setText(text); // Ensure text is set in the reader context
      return Promise.resolve(name);
    },
    loadBook: async (id: string) => {
      return Promise.resolve(true);
    },
    rewind: () => {
      // Method implementation
    },
    forward: () => {
      // Method implementation
    },
    setText: (text: string) => {
      // Update debug state
      setTextState({
        hasText: text.length > 0,
        textLength: text.length,
        lastUpdate: Date.now()
      });
      
      // Set text directly using the useReader hook's setText
      setText(text);
      
      // Emit an event to notify other components
      document.dispatchEvent(new CustomEvent('reader-text-updated', { 
        detail: { 
          length: text.length, 
          preview: text.substring(0, 100) + "..."
        } 
      }));
    },
    play: () => {
      // Method implementation
    },
    pause: () => {
      // Method implementation
    },
    setTTSVoice: (voiceId: string) => {
      // Method implementation
    },
  } as unknown as ReaderModel);
  
  // Debug state to track text propagation
  const [textState, setTextState] = useState({
    hasText: false,
    textLength: 0,
    lastUpdate: Date.now()
  });
  
  // Event listeners for text updates
  useEffect(() => {
    const handleTextUpdate = (e: CustomEvent) => {
      // Handle text update event
    };
    
    const handlePdfDirectContent = (e: CustomEvent) => {
      if (e.detail?.text) {
        // Add a slight delay to allow component state to update
        setTimeout(() => {
          setText(e.detail.text);
          
          // Also send it to the reader model directly
          if (reader && reader.setText) {
            reader.setText(e.detail.text);
          }
        }, 100);
      }
    };
    
    // Listen for PDF content selected from the saved PDFs panel
    const handlePdfContentSelected = (e: CustomEvent) => {
      if (e.detail?.text) {
        // Update with the PDF content
        setText(e.detail.text);
        
        // Also update the reader model directly for good measure
        if (reader && reader.setText) {
          reader.setText(e.detail.text);
        }
      }
    };
    
    document.addEventListener('reader-text-updated', handleTextUpdate as EventListener);
    document.addEventListener('pdf-direct-content', handlePdfDirectContent as EventListener);
    document.addEventListener('pdf-content-selected', handlePdfContentSelected as EventListener);
    
    return () => {
      document.removeEventListener('reader-text-updated', handleTextUpdate as EventListener);
      document.removeEventListener('pdf-direct-content', handlePdfDirectContent as EventListener);
      document.removeEventListener('pdf-content-selected', handlePdfContentSelected as EventListener);
    };
  }, [setText]);
  
  // Check subscription status
  useEffect(() => {
    const subscription = SubscriptionService.getInstance();
    subscription.initialize();
    
    const checkSubscription = async () => {
      const info = await subscription.checkAccess();
      setSubscriptionInfo(info);
      
      // Show subscription modal if trial is ending soon (2 days left)
      if (info.trialDaysLeft !== null && info.trialDaysLeft <= 2) {
        setShowSubscription(true);
      }
    };

    checkSubscription();
  }, []);

  // Handle subscription
  const handleSubscribe = async (planId: string) => {
    const subscription = SubscriptionService.getInstance();
    const success = await subscription.subscribe(planId);
    
    if (success) {
      setShowSubscription(false);
      const info = await subscription.checkAccess();
      setSubscriptionInfo(info);
    }
  };

  // Handle PDF selection
  const handlePDFSelection = (pdfId: string, content: string) => {
    if (pdfId && content) {
      setText(content);
      setShowPDFManager(false);
    }
  };

  return (
    <>
      {/* Use AppRouter for routing */}
      <AppRouter reader={reader} />
      
      {/* Floating components that exist outside the router */}
      
      {/* PDF Upload Button */}
      <FileUploadCorner
        colorScheme={{
          background: colorScheme.background,
          text: colorScheme.text,
          highlight: colorScheme.highlight || '#FF3B30'
        }}
        directSetText={(text) => {
          console.log("DEBUG: Direct setText from FileUploadCorner, length:", text.length);
          console.warn("⚡ DIRECT SET TEXT CALLED FROM APP, length:", text.length);
          reader.setText(text);
        }}
      />
      
      {/* PDF Manager */}
      {showPDFManager && (
        <PDFManagerAdapter
          onSelectPDF={handlePDFSelection}
          colorScheme={{
            background: colorScheme.background,
            text: colorScheme.text,
            highlight: colorScheme.highlight || '#FF3B30'
          }}
        />
      )}
      
      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscription}
        onClose={() => setShowSubscription(false)}
        onSubscribe={handleSubscribe}
        colorScheme={{
          background: colorScheme.background,
          text: colorScheme.text,
          highlight: colorScheme.highlight || '#FF3B30'
        }}
        trialDaysLeft={subscriptionInfo.trialDaysLeft}
      />
    </>
  );
}

export default AppWithProviders; 