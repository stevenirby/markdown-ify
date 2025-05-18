/**
 * Content Extraction Service
 * Handles DOM traversal and content extraction from web pages
 */

import { ErrorCategory, logError } from '../utils/errorHandler';
import { ExtractionResult, extractContent, extractFallbackContent, isEmptyResult } from './readabilityService';

// Content extraction types
export enum ContentType {
  ARTICLE = 'article',
  PRODUCT = 'product',
  DOCUMENTATION = 'documentation',
  GENERIC = 'generic',
}

// Extended extraction result with additional metadata
export interface EnhancedExtractionResult extends ExtractionResult {
  contentType: ContentType;
  url: string;
  domain: string;
  imageUrls: string[];
  extractionDate: string;
}

/**
 * Main content extraction service class
 * Handles extraction of content and metadata from web pages
 */
export class ContentExtractionService {
  private result: EnhancedExtractionResult | null = null;
  private fallbackAttempted = false;

  /**
   * Extract content from the current page
   *
   * @returns Enhanced extraction result
   */
  public extract(): EnhancedExtractionResult {
    // If we already have a result, return it
    if (this.result) {
      return this.result;
    }

    try {
      // Extract main content using Readability
      const extractionResult = extractContent();

      // If extraction failed or content is minimal, try fallback
      if (!extractionResult.success || isEmptyResult(extractionResult)) {
        // Only attempt fallback once
        if (!this.fallbackAttempted) {
          this.fallbackAttempted = true;
          return this.useFallbackExtraction();
        }
      }

      // Enhance the result with additional metadata
      this.result = this.enhanceResult(extractionResult);
      return this.result;
    } catch (error) {
      // Log error
      logError(
        ErrorCategory.CONTENT_EXTRACTION,
        'Failed to extract content from the page',
        error instanceof Error ? error : new Error(String(error))
      );

      // Use fallback
      return this.useFallbackExtraction();
    }
  }

  /**
   * Get the type of content being extracted
   *
   * @returns Content type based on page analysis
   */
  public getContentType(): ContentType {
    // Analyze page to determine content type
    const path = window.location.pathname.toLowerCase();

    // Check for documentation
    if (
      path.includes('/docs/') ||
      path.includes('/documentation/') ||
      path.includes('/manual/') ||
      path.includes('/guide/') ||
      path.includes('/reference/')
    ) {
      return ContentType.DOCUMENTATION;
    }

    // Check for product pages
    if (
      (path.includes('/product/') || path.includes('/item/') || path.includes('/p/')) ||
      (document.querySelector('[data-product-id]') !== null) ||
      (document.querySelector('[itemtype*="Product"]') !== null) ||
      (document.querySelector('meta[property="product:price:amount"]') !== null)
    ) {
      return ContentType.PRODUCT;
    }

    // Check for articles
    if (
      (path.includes('/article/') || path.includes('/blog/') || path.includes('/post/') || path.includes('/news/')) ||
      (document.querySelector('article') !== null) ||
      (document.querySelector('[itemtype*="Article"]') !== null) ||
      (document.querySelector('meta[property="article:published_time"]') !== null)
    ) {
      return ContentType.ARTICLE;
    }

    // Default to generic
    return ContentType.GENERIC;
  }

