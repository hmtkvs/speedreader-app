import React, { ReactNode, useState } from 'react';
import { IoMenu, IoStatsChart } from 'react-icons/io5';
import { useTheme } from '../../theme/contexts/ThemeContext';
import { SavedPDFsPanelAdapter } from '../../pdf-management';
import { StatsPanel } from '../../../components/StatsPanel';
import { StatisticsService } from '../../../utils/statistics';
import { SimplifiedReaderModel } from '../../../types/simplified';

interface MainLayoutProps {
  children: ReactNode;
  showSidebarToggle?: boolean;
  showStatsButton?: boolean;
  reader?: SimplifiedReaderModel;
}

/**
 * MainLayout component that provides consistent layout structure
 * and common UI elements across the application
 */
export function MainLayout({ 
  children, 
  showSidebarToggle = true,
  showStatsButton = true,
  reader
}: MainLayoutProps) {
  const { colorScheme } = useTheme();
  const [showSavedPDFs, setShowSavedPDFs] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [stats] = useState(() => StatisticsService.getInstance().getReadingStats());

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // If no reader provided, don't show PDF panel toggle
  const shouldShowSidebarToggle = showSidebarToggle && reader;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: colorScheme.background,
        color: colorScheme.text,
        fontFamily: colorScheme.font || 'system-ui, sans-serif',
      }}
    >
      {/* Content area */}
      <main className="flex-grow flex flex-col">
        {/* Sidebar toggle for mobile */}
        {shouldShowSidebarToggle && isMobile && (
          <button
            onClick={() => setShowSavedPDFs(true)}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40
              w-10 h-10 rounded-xl flex items-center justify-center
              hover:bg-current/10 transition-colors"
          >
            <IoMenu size={24} />
          </button>
        )}
        
        {/* Stats Button */}
        {showStatsButton && (
          <button
            onClick={() => setShowStats(true)}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-40
              w-10 h-10 rounded-xl flex items-center justify-center
              hover:bg-current/10 transition-colors"
          >
            <IoStatsChart size={24} />
          </button>
        )}
        
        {/* Main content */}
        {children}
      </main>

      {/* PDF Sidebar */}
      {reader && (
        <SavedPDFsPanelAdapter
          isOpen={showSavedPDFs}
          onClose={() => setShowSavedPDFs(false)}
          reader={reader}
          colorScheme={{
            background: colorScheme.background,
            text: colorScheme.text,
            highlight: colorScheme.highlight || '#FF3B30'
          }}
        />
      )}

      {/* Stats Panel */}
      <StatsPanel
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        colorScheme={{
          background: colorScheme.background,
          text: colorScheme.text,
          highlight: colorScheme.highlight || '#FF3B30'
        }}
      />
    </div>
  );
} 