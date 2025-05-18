/**
 * Metadata Service
 * Extracts and preserves metadata from web pages
 */

import { ErrorCategory, logError } from '../utils/errorHandler';
import { EnhancedExtractionResult } from './contentExtractionService';

// Metadata structure
export interface PageMetadata {
  title: string;
  description: string;
  author: string | null;
  publishedDate: string | null;
  modifiedDate: string | null;
  siteName: string | null;
  siteIcon: string | null;
  canonicalUrl: string | null;
  language: string | null;
  keywords: string[];
  ogTags: Map<string, string>;
  twitterTags: Map<string, string>;
  structuredData: any[];
}

/**
 * Extract metadata from the current page
 *
 * @returns PageMetadata object with extracted metadata
 */
export function extractMetadata(): PageMetadata {
  try {
    // Initialize metadata object
    const metadata: PageMetadata = {
      title: document.title,
      description: '',
      author: null,
      publishedDate: null,
      modifiedDate: null,
      siteName: null,
      siteIcon: null,
      canonicalUrl: null,
      language: document.documentElement.lang || null,
      keywords: [],
      ogTags: new Map(),
      twitterTags: new Map(),
      structuredData: [],
    };

    // Extract description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metadata.description = metaDescription.getAttribute('content') || '';
    }

    // Extract canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      metadata.canonicalUrl = canonicalLink.getAttribute('href');
    }

    // Extract author
    const metaAuthor = document.querySelector('meta[name="author"]');
    if (metaAuthor) {
      metadata.author = metaAuthor.getAttribute('content');
    }

    // Extract site icon
    const iconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (iconLink) {
      metadata.siteIcon = resolveRelativeUrl(iconLink.getAttribute('href') || '');
    }

    // Extract keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      const keywordsContent = metaKeywords.getAttribute('content');
      if (keywordsContent) {
        metadata.keywords = keywordsContent.split(',').map(k => k.trim());
      }
    }

    // Extract Open Graph tags
    document.querySelectorAll('meta[property^="og:"]').forEach(tag => {
      const property = tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (property && content) {
        metadata.ogTags.set(property.substring(3), content);

        // Extract site name from OG tags if available
        if (property === 'og:site_name') {
          metadata.siteName = content;
        }
      }
    });

    // Extract Twitter tags
    document.querySelectorAll('meta[name^="twitter:"]').forEach(tag => {
      const name = tag.getAttribute('name');
      const content = tag.getAttribute('content');
      if (name && content) {
        metadata.twitterTags.set(name.substring(8), content);
      }
    });

    // Extract published date
    extractPublishedDate(metadata);

    // Extract modified date
    const metaModified = document.querySelector('meta[property="article:modified_time"]');
    if (metaModified) {
      metadata.modifiedDate = metaModified.getAttribute('content');
    }

    // Extract structured data
    extractStructuredData(metadata);

    return metadata;
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Failed to extract metadata',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return minimal metadata
    return {
      title: document.title,
      description: '',
      author: null,
      publishedDate: null,
      modifiedDate: null,
      siteName: null,
      siteIcon: null,
      canonicalUrl: null,
      language: document.documentElement.lang || null,
      keywords: [],
      ogTags: new Map(),
      twitterTags: new Map(),
      structuredData: [],
    };
  }
}

/**
 * Extract published date from various metadata sources
 *
 * @param metadata Metadata object to update
 */
function extractPublishedDate(metadata: PageMetadata): void {
  // Check meta tags
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    'meta[property="og:published_time"]',
    'meta[itemprop="datePublished"]',
  ];

  for (const selector of dateSelectors) {
    const metaEl = document.querySelector(selector);
    if (metaEl && metaEl.getAttribute('content')) {
      metadata.publishedDate = metaEl.getAttribute('content');
      break;
    }
  }

  // If not found in meta tags, try time elements
  if (!metadata.publishedDate) {
    const timeElements = document.querySelectorAll('time[datetime]');
    for (const timeEl of timeElements) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) {
        try {
          const date = new Date(datetime);
          if (!isNaN(date.getTime())) {
            metadata.publishedDate = datetime;
            break;
          }
        } catch {
          // Ignore date parsing errors
        }
      }
    }
  }
}

