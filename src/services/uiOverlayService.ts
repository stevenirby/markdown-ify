/**
 * UI Overlay Service
 * Provides functionality for displaying overlay UI elements for Markdown-ify
 */

import { ErrorCategory, logError, showErrorNotification } from '../utils/errorHandler';
import { EnhancedExtractionResult } from './contentExtractionService';
import { trackEvent } from '../utils/analyticsTracker';

// Styles for the overlay UI
const OVERLAY_STYLES = `
  .markdown-ify-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.75);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
  }

  .markdown-ify-container {
    width: 80%;
    max-width: 900px;
    max-height: 90%;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .markdown-ify-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .markdown-ify-title {
    font-size: 18px;
    font-weight: 600;
    color: #212529;
    margin: 0;
  }

  .markdown-ify-close {
    background: none;
    border: none;
    color: #495057;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .markdown-ify-close:hover {
    background-color: #e9ecef;
    color: #212529;
  }

  .markdown-ify-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .markdown-ify-markdown {
    flex: 1;
    white-space: pre-wrap;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 14px;
    line-height: 1.5;
    background-color: #f8f9fa;
    border-radius: 4px;
    padding: 16px;
    overflow: auto;
    color: #212529;
    border: 1px solid #e9ecef;
    max-height: 500px;
  }

  .markdown-ify-carousel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }

  .markdown-ify-carousel-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }

  .markdown-ify-images {
    display: flex;
    overflow-x: auto;
    gap: 16px;
    padding: 8px 0;
  }

  .markdown-ify-image-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 200px;
  }

  .markdown-ify-image {
    max-width: 200px;
    max-height: 150px;
    object-fit: contain;
    border: 1px solid #e9ecef;
    border-radius: 4px;
  }

  .markdown-ify-image-actions {
    display: flex;
    gap: 8px;
  }

  .markdown-ify-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background-color: #0366d6;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .markdown-ify-btn:hover {
    background-color: #0256bf;
  }

  .markdown-ify-btn.secondary {
    background-color: #f8f9fa;
    color: #495057;
    border: 1px solid #ced4da;
  }

  .markdown-ify-btn.secondary:hover {
    background-color: #e9ecef;
  }

  .markdown-ify-btn.small {
    padding: 4px 8px;
    font-size: 12px;
  }

  .markdown-ify-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background-color: #f8f9fa;
    border-top: 1px solid #e9ecef;
  }

  .markdown-ify-branding {
    font-size: 12px;
    color: #6c757d;
  }

  .markdown-ify-branding a {
    color: #0366d6;
    text-decoration: none;
  }

  .markdown-ify-branding a:hover {
    text-decoration: underline;
  }

  .markdown-ify-actions {
    display: flex;
    gap: 12px;
  }

  .markdown-ify-feedback {
    background: none;
    border: none;
    color: #0366d6;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  .markdown-ify-feedback:hover {
    color: #0256bf;
  }

  @media (max-width: 768px) {
    .markdown-ify-container {
      width: 95%;
    }

    .markdown-ify-header {
      padding: 12px 16px;
    }

    .markdown-ify-content {
      padding: 16px;
    }

    .markdown-ify-footer {
      padding: 12px 16px;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }

    .markdown-ify-actions {
      width: 100%;
    }

    .markdown-ify-btn {
      flex: 1;
    }
  }
`;

/**
 * OverlayOptions interface for configuring the overlay
 */
export interface OverlayOptions {
  title?: string;
  maxWidth?: string;
  showImageCarousel?: boolean;
  showFeedbackButton?: boolean;
  showBranding?: boolean;
}

/**
 * Class for managing the UI overlay
 */
export class UIOverlayService {
  private container: HTMLDivElement | null = null;
  private markdownElement: HTMLDivElement | null = null;
  private carouselContainer: HTMLDivElement | null = null;
  private stylesElement: HTMLStyleElement | null = null;
  private isVisible = false;
  private options: OverlayOptions = {
    title: 'Markdown-ify Result',
    maxWidth: '900px',
    showImageCarousel: true,
    showFeedbackButton: true,
    showBranding: true,
  };
  private lastActiveElement: Element | null = null;

