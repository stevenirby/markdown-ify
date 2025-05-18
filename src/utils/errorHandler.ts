/**
 * Error Handler
 * Utility for handling and reporting errors in the Markdown-ify bookmarklet
 */

// Error categories for better organization and filtering
export enum ErrorCategory {
  INITIALIZATION = 'initialization',
  CONTENT_EXTRACTION = 'content-extraction',
  MARKDOWN_CONVERSION = 'markdown-conversion',
  RESOURCE_LOADING = 'resource-loading',
  UI = 'ui',
  UNKNOWN = 'unknown',
}

// Interface for structured error logging
export interface ErrorLog {
  timestamp: string;
  category: ErrorCategory;
  message: string;
  details?: string;
  error?: Error;
  url?: string;
}

// Store for recent errors
const recentErrors: ErrorLog[] = [];
const MAX_ERROR_LOGS = 10;

/**
 * Log an error with structured format
 *
 * @param category Error category
 * @param message User-friendly error message
 * @param error Original error object
 * @param details Additional details about the context
 * @returns The created error log entry
 */
export function logError(
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  message: string,
  error?: Error,
  details?: string
): ErrorLog {
  // Create structured error log
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    category,
    message,
    details,
    error,
    url: window.location.href,
  };

  // Store in recent errors, maintaining maximum size
  recentErrors.push(errorLog);
  if (recentErrors.length > MAX_ERROR_LOGS) {
    recentErrors.shift();
  }

  // Log to console
  console.error(
    `❌ [Markdown-ify ${category}]`,
    message,
    ...(details ? ['\nDetails:', details] : []),
    ...(error ? ['\nOriginal error:', error] : [])
  );

  return errorLog;
}

/**
 * Get recent error logs
 *
 * @returns Array of recent error logs
 */
export function getRecentErrors(): ErrorLog[] {
  return [...recentErrors];
}

/**
 * Clear error logs
 */
export function clearErrors(): void {
  recentErrors.length = 0;
}

/**
 * Create a user-friendly error notification in the UI
 *
 * @param message Error message to display
 * @param autoHide Whether to automatically hide the notification
 * @param hideAfter Time in ms after which to hide the notification
 * @returns The created notification element
 */
export function showErrorNotification(
  message: string,
  autoHide = true,
  hideAfter = 5000
): HTMLElement {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'markdownify-error-notification';
  notification.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    background-color: #ffebee;
    color: #c62828;
    border-left: 4px solid #c62828;
    padding: 12px 16px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 9999999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    max-width: 320px;
    word-wrap: break-word;
  `;

  // Add message
  notification.textContent = message;

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: #c62828;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  `;
  closeButton.onclick = () => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  };
  notification.appendChild(closeButton);

  // Add to document
  document.body.appendChild(notification);

  // Auto-hide if enabled
  if (autoHide) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, hideAfter);
  }

  return notification;
}

/**
 * Format error message for user display
 *
 * @param error Error object or message
 * @returns User-friendly error message
 */
export function formatUserErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Safely execute a function and catch any errors
 *
 * @param fn Function to execute
 * @param errorCategory Category to use for logging
 * @param errorMessage Message to use if an error occurs
 * @returns Result of the function or undefined if an error occurred
 */
export function safeExecute<T>(
  fn: () => T,
  errorCategory: ErrorCategory = ErrorCategory.UNKNOWN,
  errorMessage = 'An error occurred'
): T | undefined {
  try {
    return fn();
  } catch (error) {
    logError(errorCategory, errorMessage, error instanceof Error ? error : new Error(String(error)));
    return undefined;
  }
}
