/**
 * Analytics Tracker
 * Simple tracking utility for anonymous usage analytics
 */

// Feature flag to enable/disable analytics
const ANALYTICS_ENABLED = true;

// Plausible analytics tracker
interface EventProperties {
  [key: string]: string | number | boolean;
}

/**
 * Track an event with Plausible analytics
 *
 * @param eventName Name of the event to track
 * @param properties Optional event properties
 */
export function trackEvent(eventName: string, properties: EventProperties = {}): void {
  // Don't track if analytics is disabled
  if (!ANALYTICS_ENABLED) {
    return;
  }

  try {
    // Check if Plausible exists
    if (typeof window !== 'undefined' && 'plausible' in window) {
      // Cast window to have the plausible property
      const plausible = (window as any).plausible;
      if (typeof plausible === 'function') {
        plausible(eventName, { props: properties });
      }
    }
  } catch (error) {
    // Silently fail - analytics should never break the app
    // eslint-disable-next-line no-console
    console.debug('Analytics tracking failed:', error);
  }
}

/**
 * Initialize the analytics tracker
 */
export function initAnalytics(): void {
  if (!ANALYTICS_ENABLED) {
    return;
  }

  try {
    // If we're in a browser and plausible isn't already loaded
    if (typeof window !== 'undefined' && !('plausible' in window)) {
      // Create a promise that will resolve or timeout
      const scriptLoaded = new Promise<void>((resolve) => {
        // Set a timeout to fail gracefully if blocked
        const timeoutId = setTimeout(() => {
          resolve(); // Resolve anyway to prevent blocking the app
          console.debug('Analytics script load timed out - likely blocked by an ad blocker');
        }, 2000);

        // Add Plausible script - we use the proxy approach for privacy
        const script = document.createElement('script');
        script.defer = true;
        script.dataset.domain = 'markdown-ify.agentscode.dev';
        script.src = 'https://plausible.io/js/script.js';

        // Handle success
        script.onload = () => {
          clearTimeout(timeoutId);
          resolve();
        };

        // Handle failure
        script.onerror = () => {
          clearTimeout(timeoutId);
          resolve(); // Resolve anyway to prevent blocking the app
          console.debug('Analytics script failed to load - likely blocked by an ad blocker');
        };

        document.head.appendChild(script);
      });

      // Don't wait for this promise to resolve - let it happen in the background
      scriptLoaded.catch(() => {
        console.debug('Analytics initialization failed completely');
      });
    }
  } catch (error) {
    // Silently fail
    // eslint-disable-next-line no-console
    console.debug('Analytics initialization failed:', error);
  }
}

/**
 * Track a page view event
 *
 * @param url The URL to track (defaults to current URL)
 */
export function trackPageView(url?: string): void {
  trackEvent('pageview', { url: url || window.location.href });
}