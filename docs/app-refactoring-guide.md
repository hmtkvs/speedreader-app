# App Component Refactoring Guide

The App.tsx component is currently 757 lines long and contains logic that should be distributed across various features. This guide outlines a strategy for refactoring this component.

## Current Issues

1. The App.tsx component is too large (757 lines)
2. It contains logic for multiple features
3. It directly uses components and utilities from the old structure
4. It manages state that should be encapsulated within features

## Refactoring Goals

1. Reduce App.tsx to a minimal router/layout component
2. Move feature-specific logic into appropriate feature modules
3. Use hooks and contexts from feature modules instead of direct state management
4. Implement proper dependency injection between features

## Refactoring Strategy

### Step 1: Create Feature-Specific Contexts

For each feature, create a context provider that will manage the state and logic for that feature. For example:

```typescript
// src/features/reader/contexts/ReaderContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ReaderModel } from '../models/ReaderModel';

type ReaderContextType = {
  reader: ReaderModel;
  isPlaying: boolean;
  currentWords: Array<{ before: string; highlight: string; after: string }>;
  // other state and methods
};

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [reader] = useState(() => new ReaderModel());
  const [currentWords, setCurrentWords] = useState([{ before: '', highlight: '', after: '' }]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Add other state and methods
  
  return (
    <ReaderContext.Provider value={{ reader, isPlaying, currentWords }}>
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader() {
  const context = useContext(ReaderContext);
  if (context === undefined) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
}
```

### Step 2: Create Feature-Specific Pages/Containers

Create container components for each feature that will use the context providers:

```typescript
// src/features/reader/containers/ReaderContainer.tsx
import React from 'react';
import { ReaderProvider } from '../contexts/ReaderContext';
import { FullscreenReader } from '../components/FullscreenReader';

export function ReaderContainer() {
  return (
    <ReaderProvider>
      <FullscreenReader />
    </ReaderProvider>
  );
}
```

### Step 3: Refactor App.tsx to Use Feature Containers

Refactor App.tsx to be a minimal component that uses the feature containers:

```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/contexts/AuthContext';
import { LandingPage } from './features/landing/components/LandingPage';
import { ReaderContainer } from './features/reader/containers/ReaderContainer';
import { PDFManagerContainer } from './features/pdf-management/containers/PDFManagerContainer';
import { StatsContainer } from './features/statistics/containers/StatsContainer';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/reader" element={<ReaderContainer />} />
          <Route path="/pdfs" element={<PDFManagerContainer />} />
          <Route path="/stats" element={<StatsContainer />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

### Step 4: Move Feature-Specific Logic to Feature Modules

For each feature, identify the logic in App.tsx that belongs to that feature and move it to the appropriate feature module. For example:

#### Reader Feature

The following logic from App.tsx should be moved to the reader feature:
- ReaderModel instantiation and state management
- Play/pause controls
- WPM adjustment
- Font size adjustment
- Words at time adjustment
- Color scheme management

#### Subscription Feature

The following logic from App.tsx should be moved to the subscription feature:
- Subscription checks
- Trial management
- Subscription modal display

#### PDF Management Feature

The following logic from App.tsx should be moved to the PDF management feature:
- PDF selection
- PDF display

#### Translation Feature

The following logic from App.tsx should be moved to the translation feature:
- Word selection
- Translation fetching
- Translation tooltip positioning

### Step 5: Implement Cross-Feature Communication

For communication between features, use a combination of:

1. **Context Consumers**: A feature can consume the context of another feature when needed
2. **Event Emitters**: Features can publish events that other features can subscribe to
3. **Service Facades**: Create facade services that abstract the details of one feature for use by another

Example of a service facade:

```typescript
// src/features/reader/services/StatisticsFacade.ts
import { StatisticsService } from '../../statistics/services/StatisticsService';

export class StatisticsFacade {
  private statisticsService: StatisticsService;
  
  constructor() {
    this.statisticsService = StatisticsService.getInstance();
  }
  
  trackWordsRead(count: number) {
    this.statisticsService.trackWordsRead(count);
  }
  
  trackReadingTime(seconds: number) {
    this.statisticsService.trackReadingTime(seconds);
  }
}
```

## Implementation Plan

### Phase 1: Create Contexts and Hooks

1. Identify all state and logic in App.tsx
2. Create contexts and hooks for each feature
3. Test contexts and hooks in isolation

### Phase 2: Create Feature Containers

1. Create container components for each feature
2. Move feature-specific JSX from App.tsx to containers
3. Test containers in isolation

### Phase 3: Refactor App.tsx

1. Strip down App.tsx to minimal routing and layout
2. Replace direct component usage with container components
3. Test the refactored App.tsx

### Phase 4: Implement Cross-Feature Communication

1. Identify dependencies between features
2. Implement appropriate communication patterns
3. Test cross-feature interactions

## Testing Strategy

1. Create unit tests for contexts, hooks, and containers
2. Create integration tests for feature interactions
3. Create end-to-end tests for complete user flows
4. Compare behavior before and after refactoring to ensure functionality is preserved

## Rollback Plan

1. Keep the original App.tsx until refactoring is complete and tested
2. If issues are found, roll back to the original App.tsx
3. Address issues and attempt refactoring again

## Conclusion

Refactoring App.tsx is a critical step in migrating to a feature-based architecture. By breaking down this large component into smaller, feature-specific components, we improve maintainability, testability, and separation of concerns. 