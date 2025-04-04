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
- [x] Consolidate all Reader settings in one place
- [x] Ensure consistent handling of reading state across components

## App.tsx Refactoring

### Goals
- [x] Reduce App.tsx to a minimal router/layout component
- [x] Move feature-specific logic into appropriate feature modules
- [x] Use hooks and contexts from feature modules instead of direct state management
- [x] Implement proper dependency injection between features

### Implementation Tasks
- [x] Create MainLayout component to handle shared UI elements
- [ ] Create AppRouter to handle navigation between features
- [x] Extract color scheme management into a dedicated ThemeProvider
- [x] Move PDF and Reader interaction logic to feature-specific containers
- [x] Create feature-specific page components for each main view
- [x] Ensure PDF and Reader features communicate through well-defined interfaces

## Next Steps

1. **Finalize Testing**
   - [ ] Test PDF and Reader feature interactions (upload → reading → settings adjustments)
   - [ ] Test across different browsers and device sizes
   - [ ] Verify all edge cases are handled properly

2. **App Component Refactoring**
   - [x] Extract MainLayout component from App.tsx
   - [x] Implement ThemeProvider for color scheme management
   - [x] Create PDF and Reader page components
   - [ ] Set up minimal AppRouter
   - [x] Implement dependency injection pattern for feature communication

3. **TTS Migration Completion**
   - [ ] Complete removal of src/utils/tts.ts after confirming all references are updated
   - [x] Ensure TTSService is used consistently throughout the application

4. **Cleanup and Final Touches**
   - [ ] Rename AppNew.tsx to App.tsx once testing confirms it works correctly
   - [ ] Remove or archive original App.tsx once migration is complete
   - [ ] Add comprehensive documentation for the feature-based architecture
   - [ ] Review for any remaining technical debt or TODOs

## Implementation Strategy

1. Complete testing of the new application architecture with feature modules
2. Finalize the migration by renaming AppNew.tsx to App.tsx
3. Document the new architecture and patterns for future development
4. Complete the remaining PDF Management feature testing

This focused approach has helped streamline the PDF and Reader features while improving the overall architecture. 