import { Workbox } from 'workbox-window';

export function registerServiceWorker() {
  // Skip service worker registration in StackBlitz environment
  if (window.location.hostname.includes('webcontainer.io')) {
    console.log('Service Workers are not supported in StackBlitz environment');
    return;
  }

  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/sw.js');

    wb.addEventListener('installed', event => {
      if (event.isUpdate) {
        // New content is available, show update notification
        if (confirm('New version available! Click OK to update.')) {
          window.location.reload();
        }
      }
    });

    wb.addEventListener('activated', () => {
      // Cache has been updated
      console.log('New content is available, please refresh.');
    });

    wb.register().catch(error => {
      console.error('Service worker registration failed:', error);
    });
  }
}