/**
 * Readability Service
 * Integrates Mozilla's Readability library for content extraction
 */

import { Readability } from '@mozilla/readability';
import { ErrorCategory, logError } from '../utils/errorHandler';

// Define the interface for extraction results
export interface ExtractionResult {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string | null;
  dir: string | null;
  siteName: string | null;
  lang: string | null;
  publishedTime: string | null;
  success: boolean;
  isReadabilityResult: boolean;
}

/**
 * Create a default extraction result when extraction fails
 *
 * @param title Page title
 * @returns Default extraction result
 */
function createDefaultResult(title: string = document.title): ExtractionResult {
  return {
    title,
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
}

/**
 * Extract content from the current page using Readability
 *
 * @returns Extraction result with content and metadata
 */
export function extractContent(): ExtractionResult {
  try {
    // Clone the document to avoid modifying the original
    const documentClone = document.cloneNode(true) as Document;

    // Strip unnecessary elements that might interfere with extraction
    stripUnwantedElements(documentClone);

    // Create a new Readability object
    const reader = new Readability(documentClone, {
      // Optional configuration
      debug: false,
      maxElemsToParse: 0, // 0 = no limit
      nbTopCandidates: 5,
      charThreshold: 500,
    });

    // Parse the content
    const article = reader.parse();

    // If parsing failed, return default result
    if (!article) {
      logError(
        ErrorCategory.CONTENT_EXTRACTION,
        'Readability extraction returned null',
        new Error('Readability extraction failed')
      );
      return createDefaultResult();
    }

    // Extract publish date if available
    const publishedTime = extractPublishedDate(documentClone);

    // Get safe textContent and calculate length
    const textContent = article.textContent || '';
    const length = textContent.length;

    // Convert Readability result to our format
    return {
      title: article.title || '',
      content: article.content || '',
      textContent,
      length,
      excerpt: article.excerpt || '',
      byline: article.byline || null,
      dir: article.dir || null,
      siteName: article.siteName || null,
      lang: article.lang || null,
      publishedTime,
      success: true,
      isReadabilityResult: true,
    };
  } catch (error) {
    // Log the error
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Failed to extract content with Readability',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return default result
    return createDefaultResult();
  }
}

/**
 * Extract fallback content when Readability fails
 *
 * @returns Extraction result with basic content
 */
export function extractFallbackContent(): ExtractionResult {
  try {
    const title = document.title;
    const content = document.body.innerHTML;
    const textContent = document.body.textContent || '';

    // Create a simple excerpt (first 150 characters)
    const excerpt = textContent.substring(0, 150).trim() + '...';

    return {
      title,
      content,
      textContent,
      length: textContent.length,
      excerpt,
      byline: null,
      dir: document.dir || null,
      siteName: extractSiteName(),
      lang: document.documentElement.lang || null,
      publishedTime: extractPublishedDate(document),
      success: true,
      isReadabilityResult: false,
    };
  } catch (error) {
    // Log the error
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Failed to extract fallback content',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return an empty result
    return createDefaultResult();
  }
}

/**
 * Remove elements from the document that may interfere with content extraction
 *
 * @param doc Document to clean
 */
function stripUnwantedElements(doc: Document): void {
  // Elements to remove
  const unwantedSelectors = [
    'script',
    'style',
    'iframe',
    'nav',
    'noscript',
    'svg',
    'footer',
    '[role="complementary"]',
    '[role="banner"]',
    '[role="navigation"]',
  ];

  // Remove elements that match selectors
  unwantedSelectors.forEach(selector => {
    const elements = doc.querySelectorAll(selector);
    elements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  });
}

/**
 * Extract the site name from the document
 *
 * @returns Site name if found
 */
function extractSiteName(): string | null {
  // Try meta tags first
  const metaTags = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    'meta[property="twitter:site"]',
  ];

  for (const selector of metaTags) {
    const metaEl = document.querySelector(selector);
    if (metaEl && metaEl.getAttribute('content')) {
      return metaEl.getAttribute('content');
    }
  }

  // Try structured data
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      if (data.publisher && typeof data.publisher.name === 'string') {
        return data.publisher.name;
      }
    } catch {
      // Ignore JSON parsing errors
    }
  }

  // Try to extract from domain
  try {
    const hostname = window.location.hostname;
    // Remove www. prefix if present
    const domain = hostname.replace(/^www\./i, '');
    // Split by dots and take the first part
    return domain.split('.')[0];
  } catch {
    return null;
  }
}

/**
 * Extract published date from the document
 *
 * @param doc Document to extract from
 * @returns ISO date string if found
 */
function extractPublishedDate(doc: Document): string | null {
  // Meta tags that might contain the published date
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    'meta[property="og:published_time"]',
    'meta[itemprop="datePublished"]',
  ];

  // Try meta tags first
  for (const selector of dateSelectors) {
    const metaEl = doc.querySelector(selector);
    if (metaEl && metaEl.getAttribute('content')) {
      try {
        const date = new Date(metaEl.getAttribute('content') || '');
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // Ignore date parsing errors
      }
    }
  }

  // Try time elements
  const timeElements = doc.querySelectorAll('time[datetime]');
  for (const timeEl of timeElements) {
    try {
      const date = new Date(timeEl.getAttribute('datetime') || '');
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Ignore date parsing errors
    }
  }

  // Try structured data
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '{}');
      if (data.datePublished) {
        const date = new Date(data.datePublished);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    } catch {
      // Ignore JSON parsing errors
    }
  }

  return null;
}

/**
 * Check if the extraction result is empty or has minimal content
 *
 * @param result Extraction result to check
 * @returns True if the result has minimal/no useful content
 */
export function isEmptyResult(result: ExtractionResult): boolean {
  // Check if text content is too short (less than 100 characters)
  if (!result.textContent || result.textContent.length < 100) {
    return true;
  }

  // Check if title is missing
  if (!result.title || result.title.trim() === '') {
    return true;
  }

  return false;
}