/**
 * Extract structured data from script tags
 *
 * @param metadata Metadata object to update
 */
function extractStructuredData(metadata: PageMetadata): void {
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');

  jsonLdScripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '{}');
      metadata.structuredData.push(data);

      // Extract author from structured data if not already set
      if (!metadata.author && data.author && data.author.name) {
        metadata.author = data.author.name;
      }

      // Extract published date if not already set
      if (!metadata.publishedDate && data.datePublished) {
        metadata.publishedDate = data.datePublished;
      }

      // Extract modified date if not already set
      if (!metadata.modifiedDate && data.dateModified) {
        metadata.modifiedDate = data.dateModified;
      }
    } catch {
      // Ignore JSON parsing errors
    }
  });
}

/**
 * Create a combined result with content and metadata
 *
 * @param content Content extraction result
 * @param metadata Page metadata
 * @returns Combined content and metadata
 */
export function createCombinedResult(
  content: EnhancedExtractionResult,
  metadata: PageMetadata
): CombinedResult {
  return {
    content,
    metadata,
    extractionDate: new Date().toISOString(),
  };
}

/**
 * Combined content and metadata result
 */
export interface CombinedResult {
  content: EnhancedExtractionResult;
  metadata: PageMetadata;
  extractionDate: string;
}

/**
 * Generate HTML with preserved metadata
 *
 * @param result Combined result
 * @returns HTML string with metadata
 */
export function generateHtmlWithMetadata(result: CombinedResult): string {
  try {
    const { content, metadata } = result;

    const html = `<!DOCTYPE html>
<html lang="${metadata.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.title)}</title>
  ${metadata.description ? `<meta name="description" content="${escapeHtml(metadata.description)}">` : ''}
  ${metadata.canonicalUrl ? `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}">` : ''}
  ${metadata.author ? `<meta name="author" content="${escapeHtml(metadata.author)}">` : ''}
  ${metadata.publishedDate ? `<meta name="date" content="${escapeHtml(metadata.publishedDate)}">` : ''}
  ${metadata.keywords.length > 0 ? `<meta name="keywords" content="${escapeHtml(metadata.keywords.join(', '))}">` : ''}
  ${metadata.siteIcon ? `<link rel="icon" href="${escapeHtml(metadata.siteIcon)}">` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    code {
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
    }
    pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 3px;
      overflow-x: auto;
    }
    blockquote {
      border-left: 4px solid #e0e0e0;
      margin-left: 0;
      padding-left: 15px;
      color: #555;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .metadata {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 20px;
      border-bottom: 1px solid #eee;
      padding-bottom: 15px;
    }
  </style>
</head>
<body>
  <article>
    <h1>${escapeHtml(content.title)}</h1>

    <div class="metadata">
      ${metadata.siteName ? `<div>Source: ${escapeHtml(metadata.siteName)}</div>` : ''}
      ${metadata.author ? `<div>Author: ${escapeHtml(metadata.author)}</div>` : ''}
      ${metadata.publishedDate ? `<div>Published: ${formatDate(metadata.publishedDate)}</div>` : ''}
      ${content.url ? `<div>Original URL: <a href="${escapeHtml(content.url)}" target="_blank">${escapeHtml(content.url)}</a></div>` : ''}
    </div>

    <div class="content">
      ${content.content}
    </div>
  </article>
</body>
</html>`;

    return html;
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Failed to generate HTML with metadata',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return minimal HTML
    return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(result.content.title)}</title>
</head>
<body>
  ${result.content.content}
</body>
</html>`;
  }
}

/**
 * Escape HTML special characters
 *
 * @param html HTML string to escape
 * @returns Escaped HTML string
 */
function escapeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format a date string
 *
 * @param dateString Date string to format
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Resolve a relative URL to an absolute URL
 *
 * @param url URL to resolve
 * @returns Absolute URL
 */
function resolveRelativeUrl(url: string): string {
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