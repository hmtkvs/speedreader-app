import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { ErrorHandler } from './errorHandler';

interface MonitoringConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
}

class Monitoring {
  private static instance: Monitoring;
  private initialized = false;
  private errorHandler: ErrorHandler;

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }

  static getInstance(): Monitoring {
    if (!Monitoring.instance) {
      Monitoring.instance = new Monitoring();
    }
    return Monitoring.instance;
  }

  initialize(config: MonitoringConfig) {
    if (this.initialized) return;

    Sentry.init({
      dsn: config.dsn,
      integrations: [new BrowserTracing()],
      environment: config.environment,
      release: config.release,
      tracesSampleRate: config.tracesSampleRate,
      beforeSend(event) {
        // Sanitize sensitive data
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
        }
        return event;
      }
    });

    // Override console methods in production
    if (process.env.NODE_ENV === 'production') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        Sentry.captureException(args);
        originalConsoleError.apply(console, args);
      };
    }

    this.initialized = true;
  }

  captureError(error: Error, context?: Record<string, any>) {
    this.errorHandler.handleError(error, context);
    
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        extra: context
      });
    }
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(message, {
        level
      });
    }
  }

  setUser(user: { id: string; email?: string }) {
    Sentry.setUser(user);
  }

  startTransaction(name: string, op: string) {
    return Sentry.startTransaction({
      name,
      op
    });
  }
}

export { Monitoring }