  /**
   * Extract image URLs from the page content
   *
   * @returns Array of image URLs
   */
  public extractImageUrls(): string[] {
    const imageUrls: string[] = [];

    try {
      // First, collect images from the main content if available
      if (this.result && this.result.content) {
        // Create a temporary element to parse the HTML
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = this.result.content;

        // Extract image URLs
        const images = tempContainer.querySelectorAll('img');
        images.forEach(img => {
          const src = img.getAttribute('src');
          if (src) {
            imageUrls.push(this.resolveRelativeUrl(src));
          }
        });
      }

      // If we have fewer than 3 images, look in the rest of the document
      if (imageUrls.length < 3) {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          // Filter out small images, icons, etc.
          if (img.width > 100 && img.height > 100) {
            const src = img.getAttribute('src');
            if (src && !imageUrls.includes(this.resolveRelativeUrl(src))) {
              imageUrls.push(this.resolveRelativeUrl(src));
            }
          }
        });
      }
    } catch (error) {
      logError(
        ErrorCategory.CONTENT_EXTRACTION,
        'Failed to extract image URLs',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return imageUrls;
  }

  /**
   * Use fallback extraction when Readability fails
   *
   * @returns Enhanced extraction result
   */
  private useFallbackExtraction(): EnhancedExtractionResult {
    try {
      // Use fallback extraction
      const fallbackResult = extractFallbackContent();

      // Enhance the result
      this.result = this.enhanceResult(fallbackResult);
      return this.result;
    } catch (error) {
      // Log error
      logError(
        ErrorCategory.CONTENT_EXTRACTION,
        'Failed to use fallback extraction',
        error instanceof Error ? error : new Error(String(error))
      );

      // Create minimal result
      const minimalResult: ExtractionResult = {
        title: document.title,
        content: '',
        textContent: '',
        length: 0,
        excerpt: '',
        byline: null,
        dir: null,
        siteName: null,
        lang: null,
        publishedTime: null,
        success: false,
        isReadabilityResult: false,
      };

      return this.enhanceResult(minimalResult);
    }
  }

  /**
   * Enhance the extraction result with additional metadata
   *
   * @param result Extraction result to enhance
   * @returns Enhanced extraction result
   */
  private enhanceResult(result: ExtractionResult): EnhancedExtractionResult {
    // Get content type
    const contentType = this.getContentType();

    // Extract image URLs
    const imageUrls = this.extractImageUrls();

    // Get current URL and domain
    const url = window.location.href;
    const domain = this.extractDomain();

    // Create enhanced result
    return {
      ...result,
      contentType,
      url,
      domain,
      imageUrls,
      extractionDate: new Date().toISOString(),
    };
  }

  /**
   * Extract domain from the current URL
   *
   * @returns Domain name
   */
  private extractDomain(): string {
    try {
      const hostname = window.location.hostname;
      // Remove www. prefix if present
      return hostname.replace(/^www\./i, '');
    } catch {
      return '';
    }
  }

  /**
   * Resolve a relative URL to an absolute URL
   *
   * @param url URL to resolve
   * @returns Absolute URL
   */
  private resolveRelativeUrl(url: string): string {
    try {
      // Check if URL is already absolute
      if (url.match(/^(https?:)?\/\//i)) {
        // Add protocol if missing
        if (url.startsWith('//')) {
          return `${window.location.protocol}${url}`;
        }
        return url;
      }

      // Handle data URLs
      if (url.startsWith('data:')) {
        return url;
      }

      // Create a base URL from the current page
      const base = `${window.location.protocol}//${window.location.host}`;

      // Handle absolute path
      if (url.startsWith('/')) {
        return `${base}${url}`;
      }

      // Handle relative path
      const path = window.location.pathname.split('/').slice(0, -1).join('/');
      return `${base}${path}/${url}`;
    } catch {
      // Return original URL if resolution fails
      return url;
    }
  }

  /**
   * Clean up the content extraction service
   */
  public cleanup(): void {
    // Reset the result and fallback flag
    this.result = null;
    this.fallbackAttempted = false;
  }
}

// Singleton instance for use throughout the application
let extractionService: ContentExtractionService | null = null;

/**
 * Get the content extraction service instance
 *
 * @returns Content extraction service instance
 */
export function getContentExtractionService(): ContentExtractionService {
  if (!extractionService) {
    extractionService = new ContentExtractionService();
  }
  return extractionService;
}

/**
 * Reset the content extraction service
 */
export function resetContentExtractionService(): void {
  if (extractionService) {
    extractionService.cleanup();
  }
  extractionService = null;
}