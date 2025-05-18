/**
 * Analytics utility for the markdown-ify bookmarklet using Plausible
 */
export class Analytics {
  private static plausibleDomain = 'agentscode.dev'; // Replace with your actual domain
  private static plausibleScriptUrl = 'https://plausible.io/js/plausible.js';
  private static isInitialized = false;

  /**
   * Initializes the Plausible analytics
   */
  public static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if Plausible script already exists
      if (!document.querySelector(`script[src="${this.plausibleScriptUrl}"]`)) {
        // Create and append Plausible script
        const script = document.createElement('script');
        script.defer = true;
        script.dataset.domain = this.plausibleDomain;
        script.src = this.plausibleScriptUrl;
        document.head.appendChild(script);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Tracks a custom event
   * @param name The name of the event to track
   * @param props Optional properties to include with the event
   */
  public static trackEvent(name: string, props: Record<string, any> = {}): void {
    try {
      // Make sure we have access to the Plausible function
      if (typeof (window as any).plausible !== 'function') {
        console.warn('Plausible analytics not loaded yet');
        return;
      }

      // Track the event
      (window as any).plausible(name, { props });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Tracks a page view
   * @param name The name of the page to track
   */
  public static trackPageView(name: string): void {
    this.trackEvent('pageview', { page: name });
  }

  /**
   * Tracks a feature usage
   * @param feature The feature being used
   */
  public static trackFeatureUsage(feature: string): void {
    this.trackEvent('feature_used', { feature });
  }
}