  /**
   * Create a new UI overlay service
   *
   * @param options Options for configuring the overlay
   */
  constructor(options: Partial<OverlayOptions> = {}) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Initialize the overlay by adding styles to the document
   */
  private initialize(): void {
    // Add styles if not already added
    if (!this.stylesElement) {
      this.stylesElement = document.createElement('style');
      this.stylesElement.textContent = OVERLAY_STYLES;
      document.head.appendChild(this.stylesElement);
    }
  }

  /**
   * Trap focus within the overlay to improve accessibility
   */
  private trapFocus(): void {
    // Store the last active element to restore focus later
    this.lastActiveElement = document.activeElement;

    // Get all focusable elements in the overlay
    if (!this.container) return;

    const focusableElements = this.container.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    // Set up focus trapping
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus the first element
    setTimeout(() => {
      firstElement.focus();
    }, 50);

    // Set up focus trap event listener
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // On Tab key press
      if (e.shiftKey) {
        // If Shift+Tab and focus is on first element, move to last element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // If Tab and focus is on last element, move to first element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Add focus trap event listener
    document.addEventListener('keydown', handleFocusTrap);

    // Store the event listener in a property for later removal
    this._focusTrapListener = handleFocusTrap;
  }

  /**
   * Release focus trap and restore original focus
   */
  private releaseFocus(): void {
    // Remove focus trap listener
    if (this._focusTrapListener) {
      document.removeEventListener('keydown', this._focusTrapListener);
      this._focusTrapListener = null;
    }

    // Restore focus to the original element
    if (this.lastActiveElement && this.lastActiveElement instanceof HTMLElement) {
      setTimeout(() => {
        if (this.lastActiveElement instanceof HTMLElement) {
          this.lastActiveElement.focus();
        } else {
          // If we can't focus the original element, just focus the body
          document.body.focus();
        }
      }, 50);
    }
  }

  // Keep a reference to the focus trap listener for cleanup
  private _focusTrapListener: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Show the overlay with markdown content
   *
   * @param markdown Markdown content to display
   * @param extractionResult Optional extraction result for images
   */
  public showOverlay(markdown: string, extractionResult?: EnhancedExtractionResult): void {
    try {
      // Initialize styles
      this.initialize();

      // Create container if it doesn't exist
      if (!this.container) {
        this.container = this.createOverlayContainer();
        document.body.appendChild(this.container);
      }

      // Add markdown content
      this.markdownElement = this.container.querySelector('.markdown-ify-markdown');
      if (this.markdownElement) {
        this.markdownElement.textContent = markdown;
      }

      // Add images to carousel if available
      if (extractionResult && extractionResult.imageUrls && extractionResult.imageUrls.length > 0) {
        this.populateImageCarousel(extractionResult.imageUrls);
      } else if (this.carouselContainer) {
        this.carouselContainer.style.display = 'none';
      }

      // Show the overlay
      this.isVisible = true;

      // Set up focus trap for accessibility
      this.trapFocus();

      // Track view event
      trackEvent('overlay_viewed', {
        hasImages: Boolean(extractionResult && extractionResult.imageUrls.length > 0),
        markdownLength: markdown.length,
      });
    } catch (error) {
      logError(
        ErrorCategory.UI,
        'Failed to show overlay',
        error instanceof Error ? error : new Error(String(error))
      );

      // Show a simple error notification
      showErrorNotification('Failed to display the markdown overlay. Please try again.');
    }
  }

  /**
   * Create the main overlay container
   *
   * @returns The created overlay container
   */
  private createOverlayContainer(): HTMLDivElement {
    // Create main overlay elements
    const overlay = document.createElement('div');
    overlay.className = 'markdown-ify-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'markdown-ify-title');

    const container = document.createElement('div');
    container.className = 'markdown-ify-container';
    if (this.options.maxWidth) {
      container.style.maxWidth = this.options.maxWidth;
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'markdown-ify-header';

    const title = document.createElement('h2');
    title.className = 'markdown-ify-title';
    title.id = 'markdown-ify-title';
    title.textContent = this.options.title || 'Markdown-ify Result';

    const closeButton = document.createElement('button');
    closeButton.className = 'markdown-ify-close';
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close';
    closeButton.setAttribute('aria-label', 'Close overlay');
    closeButton.addEventListener('click', () => this.hideOverlay());

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create content
    const content = document.createElement('div');
    content.className = 'markdown-ify-content';

    const markdown = document.createElement('div');
    markdown.className = 'markdown-ify-markdown';
    markdown.setAttribute('tabindex', '0');
    markdown.setAttribute('aria-live', 'polite');

    content.appendChild(markdown);

    // Create image carousel if enabled
    if (this.options.showImageCarousel) {
      const carousel = document.createElement('div');
      carousel.className = 'markdown-ify-carousel';

      const carouselTitle = document.createElement('h3');
      carouselTitle.className = 'markdown-ify-carousel-title';
      carouselTitle.textContent = 'Images';

      const images = document.createElement('div');
      images.className = 'markdown-ify-images';

      carousel.appendChild(carouselTitle);
      carousel.appendChild(images);
      content.appendChild(carousel);

      this.carouselContainer = carousel;
    }

    // Create footer
    const footer = document.createElement('div');
    footer.className = 'markdown-ify-footer';

    // Add branding if enabled
    if (this.options.showBranding) {
      const branding = document.createElement('div');
      branding.className = 'markdown-ify-branding';
      branding.innerHTML = 'Built by <a href="https://agentscode.dev" target="_blank" rel="noopener noreferrer">AgentsCode.dev</a>';
      footer.appendChild(branding);
    }

    // Add actions
    const actions = document.createElement('div');
    actions.className = 'markdown-ify-actions';

    const copyButton = document.createElement('button');
    copyButton.className = 'markdown-ify-btn';
    copyButton.textContent = 'Copy Markdown';
    copyButton.addEventListener('click', () => this.copyToClipboard());

    actions.appendChild(copyButton);

    // Add feedback button if enabled
    if (this.options.showFeedbackButton) {
      const feedbackButton = document.createElement('button');
      feedbackButton.className = 'markdown-ify-btn secondary';
      feedbackButton.textContent = 'Feedback';
      feedbackButton.addEventListener('click', () => this.openFeedbackForm());
      actions.appendChild(feedbackButton);
    }

    footer.appendChild(actions);

    // Assemble the overlay
    container.appendChild(header);
    container.appendChild(content);
    container.appendChild(footer);
    overlay.appendChild(container);

    // Handle clicks outside the container to close
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.hideOverlay();
      }
    });

