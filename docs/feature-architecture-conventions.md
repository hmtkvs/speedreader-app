# Feature Architecture Conventions

This document defines the coding conventions and best practices for the feature-based architecture of the Speed Reader application.

## Directory Structure

Each feature should follow this standard structure:

```
src/
  features/
    feature-name/       # kebab-case for directory names
      components/       # UI components specific to this feature
      hooks/            # Custom hooks for this feature
      services/         # Services and business logic
      utils/            # Helper functions specific to this feature
      models/           # Data models and types
      api/              # API calls related to this feature
      contexts/         # React contexts if needed
      containers/       # Container components that combine multiple components
      constants.ts      # Feature-specific constants
      index.ts          # Public API exports
```

## File Naming Conventions

- **Components**: Use PascalCase (e.g., `ReaderDisplay.tsx`)
- **Hooks**: Use camelCase with `use` prefix (e.g., `useReaderSettings.ts`)
- **Services**: Use PascalCase with `Service` suffix (e.g., `TTSService.ts`)
- **Utils**: Use camelCase (e.g., `wordProcessor.ts`)
- **Models**: Use PascalCase (e.g., `ReaderModel.ts`)
- **Contexts**: Use PascalCase with `Context` suffix (e.g., `ReaderContext.tsx`)
- **Containers**: Use PascalCase with `Container` suffix (e.g., `ReaderContainer.tsx`)
- **Constants**: Use UPPER_SNAKE_CASE for constant values within the file

## Coding Patterns

### Components

```typescript
// src/features/feature-name/components/ComponentName.tsx
import React from 'react';
import type { ComponentProps } from './Component.types';

/**
 * ComponentName description
 */
export function ComponentName({ 
  prop1, 
  prop2 
}: ComponentProps): React.ReactElement {
  // Component implementation
  return (
    <div>
      {/* JSX content */}
    </div>
  );
}
```

### Services

```typescript
// src/features/feature-name/services/ExampleService.ts
import type { ServiceConfig, ServiceResult } from '../models/types';

/**
 * Service description
 */
export class ExampleService {
  private static instance: ExampleService;
  
  private constructor() {
    // Initialization
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): ExampleService {
    if (!ExampleService.instance) {
      ExampleService.instance = new ExampleService();
    }
    return ExampleService.instance;
  }
  
  /**
   * Method description
   */
  async doSomething(config: ServiceConfig): Promise<ServiceResult> {
    // Implementation
    return result;
  }
}
```

### Hooks

```typescript
// src/features/feature-name/hooks/useExample.ts
import { useState, useEffect } from 'react';
import type { ExampleConfig, ExampleResult } from '../models/types';

/**
 * Hook description
 */
export function useExample(config: ExampleConfig): ExampleResult {
  const [state, setState] = useState(initialState);
  
  useEffect(() => {
    // Effect implementation
  }, [config]);
  
  return {
    // Return values
  };
}
```

### Contexts

```typescript
// src/features/feature-name/contexts/ExampleContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ExampleContextValue } from '../models/types';

const ExampleContext = createContext<ExampleContextValue | undefined>(undefined);

type ExampleProviderProps = {
  children: ReactNode;
  initialValue?: Partial<ExampleContextValue>;
};

/**
 * Provider component for example context
 */
export function ExampleProvider({ 
  children, 
  initialValue = {} 
}: ExampleProviderProps): React.ReactElement {
  // State and logic
  
  const value: ExampleContextValue = {
    // Context value
  };
  
  return (
    <ExampleContext.Provider value={value}>
      {children}
    </ExampleContext.Provider>
  );
}

/**
 * Hook to use the example context
 */
export function useExampleContext(): ExampleContextValue {
  const context = useContext(ExampleContext);
  if (context === undefined) {
    throw new Error('useExampleContext must be used within an ExampleProvider');
  }
  return context;
}
```

### Container Components

```typescript
// src/features/feature-name/containers/ExampleContainer.tsx
import React from 'react';
import { ExampleProvider } from '../contexts/ExampleContext';
import { ComponentOne } from '../components/ComponentOne';
import { ComponentTwo } from '../components/ComponentTwo';

/**
 * Container component that combines multiple components with their context
 */
export function ExampleContainer(): React.ReactElement {
  return (
    <ExampleProvider>
      <div className="example-container">
        <ComponentOne />
        <ComponentTwo />
      </div>
    </ExampleProvider>
  );
}
```

### Feature Index

