#!/usr/bin/env node

/**
 * Project Structure Setup Script
 * 
 * This script creates the recommended project structure.
 * Run with: node scripts/setup-structure.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Define the directory structure
const structure = {
  'src': {
    'features': {
      'reader': {
        'components': {},
        'hooks': {},
        'models': {},
        'services': {},
        'utils': {},
        'index.ts': ''
      },
      'pdf-management': {
        'components': {},
        'hooks': {},
        'services': {},
        'utils': {},
        'index.ts': ''
      },
      'subscription': {
        'components': {},
        'services': {},
        'index.ts': ''
      },
      'statistics': {
        'components': {},
        'services': {},
        'index.ts': ''
      },
      'landing': {
        'components': {},
        'index.ts': ''
      }
    },
    'core': {
      'domain': {
        'models': {},
        'interfaces': {},
        'types.ts': ''
      },
      'services': {},
      'errors': {
        'app-error.ts': '',
        'error-handler.ts': '',
        'index.ts': ''
      }
    },
    'api': {
      'supabase': {
        'client.ts': '',
        'queries.ts': '',
        'index.ts': ''
      },
      'tts': {
        'client.ts': '',
        'index.ts': ''
      },
      'translation': {},
      'stripe': {}
    },
    'infrastructure': {
      'database': {
        'repositories': {}
      },
      'storage': {},
      'monitoring': {},
      'analytics': {}
    },
    'shared': {
      'components': {
        'ui': {},
        'layout': {},
        'feedback': {}
      },
      'hooks': {},
      'utils': {},
      'constants': {}
    },
    'config': {
      'routes.ts': '',
      'theme.ts': '',
      'feature-flags.ts': '',
      'env.ts': ''
    },
    'assets': {
      'images': {},
      'fonts': {},
      'styles': {}
    }
  },
  'tests': {
    'unit': {
      'features': {},
      'core': {},
      'shared': {}
    },
    'integration': {},
    'e2e': {
      'specs': {},
      'fixtures': {}
    },
    'mocks': {}
  },
  'scripts': {},
  'docs': {
    'api': {},
    'architecture': {
      'diagrams': {},
      'decisions': {}
    },
    'developer': {},
    'user': {}
  }
};

// Initial content for some key files
const fileContents = {
  'src/features/reader/index.ts': `/**
 * Reader Feature
 * 
 * This module exports the public API for the reader feature.
 */

// Re-export components
// export { default as SpeedReader } from './components/SpeedReader';

// Re-export hooks
// export { useReaderSettings } from './hooks/useReaderSettings';

// Re-export types
// export type { ReaderSettings } from './models/types';
`,
  'src/core/errors/app-error.ts': `/**
 * Application Error Classes
 * 
 * This file contains custom error classes for the application.
 */

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(message: string, public code: string = 'APP_ERROR') {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error for invalid user input
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error for permission issues
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Error for API/network issues
 */
export class ApiError extends AppError {
  constructor(
    message: string, 
    public statusCode: number = 500
  ) {
    super(message, 'API_ERROR');
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Error for PDF processing issues
 */
export class PdfProcessingError extends AppError {
  constructor(message: string) {
    super(message, 'PDF_PROCESSING_ERROR');
    Object.setPrototypeOf(this, PdfProcessingError.prototype);
  }
}
`,
  'src/core/errors/error-handler.ts': `/**
 * Error Handler
 * 
 * Centralized error handling service that:
 * - Logs errors
 * - Reports errors to monitoring service
 * - Transforms technical errors to user-friendly messages
 */

import { AppError } from './app-error';

interface ErrorContext {
  [key: string]: unknown;
}

interface ErrorLog {
  timestamp: Date;
  error: Error;
  context?: ErrorContext;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private readonly maxLogs = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error, context?: ErrorContext): string {
    // Log the error
    this.logError(error, context);

    // For AppError (our custom errors), return the message directly
    if (error instanceof AppError) {
      return error.message;
    }

    // For other errors, return a generic message
    console.error('Unexpected error:', error);
    return 'An unexpected error occurred. Please try again.';
  }

  private logError(error: Error, context?: ErrorContext) {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      error,
      context
    };

    this.errorLogs.unshift(errorLog);
    
    // Keep only the most recent logs
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.pop();
    }

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog);
    }
  }

  public getRecentErrors(): ErrorLog[] {
    return [...this.errorLogs];
  }

  public clearLogs(): void {
    this.errorLogs = [];
  }
}

export { ErrorHandler }
`,
  'src/core/errors/index.ts': `/**
 * Error module exports
 */

export * from './app-error';
export * from './error-handler';
`,
  'src/config/env.ts': `/**
 * Environment Configuration
 * 
 * Centralized access to environment variables with validation
 */

