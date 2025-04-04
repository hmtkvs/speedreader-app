# Clean-up Plan for PDF and Reader Features

This document outlines the plan for finalizing the PDF and Reader feature migrations and refactoring App.tsx to follow best practices.

## PDF Management Feature

### Remaining Tasks
- [ ] Complete testing of PDF upload and viewing functionality
- [ ] Ensure PDF list updates correctly when adding/removing PDFs
- [ ] Verify PDF content extraction works with all supported formats

## Reader Feature

### Remaining Tasks
- [ ] Complete removal of src/utils/tts.ts (replaced by TTSService in Reader feature)
- [ ] Consolidate all Reader settings in one place
- [ ] Ensure consistent handling of reading state across components

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
- [ ] Create feature-specific page components for each main view
- [ ] Ensure PDF and Reader features communicate through well-defined interfaces

## Next Steps

1. **Finalize Testing**
   - [ ] Test PDF and Reader feature interactions (upload → reading → settings adjustments)
   - [ ] Test across different browsers and device sizes
   - [ ] Verify all edge cases are handled properly

2. **App Component Refactoring**
   - [ ] Extract MainLayout component from App.tsx
   - [ ] Implement ThemeProvider for color scheme management
   - [ ] Create PDF and Reader page components
   - [ ] Set up minimal AppRouter
   - [ ] Implement dependency injection pattern for feature communication

3. **TTS Migration Completion**
   - [ ] Complete removal of src/utils/tts.ts after confirming all references are updated
   - [ ] Ensure TTSService is used consistently throughout the application

## Implementation Strategy

1. Complete all testing of PDF and Reader features
2. Gradually refactor App.tsx by extracting components and moving logic to feature modules
3. Implement proper dependency injection between PDF and Reader features
4. Ensure consistent state management using contexts and hooks

This focused approach will help streamline the PDF and Reader features while improving the overall architecture. 