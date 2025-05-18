/**
 * Markdown-ify
 * Main entry point for the Markdown-ify bookmarklet
 * Built by AgentsCode.dev
 * Version: ${process.env.APP_VERSION}
 */

import { loadDependencies, removeLoader, showLoader, unloadDependencies } from './utils/dependencies';
import {
  ErrorCategory,
  logError,
  showErrorNotification,
  formatUserErrorMessage
} from './utils/errorHandler';
import { convertHtmlToMarkdown } from './services/markdownConversionService';
import { getContentExtractionService, resetContentExtractionService } from './services/contentExtractionService';
import { extractMetadata } from './services/metadataService';
import { getUIOverlayService, resetUIOverlayService } from './services/uiOverlayService';
import { initAnalytics, trackEvent } from './utils/analyticsTracker';

// Define global interface augmentation to add our properties to the Window object
declare global {
  interface Window {
    markdownify: MarkdownifyInterface;
    markdownifyActive: boolean;
    markdownifyVersion: string;
  }
}

// Interface defining public API
interface MarkdownifyInterface {
  init: () => void;
  destroy: () => void;
  isActive: () => boolean;
  version: string;
}

/**
 * Initialize the Markdown-ify bookmarklet
 * This is the main entry point that gets called when the bookmarklet is clicked
 */
export async function init(): Promise<void> {
  console.warn('🔄 Markdown-ify initialization starting...');

  // Check if already initialized to prevent multiple instances
  if (window.markdownifyActive) {
    console.warn('⚠️ Markdown-ify is already active on this page');
    return;
  }

  // Show loading indicator
  const loader = showLoader('Loading Markdown-ify...');

  try {
    // Mark as active
    window.markdownifyActive = true;

    // Load dependencies
    await loadDependencies();

    // Initialize analytics
    initAnalytics();

    // Track usage
    trackEvent('bookmarklet_activated', {
      url: window.location.href,
      domain: window.location.hostname,
      version: version
    });

    // Update loading message
    loader.textContent = 'Processing page content...';

    // Process the page using our services
    processPage()
      .then((markdown) => {
        // Remove loader
        removeLoader();

        // Track success
        trackEvent('conversion_success', {
          charCount: markdown.length,
          domain: window.location.hostname
        });

        console.warn('✅ Markdown-ify initialized successfully');
      })
      .catch((error) => {
        // Remove loader
        removeLoader();

        // Log and show error
        logError(
          ErrorCategory.CONTENT_EXTRACTION,
          'Failed to process page content',
          error instanceof Error ? error : new Error(String(error))
        );

        showErrorNotification(`Failed to convert page: ${formatUserErrorMessage(error)}`);

        // Track error
        trackEvent('conversion_error', {
          errorMessage: error instanceof Error ? error.message : String(error),
          domain: window.location.hostname
        });

        // Reset active state
        window.markdownifyActive = false;

        // Reset services
        resetServices();
      });
  } catch (error) {
    // Log error with appropriate category
    logError(
      ErrorCategory.INITIALIZATION,
      'Failed to initialize Markdown-ify',
      error instanceof Error ? error : new Error(String(error))
    );

    // Update loading indicator with error message
    if (loader && document.body.contains(loader)) {
      loader.textContent = `Error: ${formatUserErrorMessage(error)}`;
      loader.style.backgroundColor = '#ffebee';
      loader.style.color = '#c62828';

      // Auto-remove after 3 seconds
      setTimeout(() => removeLoader(), 3000);
    }

    // Show error notification
    showErrorNotification(`Failed to initialize: ${formatUserErrorMessage(error)}`);

    // Reset active state on error
    window.markdownifyActive = false;

    // Reset services
    resetServices();
  }
}

/**
 * Clean up and remove Markdown-ify from the page
 */
export function destroy(): void {
  if (!window.markdownifyActive) {
    return;
  }

  try {
    // Reset services
    resetServices();

    // Remove dependencies and clean up
    unloadDependencies();

    // Track destruction
    trackEvent('bookmarklet_destroyed');

    console.warn('🧹 Markdown-ify destroyed');
  } catch (error) {
    // Log error with appropriate category
    logError(
      ErrorCategory.UNKNOWN,
      'Error cleaning up Markdown-ify',
      error instanceof Error ? error : new Error(String(error))
    );

    // Show error notification
    showErrorNotification(`Cleanup failed: ${formatUserErrorMessage(error)}`);
  } finally {
    // Always reset active state
    window.markdownifyActive = false;
  }
}

/**
 * Check if Markdown-ify is currently active
 */
export function isActive(): boolean {
  return !!window.markdownifyActive;
}

// Define the public API
const version = process.env.APP_VERSION || '1.0.0';
const api: MarkdownifyInterface = {
  init,
  destroy,
  isActive,
  version,
};

// Self-executing function to set up the bookmarklet when loaded
(() => {
  try {
    // Add to the window object for external access
    window.markdownify = api;
    window.markdownifyVersion = version;

    // Auto-initialize when loaded as a bookmarklet
    // In development, this is controlled by the test button
    if (process.env.NODE_ENV === 'production') {
      init();
    } else {
      console.warn('🛠️ Markdown-ify loaded in development mode - use the test button to initialize');
    }
  } catch (error) {
    // Log error with appropriate category
    logError(
      ErrorCategory.INITIALIZATION,
      'Error setting up Markdown-ify',
      error instanceof Error ? error : new Error(String(error))
    );

    // Show error notification
    showErrorNotification(`Setup failed: ${formatUserErrorMessage(error)}`);
  }
})();

