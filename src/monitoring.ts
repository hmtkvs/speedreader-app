import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';
import { reportWebVitals } from './webVitals';
import { ErrorHandler } from './utils/errorHandler';

export function initializeMonitoring() {
  // Initialize Sentry
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    integrations: [new BrowserTracing()],
    tracesSampleRate: 1.0,
    environment: import.meta.env.MODE || 'development',
    beforeSend(event) {
      // Sanitize sensitive data
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
      }
      return event;
    }
  });

  // Initialize web vitals reporting
  reportWebVitals(metric => {
    // Report to analytics
    if (window.gtag) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.name,
        value: Math.round(metric.value),
        non_interaction: true,
      });
    }

    // Report to Sentry
    Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: metric.value > metric.target ? 'warning' : 'info',
      extra: {
        value: metric.value,
        target: metric.target,
        delta: metric.delta
      }
    });
  });

  // Override console methods in production
  if (import.meta.env.PROD) {
    const errorHandler = ErrorHandler.getInstance();
    const originalConsoleError = console.error;
    console.error = (...args) => {
      errorHandler.handleError(args[0] instanceof Error ? args[0] : new Error(args.join(' ')));
      originalConsoleError.apply(console, args);
    };
  }
}