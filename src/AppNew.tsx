import React, { useState, useEffect } from 'react';
import { ReaderProvider, ReaderPage, useReader } from './features/reader';
import { ThemeProvider, useTheme } from './features/theme';
import { MainLayout } from './features/layout';
import { FileUploadCorner } from './components/FileUploadCorner';
import { PDFManagerAdapter } from './features/pdf-management';
import { SubscriptionModal } from './components/SubscriptionModal';
import { SubscriptionService } from './utils/subscription';
import { SimplifiedReaderModel } from './types/simplified';
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
  const { setText } = useReader();
  
  // State for PDF manager and subscription modal
  const [showPDFManager, setShowPDFManager] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState({ 
    hasAccess: false, 
    trialDaysLeft: null as number | null, 
    subscriptionDaysLeft: null as number | null 
  });
  
  // Create the reader model (will be passed to MainLayout)
  const [reader] = useState<ReaderModel>({
    addBook: async (text: string, name: string) => Promise.resolve(name),
    loadBook: async (id: string) => Promise.resolve(true),
    rewind: () => {},
    forward: () => {},
    setText: (text: string) => setText(text),
    play: () => {},
    pause: () => {},
    setTTSVoice: (voiceId: string) => {},
  } as unknown as ReaderModel);
  
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
    <MainLayout reader={reader as SimplifiedReaderModel}>
      {/* PDF Upload Button */}
      <FileUploadCorner
        reader={reader}
        colorScheme={{
          background: colorScheme.background,
          text: colorScheme.text,
          highlight: colorScheme.highlight || '#FF3B30'
        }}
      />

      {/* Core application page */}
      <ReaderPage />
      
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
    </MainLayout>
  );
}

export default AppWithProviders; 