    // Handle escape key to close
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isVisible) {
        this.hideOverlay();
      }
    });

    return overlay;
  }

  /**
   * Populate the image carousel with images
   *
   * @param imageUrls Array of image URLs to display
   */
  private populateImageCarousel(imageUrls: string[]): void {
    if (!this.carouselContainer || !this.options.showImageCarousel) {
      return;
    }

    // Get images container
    const imagesContainer = this.carouselContainer.querySelector('.markdown-ify-images');
    if (!imagesContainer) return;

    // Clear existing images
    imagesContainer.innerHTML = '';

    // Show carousel
    this.carouselContainer.style.display = 'flex';

    // Add each image
    imageUrls.forEach((url, index) => {
      try {
        const imageItem = document.createElement('div');
        imageItem.className = 'markdown-ify-image-item';

        const img = document.createElement('img');
        img.className = 'markdown-ify-image';
        img.src = url;
        img.alt = `Image ${index + 1}`;
        img.loading = 'lazy';

        const actions = document.createElement('div');
        actions.className = 'markdown-ify-image-actions';

        const copyButton = document.createElement('button');
        copyButton.className = 'markdown-ify-btn small';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => this.copyImageMarkdown(url));

        const downloadButton = document.createElement('button');
        downloadButton.className = 'markdown-ify-btn small secondary';
        downloadButton.textContent = 'Download';
        downloadButton.addEventListener('click', () => this.downloadImage(url));

        actions.appendChild(copyButton);
        actions.appendChild(downloadButton);

        imageItem.appendChild(img);
        imageItem.appendChild(actions);
        imagesContainer.appendChild(imageItem);
      } catch (error) {
        console.error('Failed to add image to carousel:', error);
      }
    });
  }

  /**
   * Hide the overlay
   */
  public hideOverlay(): void {
    if (this.container && this.container.parentNode) {
      // Release focus trap before removing overlay
      this.releaseFocus();

      // Remove the overlay from the DOM
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.markdownElement = null;
      this.isVisible = false;

      // Track hide event
      trackEvent('overlay_closed');
    }
  }

  /**
   * Copy markdown to clipboard
   */
  private copyToClipboard(): void {
    if (this.markdownElement && this.markdownElement.textContent) {
      try {
        navigator.clipboard.writeText(this.markdownElement.textContent).then(
          () => {
            this.showCopySuccess();
            trackEvent('markdown_copied');
          },
          () => {
            // Handle error by using fallback
            if (this.markdownElement && this.markdownElement.textContent) {
              this.fallbackCopy(this.markdownElement.textContent);
            }
          }
        );
      } catch {
        // Use fallback on error
        if (this.markdownElement && this.markdownElement.textContent) {
          this.fallbackCopy(this.markdownElement.textContent);
        }
      }
    }
  }

  /**
   * Fallback copy method for browsers that don't support clipboard API
   *
   * @param text Text to copy
   */
  private fallbackCopy(text: string): void {
    try {
      // Create temporary element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      // Execute copy command
      const successful = document.execCommand('copy');
      if (successful) {
        this.showCopySuccess();
        trackEvent('markdown_copied_fallback');
      } else {
        showErrorNotification('Failed to copy to clipboard');
      }

      // Clean up
      document.body.removeChild(textArea);
    } catch (error) {
      showErrorNotification('Failed to copy to clipboard');
      logError(
        ErrorCategory.UI,
        'Failed to use fallback copy method',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Copy image markdown to clipboard
   *
   * @param imageUrl URL of the image to create markdown for
   */
  private copyImageMarkdown(imageUrl: string): void {
    const markdown = `![Image](${imageUrl})`;

    try {
      navigator.clipboard.writeText(markdown).then(
        () => {
          this.showCopySuccess('Image markdown copied!');
          trackEvent('image_markdown_copied');
        },
        () => {
          this.fallbackCopy(markdown);
        }
      );
    } catch {
      this.fallbackCopy(markdown);
    }
  }

  /**
   * Download an image
   *
   * @param imageUrl URL of the image to download
   */
  private downloadImage(imageUrl: string): void {
    try {
      // Create a temporary link
      const link = document.createElement('a');
      link.href = imageUrl;

      // Extract filename from URL or use default
      const urlParts = imageUrl.split('/');
      let filename = urlParts[urlParts.length - 1];

      // Clean up filename and ensure it has an extension
      if (!filename || filename.indexOf('.') === -1) {
        filename = 'image.jpg';
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      trackEvent('image_downloaded');
    } catch (error) {
      showErrorNotification('Failed to download the image');
      logError(
        ErrorCategory.UI,
        'Failed to download image',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Show success notification for copy operation
   *
   * @param message Message to display
   */
  private showCopySuccess(message = 'Copied to clipboard!'): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #43a047;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 2000);
  }

  /**
   * Open feedback form
   */
  private openFeedbackForm(): void {
    try {
      window.open('https://agentscode.dev/feedback?product=markdown-ify', '_blank');
      trackEvent('feedback_clicked');
    } catch (error) {
      showErrorNotification('Failed to open feedback form');
      logError(
        ErrorCategory.UI,
        'Failed to open feedback form',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Check if the overlay is currently visible
   *
   * @returns Whether the overlay is visible
   */
  public isOverlayVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Hide overlay if visible
    if (this.isVisible) {
      this.hideOverlay();
    }

    // Remove style element if added
    if (this.stylesElement && this.stylesElement.parentNode) {
      this.stylesElement.parentNode.removeChild(this.stylesElement);
      this.stylesElement = null;
    }

    // Release focus trap
    this.releaseFocus();

    // Reset properties
    this.container = null;
    this.markdownElement = null;
    this.carouselContainer = null;
    this.isVisible = false;
  }
}

// Singleton instance
let uiOverlayServiceInstance: UIOverlayService | null = null;

/**
 * Get the UI overlay service instance
 *
 * @param options Options for configuring the overlay
 * @returns UI overlay service instance
 */
export function getUIOverlayService(options?: Partial<OverlayOptions>): UIOverlayService {
  if (!uiOverlayServiceInstance) {
    uiOverlayServiceInstance = new UIOverlayService(options);
  } else if (options) {
    // Create new instance with new options
    uiOverlayServiceInstance.dispose();
    uiOverlayServiceInstance = new UIOverlayService(options);
  }

  return uiOverlayServiceInstance;
}

/**
 * Reset the UI overlay service
 */
export function resetUIOverlayService(): void {
  if (uiOverlayServiceInstance) {
    uiOverlayServiceInstance.dispose();
    uiOverlayServiceInstance = null;
  }
}