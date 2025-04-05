import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ReaderPage } from '../../reader';
import { MainLayout } from '../../layout';
import { ReaderModel } from '../../../models/reader';
import { SimplifiedReaderModel } from '../../../types/simplified';

interface AppRouterProps {
  reader: ReaderModel;
}

/**
 * AppRouter component that handles navigation between different pages/features
 */
export function AppRouter({ reader }: AppRouterProps) {
  console.log("DEBUG: AppRouter rendered with reader:", reader ? "available" : "not available");
  console.log("DEBUG: Reader has setText:", reader && typeof reader.setText === 'function' ? "yes" : "no");
  
  return (
    <BrowserRouter>
      <MainLayout reader={reader as SimplifiedReaderModel}>
        <Routes>
          {/* Main reader page (default route) */}
          <Route path="/" element={<ReaderPage />} />
          
          {/* Redirect all unknown routes to home */}
          <Route path="*" element={<ReaderPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
} 