export const env = {
  app: {
    name: import.meta.env.VITE_APP_NAME as string || 'Speed Reader',
    url: import.meta.env.VITE_APP_URL as string || 'http://localhost:5173',
    apiUrl: import.meta.env.VITE_API_URL as string || 'http://localhost:5173',
  },
  
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  },
  
  features: {
    enableTTS: import.meta.env.VITE_ENABLE_TTS === 'true',
    enablePDFUpload: import.meta.env.VITE_ENABLE_PDF_UPLOAD === 'true',
    enableTranslations: import.meta.env.VITE_ENABLE_TRANSLATIONS === 'true',
  },
  
  security: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE as string || '10485760', 10),
    allowedFileTypes: (import.meta.env.VITE_ALLOWED_FILE_TYPES as string || 'application/pdf,text/plain').split(','),
    maxTextLength: parseInt(import.meta.env.VITE_MAX_TEXT_LENGTH as string || '1000000', 10),
    rateLimitRequests: parseInt(import.meta.env.VITE_RATE_LIMIT_REQUESTS as string || '100', 10),
    rateLimitWindow: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW as string || '900', 10),
  },
  
  monitoring: {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN as string,
    gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID as string,
  },
  
  services: {
    deepinfraTTS: {
      token: import.meta.env.VITE_DEEPINFRA_TOKEN as string,
    },
    stripe: {
      publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY as string,
    },
  },
  
  // Validate required environment variables
  validate() {
    const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    const missing = required.filter(key => !import.meta.env[key]);
    
    if (missing.length) {
      throw new Error(
        \`Missing required environment variables: \${missing.join(', ')}. \` + 
        \`Please check your .env file.\`
      );
    }
    
    return this;
  }
};

// Self-validate on import
try {
  env.validate();
} catch (error) {
  // In development, show warning but don't crash
  if (import.meta.env.DEV) {
    console.warn(\`Environment validation warning: \${error.message}\`);
  } else {
    throw error;
  }
}
`,
  'src/api/supabase/client.ts': `/**
 * Supabase Client Configuration
 * 
 * Singleton implementation of Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Import types from the database schema
// import type { Database } from '@/types/supabase-types';

class SupabaseClient {
  private static instance: SupabaseClient;
  private client;
  private initialized: boolean = false;

  private constructor() {
    if (!env.supabase.url || !env.supabase.anonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.client = createClient(
      env.supabase.url,
      env.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      }
    );
    this.initialized = true;
  }

  public static getInstance(): SupabaseClient {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    return SupabaseClient.instance;
  }

  public getClient() {
    if (!this.initialized) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }
}

// Export a function to get the Supabase client instance
export function getSupabaseClient() {
  return SupabaseClient.getInstance().getClient();
}
`,
  'src/api/supabase/index.ts': `/**
 * Supabase API exports
 */

export { getSupabaseClient } from './client';
export { useSupabaseQuery } from './queries';
`,
  'docs/architecture/decisions/0001-project-structure.md': `# Architecture Decision Record: Project Structure

## Status

Accepted

## Context

We need to establish a project structure that supports:
- Feature-based organization
- Clear separation of concerns
- Domain-driven design
- Testability
- Scalability
- Maintainability

## Decision

We will organize the codebase primarily by feature/domain rather than technical type, following clean architecture principles.

Key aspects of the structure:
1. Feature-based organization in \`/src/features\`
2. Core business logic in \`/src/core\`
3. External interfaces in \`/src/api\`
4. Infrastructure implementations in \`/src/infrastructure\`
5. Shared code in \`/src/shared\`
6. Configuration in \`/src/config\`

## Consequences

### Positive
- Developers can find related code more easily
- Features can be developed in isolation
- Clear boundaries between application layers
- Tests can be organized around features
- New team members can understand the system more quickly
- Feature toggles are more straightforward to implement

### Negative
- More directories and files to manage
- Requires discipline to maintain the structure
- May require refactoring of existing code

## Implementation Notes

The structure supports:
1. Adding new features without modifying existing code
2. Replacing infrastructure components without affecting business logic
3. Testing components and logic in isolation
4. Scaling the application as requirements grow
`
};

// Create the directory structure
function createDirectoryStructure(structure, basePath = '') {
  for (const [name, content] of Object.entries(structure)) {
    const fullPath = path.join(basePath, name);
    
    if (typeof content === 'object' && Object.keys(content).length > 0) {
      // Create directory
      console.log(`${colors.blue}Creating directory:${colors.reset} ${fullPath}`);
      fs.mkdirSync(fullPath, { recursive: true });
      createDirectoryStructure(content, fullPath);
    } else if (typeof content === 'string') {
      // Create file
      console.log(`${colors.green}Creating file:${colors.reset} ${fullPath}`);
      
      // Get content from predefined file contents or use empty string
      const fileContent = fileContents[fullPath] || content;
      fs.writeFileSync(fullPath, fileContent);
    }
  }
}

// Create a README file for the new structure
function createReadme() {
  const readme = `# Project Structure

This project follows a feature-based organization with clean architecture principles.

## Key Directories

- \`/src/features\` - Feature modules organized by domain
- \`/src/core\` - Core business logic independent of UI
- \`/src/api\` - External API interfaces
- \`/src/infrastructure\` - Implementation of external services
- \`/src/shared\` - Shared components and utilities
- \`/src/config\` - Application configuration
- \`/tests\` - Test files organized by type
- \`/docs\` - Documentation

## Development Guidelines

- Add new features by creating a new directory in \`/src/features\`
- Keep business logic independent of UI in \`/src/core\`
- Use the repository pattern for data access in \`/src/infrastructure\`
- Share common components in \`/src/shared/components\`
- Document architecture decisions in \`/docs/architecture/decisions\`

For more details, see the [Architecture Documentation](/docs/architecture).
`;

  fs.writeFileSync(path.join('docs', 'README.md'), readme);
  console.log(`${colors.green}Created:${colors.reset} docs/README.md`);
}

// Main execution
console.log(`${colors.magenta}Setting up project structure...${colors.reset}`);

// Create structure
createDirectoryStructure(structure);
createReadme();

console.log(`\n${colors.cyan}Project structure setup complete!${colors.reset}`);
console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
console.log(`1. Run 'git add .' to stage the new directories`);
console.log(`2. Run 'git commit -m "Set up project structure"' to commit the changes`);
console.log(`3. Start migrating existing code into the new structure`);