```typescript
// src/features/feature-name/index.ts
// Only export what should be public to other features

// Components
export { PublicComponent } from './components/PublicComponent';

// Hooks
export { usePublicHook } from './hooks/usePublicHook';

// Containers
export { FeatureContainer } from './containers/FeatureContainer';

// Types
export type { PublicType } from './models/types';
```

## Cross-Feature Communication

### 1. Direct Imports

When one feature needs to use another feature, import only from the feature's index.ts:

```typescript
// Good
import { useAuth } from '../../auth';

// Bad
import { useAuth } from '../../auth/hooks/useAuth';
```

### 2. Facades

For complex interactions, create facade services:

```typescript
// src/features/feature-a/services/FeatureBFacade.ts
import { ServiceB } from '../../feature-b';

export class FeatureBFacade {
  private serviceB: ServiceB;
  
  constructor() {
    this.serviceB = ServiceB.getInstance();
  }
  
  simplifiedMethod(param: string): Promise<ResultType> {
    return this.serviceB.complexMethod({ specialParam: param, otherParam: 'default' });
  }
}
```

### 3. Event Bus

For loosely coupled communication, use an event bus:

```typescript
// src/shared/services/EventBus.ts
type Listener = (data: any) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Record<string, Listener[]> = {};
  
  private constructor() {}
  
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  subscribe(event: string, listener: Listener): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    
    return () => {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    };
  }
  
  publish(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(data));
    }
  }
}
```

## Error Handling

### Service Errors

```typescript
// src/features/feature-name/models/errors.ts
export class FeatureError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'FeatureError';
  }
}

export class SpecificFeatureError extends FeatureError {
  constructor(message: string) {
    super(message, 'SPECIFIC_ERROR_CODE');
    this.name = 'SpecificFeatureError';
  }
}
```

### Component Error Boundaries

```typescript
// src/features/feature-name/components/FeatureErrorBoundary.tsx
import React, { ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class FeatureErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    console.error('Feature error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong in this feature.</div>;
    }

    return this.props.children;
  }
}
```

## Testing

### Component Tests

```typescript
// src/features/feature-name/components/__tests__/ComponentName.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '../ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName prop1="value1" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('handles user interaction', () => {
    const handleClick = jest.fn();
    render(<ComponentName prop1="value1" onAction={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Service Tests

```typescript
// src/features/feature-name/services/__tests__/ExampleService.test.ts
import { ExampleService } from '../ExampleService';

describe('ExampleService', () => {
  let service: ExampleService;
  
  beforeEach(() => {
    service = ExampleService.getInstance();
  });
  
  it('performs expected action', async () => {
    const result = await service.doSomething({ param: 'value' });
    expect(result).toEqual(expectedValue);
  });
  
  it('handles errors correctly', async () => {
    // Test error case
    await expect(service.doSomething({ param: 'invalid' }))
      .rejects.toThrow('Expected error message');
  });
});
```

## Documentation

### Component Documentation

```typescript
/**
 * Component that displays reader settings
 * 
 * @example
 * ```tsx
 * <ReaderSettings
 *   wpm={300}
 *   onWpmChange={handleWpmChange}
 *   fontSize={16}
 *   onFontSizeChange={handleFontSizeChange}
 * />
 * ```
 * 
 * @param props - Component props
 * @param props.wpm - Words per minute
 * @param props.onWpmChange - Callback for WPM changes
 * @param props.fontSize - Font size in pixels
 * @param props.onFontSizeChange - Callback for font size changes
 */
export function ReaderSettings({
  wpm,
  onWpmChange,
  fontSize,
  onFontSizeChange
}: ReaderSettingsProps): React.ReactElement {
  // Implementation
}
```

### Service Documentation

```typescript
/**
 * Service for text-to-speech functionality
 * 
 * @remarks
 * This service uses the Web Speech API to provide text-to-speech functionality.
 * It supports multiple voices and languages.
 * 
 * @example
 * ```ts
 * const tts = TTSService.getInstance();
 * tts.speak('Hello, world!');
 * ```
 */
export class TTSService {
  // Implementation
}
```

## Performance Considerations

1. Use React.memo for components that render often but rarely change
2. Use useMemo and useCallback for expensive computations and callbacks
3. Use virtualization for long lists
4. Implement proper loading states and error boundaries
5. Optimize bundle size with code splitting

## Accessibility Guidelines

1. Use semantic HTML elements
2. Provide proper ARIA attributes
3. Ensure keyboard navigation
4. Maintain sufficient color contrast
5. Support screen readers 