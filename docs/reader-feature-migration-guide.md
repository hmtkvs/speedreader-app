# Reader Feature Migration Guide

This document outlines the steps required to migrate the Reader feature from the legacy code architecture to the new feature-based approach.

## Overview

The Reader feature is being migrated from a monolithic implementation in `App.tsx` to a modular, feature-based architecture. This will improve maintainability, code organization, and separation of concerns.

## Migration Process

### 1. Create the Reader Feature Module Structure

```
src/features/reader/
├── components/        # UI components specific to the reader
├── contexts/          # Context providers for reader state
├── hooks/             # Custom hooks for reader functionality
├── models/            # Data models and interfaces
├── services/          # Reader-related services (e.g., TTS)
├── pages/             # Reader pages
└── index.ts           # Public API of the Reader feature
```

### 2. Extract the TTS Service

- Move TTS functionality from `src/utils/tts.ts` to `src/features/reader/services/TTSService.ts`
- Update any references to the TTS service throughout the codebase

### 3. Create Reader Context

- Create `ReaderContext.tsx` to manage reader state
- Implement the `useReader` hook for accessing reader functionality

### 4. Extract Reader Components

- Move reader UI components from `App.tsx` to dedicated component files
- Create a `FullscreenReader` component
- Create a `ReaderControls` component

### 5. Create Reader Page

- Create a `ReaderPage` component that combines all reader UI elements
- Connect the reader page to the reader context

### 6. Update App.tsx

- Replace the inline reader implementation with the new Reader feature
- Wrap the app with the ReaderProvider

## Common Migration Issues and Troubleshooting

### Context Nesting Issues

When migrating to a feature-based architecture with multiple contexts, you may encounter issues with context nesting:

1. **Problem**: Changes in one context (e.g., text updates) not propagating to components using other contexts
   **Solution**: Implement direct communication patterns instead of relying solely on context

2. **Problem**: Multiple instances of the same context leading to state inconsistencies
   **Solution**: Ensure there's a single source of truth for state and use adapter patterns

### Text Setting Flow Issues

The most critical path in the reader is the text setting flow from PDF upload/selection to display:

1. **Direct Communication**: Use direct model access for critical operations rather than passing through multiple context layers:
   ```typescript
   // Instead of this:
   <ReaderProvider>
     <ComponentA>
       <ComponentB /> // Has to access context through multiple layers
     </ComponentA>
   </ReaderProvider>

   // Prefer this for critical flows:
   <ComponentA setText={text => readerModel.setText(text)}>
     <ComponentB /> 
   </ComponentA>
   ```

2. **Sequential Timing**: Use controlled timeouts to ensure UI updates happen in the correct order:
   ```typescript
   // Ensure state is updated before closing UI or navigating
   setTimeout(() => {
     setText(content);
     // Wait for text to be processed before closing
     setTimeout(() => onClose(), 300);
   }, 100);
   ```

### Testing Migration Success

To verify that the Reader feature has been successfully migrated:

1. Test text setting from all sources (PDF upload, sidebar selection, paste)
2. Verify state persistence across component unmounts/remounts
3. Check that all reader controls function with the new architecture
4. Add debug logs to track data flow through the application

## Implementation Details

### ReaderModel

The core model that manages the reading state and functionality.

### ReaderContext

Provides access to the reader state and methods throughout the application.

### useReader Hook

```typescript
const { 
  currentWords, 
  isPlaying,
  setText,
  play,
  pause,
  // ...other methods
} = useReader();
```

## Current Status

The Reader feature is partially migrated. A basic structure exists in `src/features/reader/` with empty folders for services, utils, and models. However, the main reader component and utilities are still in the old structure.

## Feature Overview

The Reader feature is responsible for:
- Displaying text in a readable format
- Controlling reading speed and progress
- Handling text-to-speech functionality
- Managing word highlighting
- Tracking reading progress

## Components to Migrate

### 1. FullscreenReader.tsx

**Current Location**: `src/components/FullscreenReader.tsx`
**Target Location**: `src/features/reader/components/FullscreenReader.tsx`

This component handles the fullscreen reading experience.

## Utilities to Migrate

### 1. tts.ts (Text-to-Speech)

**Current Location**: `src/utils/tts.ts`
**Target Location**: `src/features/reader/services/TTSService.ts`

This utility provides text-to-speech functionality for the reader.

## Models to Create

### 1. ReaderModel

**Current Location**: Likely `src/models/reader.ts`
**Target Location**: `src/features/reader/models/ReaderModel.ts`

This model handles the core reading logic.

## Migration Steps

### Step 1: Create Directory Structure

Ensure the following directory structure exists:

```
src/
  features/
    reader/
      components/
      services/
      utils/
      models/
      hooks/
      contexts/
      index.ts
```

### Step 2: Migrate FullscreenReader Component

1. Copy `src/components/FullscreenReader.tsx` to `src/features/reader/components/FullscreenReader.tsx`
2. Update imports to use the new feature structure
3. Refactor as needed to integrate with the new structure

### Step 3: Migrate Text-to-Speech Service

1. Copy `src/utils/tts.ts` to `src/features/reader/services/TTSService.ts`
2. Refactor to follow a proper service structure:
   - Convert to a class-based service if it's not already
   - Use proper TypeScript interfaces for parameters and return types
   - Implement proper error handling
   - Add documentation

### Step 4: Migrate ReaderModel

1. Copy `src/models/reader.ts` to `src/features/reader/models/ReaderModel.ts`
2. Update imports to use the new feature structure
3. Refactor as needed to integrate with the new structure

### Step 5: Create Hooks and Context (if needed)

1. Create a `useReader` hook in `src/features/reader/hooks/useReader.ts`
2. Create a Reader context in `src/features/reader/contexts/ReaderContext.tsx` if global state is needed

### Step 6: Create Feature Index

Create an `index.ts` file in the reader feature folder to export all public components, hooks, and services:

```typescript
// src/features/reader/index.ts
export { FullscreenReader } from './components/FullscreenReader';
export { ReaderModel } from './models/ReaderModel';
export { useReader } from './hooks/useReader';
// Export other public API elements
```

### Step 7: Update App.tsx

Update imports in App.tsx to use the new feature structure:

```typescript
// Old import
import { FullscreenReader } from './components/FullscreenReader';

// New import
import { FullscreenReader } from './features/reader';
```

## Testing Strategy

1. After migrating each component or utility, test its functionality in isolation
2. After migrating the entire feature, test the feature as a whole
3. Ensure that the feature works properly when integrated with other features

## Dependencies

The Reader feature has dependencies on:
- Statistics feature for tracking reading stats
- Settings feature for reader configuration
- Translation feature for word translation

These dependencies should be managed carefully during migration, preferably by defining clear interfaces between features.

## Rollback Plan

If issues are encountered during migration:
1. Keep the original files in place until the migration is verified
2. If major issues are found, revert to using the original files
3. Document the issues and plan to address them in a future iteration 