/**
 * Main function - Entry point for the bookmarklet
 */
function main(): void {
  // Prevent multiple instances
  if (window.markdownifyActive) {
    showErrorNotification('Markdown-ify is already running');
    return;
  }

  try {
    // Set running flag
    window.markdownifyActive = true;

    // Show loading indicator
    const loadingIndicator = showLoadingIndicator();

    // Initialize analytics
    initAnalytics();

    // Track usage
    trackEvent('bookmarklet_activated', {
      url: window.location.href,
      domain: window.location.hostname,
      version: version
    });

    // Process the page
    processPage()
      .then((markdown) => {
        // Hide loading indicator
        hideLoadingIndicator(loadingIndicator);

        // Track success
        trackEvent('conversion_success', {
          charCount: markdown.length,
          domain: window.location.hostname
        });

        // Reset running flag
        window.markdownifyActive = false;
      })
      .catch((error) => {
        // Hide loading indicator
        hideLoadingIndicator(loadingIndicator);

        // Log and show error
        logError(
          ErrorCategory.UNKNOWN,
          'Failed to process page',
          error instanceof Error ? error : new Error(String(error))
        );

        showErrorNotification('Failed to convert page to markdown. Please try again.');

        // Track error
        trackEvent('conversion_error', {
          errorMessage: error instanceof Error ? error.message : String(error),
          domain: window.location.hostname
        });

        // Reset running flag
        window.markdownifyActive = false;

        // Reset services
        resetServices();
      });
  } catch (error) {
    // Reset running flag
    window.markdownifyActive = false;

    // Log and show error
    logError(
      ErrorCategory.INITIALIZATION,
      'Failed to initialize bookmarklet',
      error instanceof Error ? error : new Error(String(error))
    );

    showErrorNotification('Failed to initialize Markdown-ify. Please try again.');

    // Track error
    trackEvent('initialization_error', {
      errorMessage: error instanceof Error ? error.message : String(error),
      domain: window.location.hostname
    });

    // Reset services
    resetServices();
  }
}

/**
 * Process the current page
 * Extracts content, converts to markdown, and displays the result
 *
 * @returns Promise resolving to the markdown content
 */
async function processPage(): Promise<string> {
  try {
    // Extract content from the page
    const contentExtractionService = getContentExtractionService();
    const extractionResult = contentExtractionService.extract();

    // Extract metadata
    const metadata = extractMetadata();

    // Convert HTML to markdown
    const markdown = convertHtmlToMarkdown(extractionResult.content);

    // Add title and metadata at the top
    const markdownWithMeta = formatMarkdownWithMetadata(markdown, extractionResult, metadata);

    // Show the result in the UI overlay
    const uiOverlayService = getUIOverlayService();
    uiOverlayService.showOverlay(markdownWithMeta, extractionResult);

    return markdownWithMeta;
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Failed to process page content',
      error instanceof Error ? error : new Error(String(error))
    );

    throw error;
  }
}

/**
 * Format markdown with metadata
 *
 * @param markdown Base markdown content
 * @param extractionResult Extraction result
 * @param metadata Page metadata
 * @returns Formatted markdown with metadata
 */
function formatMarkdownWithMetadata(
  markdown: string,
  extractionResult: { title: string; url: string; domain: string; extractionDate: string },
  metadata: { author: string | null; publishedDate: string | null }
): string {
  // Start with the title as a heading
  let result = `# ${extractionResult.title}\n\n`;

  // Add metadata
  result += '**Source:** ' + extractionResult.url + '\n';

  if (extractionResult.domain) {
    result += '**Website:** ' + extractionResult.domain + '\n';
  }

  if (metadata.author) {
    result += '**Author:** ' + metadata.author + '\n';
  }

  if (metadata.publishedDate) {
    try {
      // Format date if it's a valid date
      const date = new Date(metadata.publishedDate);
      if (!isNaN(date.getTime())) {
        result += '**Published:** ' + date.toDateString() + '\n';
      }
    } catch {
      // Use raw date if format fails
      result += '**Published:** ' + metadata.publishedDate + '\n';
    }
  }

  // Add extraction date
  result += '**Converted:** ' + new Date().toDateString() + '\n';

  // Add separator
  result += '\n---\n\n';

  // Add the main markdown content
  result += markdown;

  // Add a footer
  result += '\n\n---\n\n*Converted to Markdown by [Markdown-ify](https://agentscode.dev)*\n';

  return result;
}

/**
 * Show a loading indicator
 *
 * @returns The loading indicator element
 */
function showLoadingIndicator(): HTMLDivElement {
  const loader = document.createElement('div');
  loader.className = 'markdown-ify-loader';
  loader.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;

  // Add spinner
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: markdown-ify-spin 1s linear infinite;
  `;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes markdown-ify-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Add text
  const text = document.createElement('span');
  text.textContent = 'Converting to Markdown...';

  // Assemble loader
  loader.appendChild(spinner);
  loader.appendChild(text);
  document.body.appendChild(loader);

  return loader;
}

/**
 * Hide loading indicator
 *
 * @param loader Loading indicator element
 */
function hideLoadingIndicator(loader: HTMLDivElement): void {
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
}

/**
 * Reset all services
 */
function resetServices(): void {
  resetContentExtractionService();
  resetUIOverlayService();
}

// Execute main function
main();

// Export for testing and debugging
export { main, processPage, formatMarkdownWithMetadata };