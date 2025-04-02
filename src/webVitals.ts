import { getCLS, getFID, getLCP, getTTFB, getFCP } from 'web-vitals';

const vitalsTargets = {
  CLS: 0.1,   // Cumulative Layout Shift
  FID: 100,   // First Input Delay
  LCP: 2500,  // Largest Contentful Paint
  FCP: 1800,  // First Contentful Paint
  TTFB: 800   // Time to First Byte
};

export function reportWebVitals(onPerfEntry: (metric: {
  name: string;
  value: number;
  delta: number;
  target: number;
}) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(metric => {
      onPerfEntry({
        name: 'CLS',
        value: metric.value,
        delta: metric.delta || 0,
        target: vitalsTargets.CLS
      });
    });
    getFID(metric => {
      onPerfEntry({
        name: 'FID',
        value: metric.value,
        delta: metric.delta || 0,
        target: vitalsTargets.FID
      });
    });
    getLCP(metric => {
      onPerfEntry({
        name: 'LCP',
        value: metric.value,
        delta: metric.delta || 0,
        target: vitalsTargets.LCP
      });
    });
    getFCP(metric => {
      onPerfEntry({
        name: 'FCP',
        value: metric.value,
        delta: metric.delta || 0,
        target: vitalsTargets.FCP
      });
    });
    getTTFB(metric => {
      onPerfEntry({
        name: 'TTFB',
        value: metric.value,
        delta: metric.delta || 0,
        target: vitalsTargets.TTFB
      });
    });
  }
}