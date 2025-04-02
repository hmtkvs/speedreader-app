import { GA4React } from 'ga-4-react';

interface AnalyticsConfig {
  measurementId: string;
  debug?: boolean;
}

class Analytics {
  private static instance: Analytics;
  private ga4: GA4React | null = null;
  private initialized = false;
  private queue: Array<() => void> = [];

  private constructor() {}

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  async initialize(config: AnalyticsConfig) {
    if (this.initialized) return;

    try {
      this.ga4 = new GA4React(config.measurementId, { debug: config.debug });
      await this.ga4.initialize();
      
      // Process queued events
      while (this.queue.length > 0) {
        const event = this.queue.shift();
        event?.();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  trackEvent(category: string, action: string, label?: string, value?: number) {
    const trackingFunction = () => {
      this.ga4?.event(category, action, {
        event_label: label,
        value: value
      });
    };

    if (!this.initialized) {
      this.queue.push(trackingFunction);
    } else {
      trackingFunction();
    }
  }

  trackPageView(path: string, title: string) {
    const trackingFunction = () => {
      this.ga4?.pageview(path, title);
    };

    if (!this.initialized) {
      this.queue.push(trackingFunction);
    } else {
      trackingFunction();
    }
  }

  trackTiming(category: string, variable: string, value: number, label?: string) {
    const trackingFunction = () => {
      this.ga4?.event('timing_complete', {
        event_category: category,
        event_label: label,
        name: variable,
        value: value
      });
    };

    if (!this.initialized) {
      this.queue.push(trackingFunction);
    } else {
      trackingFunction();
    }
  }

  setUserProperties(properties: Record<string, string>) {
    const trackingFunction = () => {
      this.ga4?.set(properties);
    };

    if (!this.initialized) {
      this.queue.push(trackingFunction);
    } else {
      trackingFunction();
    }
  }
}

export { Analytics }