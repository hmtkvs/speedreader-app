# Clean-up Plan for Migrated Features

This document outlines the plan for cleaning up duplicated code between the new feature-based structure and the old organization structure.

## PDF Management Feature

### Files to Remove
- [x] src/components/PDFManager.tsx (replaced by src/features/pdf-management/components/PDFManager.tsx)
- [x] src/components/PDFList.tsx (replaced by src/features/pdf-management/components/PDFList.tsx)
- [x] src/components/PDFUploader.tsx (replaced by src/features/pdf-management/components/PDFUploader.tsx)
- [x] src/utils/pdfStorage.ts (replaced by src/features/pdf-management/services/pdfStorageService.ts)
- [x] src/utils/pdfValidator.ts (replaced by src/features/pdf-management/services/PDFValidatorService.ts)
- [x] src/utils/pdfParser.ts (replaced by src/features/pdf-management/services/PDFParserService.ts)

### Update References
- [x] Update App.tsx to use the PDFManagerAdapter
- [x] Update pdfParser.ts to use the new PDF services
- [x] Update pdfValidator.ts to use the new PDF services
- [x] Create FileUploadAdapter to bridge the old and new API
- [x] Create FileUploadCornerAdapter component
- [x] Create SavedPDFsPanelAdapter component
- [x] Update any other components that use the old PDF utilities

## Reader Feature

### Files to Remove
- [x] src/components/FullscreenReader.tsx (replaced by Reader feature)
- [ ] src/utils/tts.ts (replaced by TTSService in Reader feature)

### Implemented Components
- [x] FullscreenReader component (core reader UI)
- [x] InlineReader component (for embedded reading)
- [x] ReaderSettingsModal component (for adjusting reader settings)
- [x] TTSSettingsAdapter component (to bridge old and new TTS)
- [x] ReaderContext and Provider implementation
- [x] useReader hook for reader state management
- [x] ReaderContainer to wrap reader functionality

### Update References
- [x] Update App.tsx to use the Reader feature FullscreenReader
- [x] Update App.tsx to use the InlineReader component
- [x] Update App.tsx to use the ReaderSettingsModal
- [x] Wrap App component with ReaderProvider for state management
- [x] Create TTSSettingsAdapter to bridge old and new TTSService
- [x] Add SimplifiedReaderModel to support adapters
- [x] Create bridge in tts.ts to use new TTSService
- [x] Update App.tsx to use the Reader feature's hooks and state management
- [x] Update any components that reference the old Reader components

## App.tsx Refactoring

### Goals
- [ ] Reduce App.tsx to a minimal router/layout component
- [ ] Move feature-specific logic into appropriate feature modules
- [ ] Use hooks and contexts from feature modules instead of direct state management
- [ ] Implement proper dependency injection between features

### Implementation Tasks
- [ ] Create MainLayout component to handle shared UI elements
- [ ] Create AppRouter to handle navigation between features
- [ ] Extract color scheme management into a dedicated ThemeProvider
- [ ] Move PDF and Reader interaction logic to feature-specific containers
- [ ] Convert subscription logic to use a SubscriptionProvider
- [ ] Convert statistics logic to use a StatisticsProvider
- [ ] Create feature-specific page components for each main view
- [ ] Ensure all features communicate through well-defined interfaces

## Authentication Feature (Next in Queue)

### Files to Migrate
- [ ] src/components/LoginForm.tsx → src/features/authentication/components/LoginForm.tsx
- [ ] src/components/SignupForm.tsx → src/features/authentication/components/SignupForm.tsx 
- [ ] src/utils/auth.ts → src/features/authentication/services/AuthService.ts

### Components to Implement
- [ ] AuthProvider context
- [ ] useAuth hook for accessing authentication state
- [ ] ProtectedRoute component

## Subscription Feature (Upcoming)

### Files to Migrate
- [ ] src/components/SubscriptionModal.tsx → src/features/subscription/components/SubscriptionModal.tsx
- [ ] src/utils/subscription.ts → src/features/subscription/services/SubscriptionService.ts

### Components to Implement
- [ ] SubscriptionProvider context
- [ ] useSubscription hook

## Statistics Feature (Upcoming)

### Files to Migrate
- [ ] src/components/StatsPanel.tsx → src/features/statistics/components/StatsPanel.tsx
- [ ] src/utils/statistics.ts → src/features/statistics/services/StatisticsService.ts

## General Clean-up

### Utility Classes
- [x] Create ErrorHandler adapter
- [ ] Review and consolidate any duplicated utility functions
- [ ] Ensure ErrorHandler is consistently used across the application

### Style and Convention
- [ ] Ensure consistent naming conventions across migrated features
- [ ] Update import statements to use the new feature-based structure

## Next Steps

1. **Testing Phase (CURRENT PRIORITY)**
   - [x] Run the application and test the PDF Management feature
   - [x] Install missing dependencies (@mui/material, @emotion/react, @emotion/styled, @mui/icons-material, react-dropzone)
   - [x] Fix UI organization by removing duplicate PDF management components 
   - [x] Fix Reader UI confusion by removing redundant "Open Full Reader" button
   - [x] Simplify UI by removing InlineReader component and duplicated controls
   - [x] Add sample text and reading progress indicators
   - [x] Verify PDF management UI follows the original design (corner upload button + left sidebar panel)
   - [x] Test the Reader feature with various PDFs and texts
   - [x] Verify TTS functionality works correctly with the new adapter
   - [x] Restore original design elements for settings and TTS components
   - [ ] Test feature interactions (PDF upload → reading → settings adjustments)

2. **App Component Refactoring**
   - [ ] Extract MainLayout component from App.tsx
   - [ ] Implement ThemeProvider for color scheme management
   - [ ] Create feature-specific page components
   - [ ] Set up minimal AppRouter
   - [ ] Implement dependency injection pattern for feature communication

3. **Remaining TTS Migration**
   - [ ] Complete removal of src/utils/tts.ts after confirming all references are updated
   - [ ] Ensure TTSService is used consistently throughout the application

4. **Begin Authentication Feature Migration**
   - [ ] Create folder structure for Authentication feature
   - [ ] Implement AuthService as replacement for auth.ts
   - [ ] Create adapter components for backward compatibility

5. **Documentation Updates**
   - [ ] Update component documentation to reflect new architecture
   - [ ] Create architecture diagram showing feature relationships

## Implementation Strategy

1. First update all import references to use the new feature-based structure
2. Create adapter components where needed to bridge old and new APIs
3. Remove old files only after confirming all references have been updated
4. Run the application and test functionality after each set of changes
5. Gradually refactor App.tsx by extracting components and moving logic to feature modules
6. Implement proper dependency injection patterns between features

This incremental approach will minimize the risk of breaking changes during the migration process. 