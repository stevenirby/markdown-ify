/**
 * Simple error tracking utility for the markdown-ify bookmarklet
 */
export class ErrorTracker {
  private static endpoint = 'https://example.com/api/errors'; // Placeholder endpoint

  /**
   * Reports an error to the tracking endpoint
   * @param error The error object or message to report
   * @param context Additional context info about the error
   */
  public static async reportError(error: Error | string, context: Record<string, any> = {}): Promise<void> {
    try {
      // Create the error payload
      const errorPayload = {
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context
      };

      // Send the error to the tracking endpoint
      // This is a mock implementation that doesn't actually send data anywhere
      console.error('Error tracked:', errorPayload);

      // In a real implementation, we would send the error to a backend
      // await fetch(this.endpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorPayload)
      // });
    } catch (e) {
      // Fail silently to avoid causing more errors
      console.error('Failed to report error:', e);
    }
  }

  /**
   * Wraps a function with error tracking
   * @param fn The function to wrap with error tracking
   * @returns A new function that catches and reports errors
   */
  public static wrapWithErrorTracking<T extends (...args: any[]) => any>(
    fn: T,
    context: Record<string, any> = {}
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        this.reportError(error as Error, {
          functionName: fn.name || 'anonymous',
          arguments: args,
          ...context
        });
        return undefined;
      }
    };
  }
}